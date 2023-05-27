"""Scraping processes for the application."""

import re
import time
from pathlib import Path
from urllib.parse import urljoin, urlparse, ParseResult
from typing import Generator
from collections import deque

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import WebDriverException


class Scraper:
    """
    Class for scraping websites.

    Methods
    -------
    stream_screenshots_generator(self, url)
        Streams a generator of screenshots from the given url.

    capture_recursive(self, url)
        Recursively captures all screenshots from the given url and it's child pages.

    create_screenshot_folder(self, relative_path, safe_characters)
        Creates a folder for a new screenshot and returns it as a Path object.

    capture(self, url)
        Captures a screenshot and saves it to disk.

    get_anchor_tags(self, url)
        Returns a list of `WebElements` representing all anchor tags found on the current web page.

    construct_absolute_url(base_url, relative_url)
        Creates and returns an absolute URL from the given base and relative URLs.
    """

    def __init__(self, resolutions: tuple[str] = ("1600x900", "1920x1080", "2560x1440")):
        driver_path = "drivers/chrome-win32.exe"
        options = Options()
        options.add_argument("--headless")
        self.driver = webdriver.Chrome(driver_path, options=options)

        self.resolutions = resolutions
        self.initial_url: ParseResult = None
        self.visited_urls = set()
        self.url_queue = deque()

    def stream_screenshots_generator(self, url: str) -> Generator[str, None, None]:
        """
        Streams a generator of screenshots from the given url.

        Parameters
        ----------
        url : str
            The initial URL to visit, all scraping will start from this URL.

        Returns
        -------
        screenshot_generator : generator
            A generator of relative screenshot filepaths from the given url.
        """

        self.initial_url = urlparse(url)
        self.url_queue.append(url)

        # A clean slate is required to avoid conflicts with previous streams
        self.visited_urls.clear()

        while self.url_queue:
            screenshots = self.process_url_queue()

            for screenshot in screenshots:
                yield f"data: {str(screenshot)}\n\n"

    def process_url_queue(self):
        """
        Recursively captures all screenshots from the given url and it's child pages.

        Yields
        ------
        screenshot_paths : list of Path objects
            A relative path of the most recently taken screenshot.
        """

        while self.url_queue:
            url = self.url_queue.popleft()

            if url in self.visited_urls:
                continue

            # load the current page
            self.driver.get(url)

            # check we are still on the same domain and not in a visited domain
            if urlparse(self.driver.current_url).netloc != self.initial_url.netloc or self.driver.current_url in self.visited_urls:
                continue

            self.visited_urls.add(url)

            start = time.time()

            # capture screenshot of the current page
            for capture in self.capture():
                yield capture

            print(f"Screenshots taken in {time.time() - start:.2f} seconds.")

            start = time.time()

            self.scrape_urls_to_queue(url)

            print(f"Urls scraped in {time.time() - start:.2f} seconds.")

    def scrape_urls_to_queue(self, url: str) -> None:
        """
        Scrapes for URLs on the current page and appends them to `self.url_queue`.

        Parameters
        ----------
        url : str
            The URL of the webpage to scrape.
        """

        def is_initial_domain(url: str) -> bool:
            return urlparse(url).netloc == self.initial_url.netloc

        def clean_url(url: str) -> str:
            return url.removesuffix("#").removesuffix("/")

        hrefs = [anchor_tag.get_attribute("href") for anchor_tag in self.get_anchor_tags()]

        for href in hrefs:
            if not href:
                continue

            absolute_url = self.construct_absolute_url(url, clean_url(href))
            if is_initial_domain(href) and absolute_url not in self.visited_urls:
                self.url_queue.append(absolute_url)

    def create_screenshot_folder(self, relative_path: Path, safe_characters: tuple[str]) -> Path:
        """
        Creates a folder for a new screenshot and returns it as a Path object.

        Parameters
        ----------
        relative_path : Path
            The screenshot folder will be created relative to this path.
        safe_characters: tuple of str
            A list of characters that are considered "safe" for the filesystem.

        Returns
        -------
        screenshot_path : Path
            The absolute path of the screenshot folder.
        """

        parsed_url = urlparse(self.driver.current_url)
        screenshot_safe_path = re.sub(r"[^a-zA-Z0-9%s]+" % re.escape(safe_characters), "", parsed_url.path).lstrip("/")

        screeshot_folder = Path(relative_path, parsed_url.netloc, screenshot_safe_path)
        screeshot_folder.mkdir(parents=True, exist_ok=True)

        return screeshot_folder

    def capture(self) -> str:
        """
        Captures a screenshot and saves it to disk.

        Returns
        -------
        screenshot_filepath : str
            The relative path of the absolute screenshot filepath.
        """

        try:
            # The output path contains all output files
            output_path = Path("output/")
            output_path.mkdir(exist_ok=True)

            safe_characters = " ._/-"
            screenshot_folder = self.create_screenshot_folder(output_path, safe_characters)

            for resolution in self.resolutions:
                width, height = map(int, resolution.split("x"))
                self.driver.set_window_size(width, height)

                filename = screenshot_folder / f"{resolution}.png"
                self.driver.save_screenshot(filename)
                yield filename

        except WebDriverException as error:
            print(f"Error capturing screenshots: {error}")

    def get_anchor_tags(self) -> list:
        """
        Returns a list of `WebElements` representing all anchor tags found on the current web page.

        Parameters
        ----------
        url : str
            The url of the webpage that anchor tags will be scraped from.

        Returns
        -------
        anchor_tags : list
            A list of `WebElements` representing anchor tags.
        """

        anchor_tags = self.driver.find_elements(By.TAG_NAME, "a")
        return anchor_tags

    @staticmethod
    def construct_absolute_url(base_url, relative_url):
        """
        Creates and returns an absolute URL from the given base and relative URLs.

        Parameters
        ----------
        base_url : str
            The base URL to be used in constructing an absolute URL.
        relative_url : str
            The relative URL to be used in constructing an absolute URL.

        Returns
        -------
        absolute_url : str
            The constructed absolute URL.
        """

        if relative_url.startswith(("http://", "https://")):
            return relative_url

        return urljoin(base_url, relative_url)
