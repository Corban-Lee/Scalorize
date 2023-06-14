"""
Web Scraper for the application.
"""

import time
import base64
import asyncio
from asyncio.queues import Queue
from urllib.parse import urlparse, urljoin
from playwright.async_api import async_playwright

async def capture_screenshot(url: str, output_path: str):
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch()
        page = await browser.new_page()

        await page.goto(url)
        await page.set_viewport_size({"width": 360, "height": 640})
        await page.screenshot(path=output_path, full_page=True)
        await browser.close()

# if __name__ == "__main__":
#     url = "https://derventioeducation.com"
#     output_path = os.getcwd() + "\output\image.png"
#     asyncio.get_event_loop().run_until_complete(capture_screenshot(url, output_path))


class WebScraper:
    """"""

    def __init__(self, browser_name: str, resolutions:tuple[str], fullscreen: bool, save_to_disk: bool):
        self.resolutions = resolutions
        self.fullscreen = fullscreen
        self.save_to_disk = save_to_disk
        self.browser_name = browser_name

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
            semaphore = asyncio.Semaphore(10)

            while not self.url_queue.empty() or tasks:
                current_url = await self.url_queue.get()
                self.visited_urls.add(current_url)
                tasks.append(asyncio.create_task(self.process_url(current_url, semaphore)))
                tasks = [task for task in tasks if not task.done()]

            await asyncio.gather(*tasks)

        self.screenshot_queue.put(None)
        self.complete = True

    async def process_url(self, url: str, semaphore: asyncio.Semaphore):
        """
        Process a URL
        """

        print("processing " + url)

        async with semaphore:
            current_time = time.time()
            page = await self.browser.new_page()
            await page.goto(url)
            print("visited " + url)
            image_data = await page.screenshot(full_page=self.fullscreen)
            print("screenshot taken for " + url)
            encoded_data = base64.b64encode(image_data).decode("utf-8")
            encoded_data = encoded_data.replace("\n", "")
            print("screenshot encoded for " + url)
            await self.screenshot_queue.put(encoded_data)
            print("screenshot added to queue for " + url)
            await self.queue_hrefs(page)
            print("queued hrefs for " + url)
            await page.close()
            print(f"finished processing {round(time.time() - current_time, 2)} " + url)

    async def queue_hrefs(self, page):
        """
        Queue up the href content found on the given page.
        """

        def clean_url(url: str) -> str:
            return url.removesuffix("#").removesuffix("/")

        def is_initial_domain(url: str) -> bool:
            return self.initial_url.netloc == urlparse(url).netloc

        for anchor in await page.query_selector_all("a"):
            href = await anchor.get_attribute("href")
            if not href:
                continue

            absolute_url = self.create_absolute_url(self.initial_url_str, clean_url(href))
            if absolute_url not in self.visited_urls and is_initial_domain(absolute_url):
                self.visited_urls.add(absolute_url)
                await self.url_queue.put(absolute_url)

    def create_absolute_url(self, base_url: str, relative_url: str) -> str:
        """
        Returns an absolute URL from a given base and relative URL.
        """

        if relative_url.startswith(("http://", "https://")):
            return relative_url

        return urljoin(base_url, relative_url)

    async def get_next_screenshot(self):
        screenshot_data = await self.screenshot_queue.get()
        yield {
            "imageData": str(screenshot_data),
            "complete": self.complete
        }


if __name__ == "__main__":
    scraper = WebScraper("chrome", ("1920x1080", "1080x1920"), True, False)
    asyncio.get_event_loop().run_until_complete(scraper.stream_content_generator("https://derventioeducation.com"))
