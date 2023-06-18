"""
Web Scraper for the application.
"""

import time
import base64
import asyncio
from asyncio.queues import Queue
from urllib.parse import urlparse, urljoin
from playwright.async_api import async_playwright


class WebScraper:
    """
    Scrapes content from the web. Data can be retrieved from the `get_screenshot_data` AsyncGenerator method.
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

    async def stream_content_generator(self, url: str):
        """
        Streams scraped content back to the application front end.
        """

        try:

            await self.url_queue.put(url)
            self.initial_url = urlparse(url)
            self.initial_url_str = url

            async with async_playwright() as playwright:
                browser_options = {
                    "chrome": playwright.chromium,
                    "edge": playwright.chromium,
                    "firefox": playwright.firefox,
                    "safari": playwright.webkit
                }

                browser = await browser_options[self.browser_name].launch()
                self.browser = browser

                tasks = []
                semaphore = asyncio.Semaphore(self.semaphore_limit)

                while not self.url_queue.empty() or tasks:
                    print(f"queue size: {self.url_queue.qsize()} | tasks: {len(tasks)}")
                    # Limit the maximum number of concurrent tasks
                    if len(tasks) >= self.semaphore_limit:
                        await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
                        tasks = [task for task in tasks if not task.done()]
                    else:
                        url = await self.url_queue.get()
                        self.visited_urls.add(url)
                        tasks.append(asyncio.create_task(self.process_url(url, semaphore)))

                await asyncio.gather(*tasks)

        except Exception as error:
            print(f"ERROR: {error.with_traceback()}")

        print("completed tasks")
        self.screenshot_queue.put(None)
        self.complete = True

    async def process_url(self, url: str, semaphore: asyncio.Semaphore):
        """
        Process a URL.
        """

        async with semaphore:

            page = await self.browser.new_page(base_url=self.initial_url_str)
            await page.goto(url, timeout=30000, wait_until="domcontentloaded")
            await self.screenshot(page)
            hrefs = [
                await anchor.get_attribute("href")
                for anchor in await page.query_selector_all("a[href]")
            ]
            await page.close(run_before_unload=True)

        asyncio.ensure_future(self.queue_hrefs(hrefs))

    async def screenshot(self, page):
        """
        Take a screenshot of the page and add the image data to the screenshot queue.
        """

        for resolution in self.resolutions:
            width, height = map(int, resolution.split("x"))
            await page.set_viewport_size({"width": width, "height": height})

            image_data = await page.screenshot(full_page=self.fullscreen)
            encoded_data = base64.b64encode(image_data).decode("utf-8")
            encoded_data = encoded_data.replace("\n", "")

            title = await page.title()
            data = (encoded_data, title, page.url)

            await self.screenshot_queue.put(data)

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

    async def get_next_screenshot(self):
        """
        Generator function. Yields from the screenshot queue.
        """

        screenshot_data, page_title, page_url = await self.screenshot_queue.get()

        yield {
            "imageData": str(screenshot_data),
            "pageTitle": page_title,
            "pageUrl": page_url,
            "complete": self.complete
        }


if __name__ == "__main__":
    scraper = WebScraper("chrome", ("1920x1080", "1080x1920"), True, False)
    asyncio.get_event_loop().run_until_complete(scraper.stream_content_generator("https://www.microsoft.com"))
