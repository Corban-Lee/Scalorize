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

    def __init__(self, browser_name: str, resolutions:tuple[str], fullscreen: bool, save_to_disk: bool, semaphores: int):
        self.resolutions = resolutions
        self.fullscreen = fullscreen
        self.save_to_disk = save_to_disk
        self.browser_name = browser_name
        self.semaphores = semaphores

        self.complete = False
        self.initial_url = None
        self.visited_urls = set()
        self.url_queue = Queue()
        self.screenshot_queue = Queue()

    async def stream_content_generator(self, url: str):
        """
        Streams scraped content back to the application front end.
        """

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
            semaphore = asyncio.Semaphore(self.semaphores)

            while not self.url_queue.empty() or tasks:

                async with semaphore:
                    current_url = await self.url_queue.get()
                    self.process_url(current_url)

                tasks.append(asyncio.create_task(self.process_url(current_url)))
                tasks = [task for task in tasks if not task.done()]

            await asyncio.gather(*tasks)

        self.screenshot_queue.put(None)
        self.complete = True

    async def process_url(self, url: str):
        """
        Process a URL.
        """

        self.visited_urls.add(url)

        print("Processing URL " + url)
        page = await self.browser.new_page(base_url=self.initial_url_str)
        await page.goto(url, timeout=0, wait_until="commit")
        await self.screenshot(page)
        await self.queue_hrefs(page)
        await page.close()

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

            await self.screenshot_queue.put(encoded_data)

    async def queue_hrefs(self, page):
        """
        Queue up the href content found on the given page.
        """

        for anchor in await page.query_selector_all("a"):
            href = await anchor.get_attribute("href")
            if not href:
                continue

            processed_href = self.process_href(href)
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

        screenshot_data = await self.screenshot_queue.get()
        yield {
            "imageData": str(screenshot_data),
            "complete": self.complete
        }


if __name__ == "__main__":
    scraper = WebScraper("chrome", ("1920x1080", "1080x1920"), True, False)
    asyncio.get_event_loop().run_until_complete(scraper.stream_content_generator("https://www.microsoft.com"))
