"""
Web Scraper for the application.
"""

import time
import base64
import logging
import asyncio
from asyncio.queues import Queue
from pathlib import Path
from urllib.parse import urlparse, urljoin
from playwright.async_api import async_playwright, Page, Playwright, Browser


log = logging.getLogger(__name__)
logging.getLogger("asyncio").setLevel(logging.WARNING)


class WebScraper:
    """
    Scrapes content from the web. Data can be retrieved from the `fetch_completed` method.
    """

    def __init__(self, browser_name: str, resolutions:tuple[str], fullscreen: bool, save_to_disk: bool, semaphore_limit: int):
        self.resolutions = resolutions
        self.fullscreen = fullscreen
        self.save_to_disk = save_to_disk
        self.browser_name = browser_name
        self.semaphore_limit = semaphore_limit

        self.complete = False
        self.initial_url = None
        self.visited_urls = set()
        self.url_queue = Queue()
        self.screenshot_queue = Queue()

    async def get_next_url(self) -> str:
        """
        Returns the next URL from the url_queue.
        If empty, waits until the next URL is available.

        Returns
        -------
        url : str
            The next available URL
        """

        try:
            return await asyncio.wait_for(self.url_queue.get(), timeout=5)
        except TimeoutError:
            return None

    async def get_browser(self, playwright: Playwright, browser_name: str) -> Browser:
        """
        Returns the requested browser for playwright.

        Arguments
        ----------
        playwright : Playwright
            An instance of Playwright, required to retrieve the browsers.
        browser_name : str
            The name of the browser to retrieve, can be `chrome`, `firefox` or `safari`.
        """

        return {
            "chrome": playwright.chromium,
            "firefox": playwright.firefox,
            "safari": playwright.webkit
        }[browser_name]



    async def start(self, url: str):
        """
        Starts scraping content from the given URL.
        Content can be retrieved from the `fetch_completed` method.

        Parameters
        ----------
        url : str
            The base URL of the scraping process.
        """

        log.info("Starting Scraper From URL: %s" % url)

        await self.url_queue.put(url)
        self.initial_url = urlparse(url)
        self.initial_url_str = url

        async with async_playwright() as playwright:
            browser = await self.get_browser(playwright, self.browser_name)
            self.browser = await browser.launch()
            tasks = await self.run_until_complete()
            await asyncio.gather(*tasks)

        log.info("Scraping Complete")

        # When finished, set a flag and add None to the result queue.
        # This ensures that the `fetch_completed` method doesn't hang.
        self.complete = True
        await self.screenshot_queue.put((None, None, None, None))

    async def run_until_complete(self):
        """
        """

        tasks = []
        semaphore = asyncio.Semaphore(self.semaphore_limit)

        while not self.complete:
            log.debug("Queue size: %s | Tasks: %s" % (self.url_queue.qsize(), len(tasks)))

            tasks = [task for task in tasks if not task.done()]

            # Wait until there is room for another task
            if len(tasks) >= self.semaphore_limit:
                wait_time = time.time()
                log.debug("Concurrent limit reached, waiting for task to complete")
                await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
                log.debug("Task completed after %s seconds, slot is now available" % round(time.time() - wait_time, 2))

            # Queue up another task
            elif tasks or not self.url_queue.empty():
                log.debug("Waiting for URL")
                url = await asyncio.wait_for(self.get_next_url(), timeout=7)
                if not url:
                    continue
        
                log.debug("Valid URL '%s' found, adding new task" % url)

                self.visited_urls.add(url)
                tasks.append(asyncio.create_task(self.process_url(url, semaphore)))

            else:
                break

    async def process_url(self, url: str, semaphore: asyncio.Semaphore):
        """
        Process a URL.
        """

        async with semaphore:

            process_url_time = time.time()
            log.debug("Processing URL '%s'" % url)

            page = await self.browser.new_page(base_url=self.initial_url_str)
            await page.goto(url, timeout=30000, wait_until="domcontentloaded")
            await self.screenshot(page)
            hrefs = [
                await anchor.get_attribute("href")
                for anchor in await page.query_selector_all("a[href]")
            ]
            await page.close(run_before_unload=True)

            log.debug("Finished processing URL '%s' after %s seconds" % (url, round(time.time() - process_url_time, 2)))

        asyncio.ensure_future(self.queue_hrefs(hrefs))

    async def screenshot(self, page: Page):
        """
        Take a screenshot of the page and add the image data to the screenshot queue.
        """

        for resolution in self.resolutions:
            width, height = map(int, resolution.split("x"))
            await page.set_viewport_size({"width": width, "height": height})

            if self.save_to_disk:
                filepath = await self.make_filepath(page.url, resolution)
                await page.screenshot(full_page=self.fullscreen, path=filepath)
                encoded_data = None

            else:
                image_data = await page.screenshot(full_page=self.fullscreen)
                encoded_data = base64.b64encode(image_data).decode("utf-8")
                encoded_data = encoded_data.replace("\n", "")
                filepath = None

            title = await page.title()
            data = (encoded_data, filepath, title, page.url)

            await self.screenshot_queue.put(data)

    async def make_filepath(self, url: str, resolution:str) -> str:
        """
        Creates a filepath for a new image from the given url.
        """

        parsed_url = url.split("://")[1]
        url_parts = parsed_url.split("/")

        output_path = "output/"

        for part in url_parts:
            output_path += part + "/"

        Path(output_path).mkdir(parents=True, exist_ok=True)
        return output_path + resolution + ".png"

    async def queue_hrefs(self, hrefs: list[str]):
        """
        Queue up the href content found on the given page.
        """

        for href in hrefs:
            processed_href = self.process_href(href) if href else None
            if not processed_href:
                continue

            if processed_href not in self.visited_urls and self.initial_url.netloc == urlparse(processed_href).netloc:
                self.visited_urls.add(processed_href)
                await self.url_queue.put(processed_href)

    def process_href(self, href: str) -> str | None:
        """
        Process a given href. Returns an absolute address or None if href is invalid.
        """

        # remove these so we don't get duplicate pages
        href = href.removesuffix("#").removesuffix("/")

        # href is already absolute, return it
        if href.startswith(("https://", "http://")):
            return href

        # href is invalid 'javascript:', 'tel:', etc.
        elif href.startswith("#") or ":" in href:
            return

        # href is relative, join it with base url and return
        else:
            return urljoin(self.initial_url_str, href)

    async def fetch_completed(self):
        """
        Returns completed items from the screenshot queue.
        """

        data = await self.screenshot_queue.get()
        if not data:
            return {"complete": self.complete}

        screenshot_data, filepath, page_title, page_url = data

        return {
            "imageData": str(screenshot_data),
            "filepath": filepath,
            "pageTitle": page_title,
            "pageUrl": page_url,
            "complete": self.complete
        }


if __name__ == "__main__":
    scraper = WebScraper("chrome", ("1920x1080", "1080x1920"), True, False)
    asyncio.get_event_loop().run_until_complete(scraper.start("https://www.microsoft.com"))
