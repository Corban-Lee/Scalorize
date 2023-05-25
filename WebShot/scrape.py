"""Scraping processes for the application."""

from pathlib import Path
from urllib.parse import urljoin, urlparse
from typing import Generator

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

    def __init__(self):
        driver_path = "drivers/chrome-win32.exe"
        options = Options()
        options.add_argument("--headless")
        options.add_argument("--window-size=1920,1080")
        self.driver = webdriver.Chrome(driver_path, options=options)

        self.visited_urls = set()

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

        # A clean slate is required to avoid conflicts with previous streams
        self.visited_urls.clear()

        def generate():
            screenshots = self.capture_recursive(url)

            for screenshot in screenshots:
                yield f"data: {screenshot}\n\n"

        return generate()

    def capture_recursive(self, url: str) -> str | Generator[str, None, None]:
        """
        Recursively captures all screenshots from the given url and it's child pages.

        Parameters
        ----------
        url : str
            The initial URL to visit, all scraping will start from this URL.

        Returns
        -------
        screenshots: list of str
            A list of relative screenshot filepaths from the given url.

        Yields
        ------
        screenshot_path : str
            A relative screenshot filepath from the given url.
        Iterator[str]
            A generator of relative screenshot filepaths from the given url.

        Raises
        ------
        WebDriverException
            An error occurred while capturing the screenshots.
        """

        screenshots = []

        if url in self.visited_urls:
            return screenshots

        self.visited_urls.add(url)
        domain = urlparse(url).netloc

        try:
            screenshot_path = self.capture(url)
            if screenshot_path is not None:
                screenshots.append(screenshot_path)
                yield screenshot_path

            hrefs = [anchor_tag.get_attribute("href") for anchor_tag in self.get_anchor_tags(url)]
            for href in hrefs:
                if not (href and urlparse(href).netloc == domain):
                    continue

                absolute_url = self.construct_absolute_url(url, href.removesuffix("#").removesuffix("/"))
                yield from self.capture_recursive(absolute_url)

        except WebDriverException as error:
            print(f"error capturing screenshots: {error}")

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

        screenshot_safe_path = "".join(c for c in parsed_url.path if c.isalnum() or c in safe_characters).rstrip()
        screenshot_safe_path = screenshot_safe_path.removeprefix("/")

        screenshot_folder = Path(relative_path / parsed_url.netloc / screenshot_safe_path)
        screenshot_folder.mkdir(parents=True, exist_ok=True)

        return screenshot_folder

    def capture(self, url: str) -> str:
        """
        Captures a screenshot and saves it to disk.

        Parameters
        ----------
        url : str
            The URL of the webpage to capture a screenshot of.

        Returns
        -------
        screenshot_filepath : str
            The relative path of the absolute screenshot filepath.
        """

        try:
            self.driver.get(url)

            # The output path contains all output files
            output_path = Path(Path.cwd() / "output/")
            output_path.mkdir(exist_ok=True)

            safe_characters = " ._/-".split("")
            screenshot_folder = self.create_screenshot_folder(output_path, safe_characters)
            filename = screenshot_folder / "1920x1080.png"

            self.driver.save_screenshot(filename)

            # prefer relative path over absolute path
            return str(filename).replace(str(output_path), "output/")

        except WebDriverException as error:
            print(f"Error capturing screenshots: {error}")

    def get_anchor_tags(self, url: str) -> list:
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

        self.driver.get(url)
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

        parsed_base_url = urlparse(base_url)
        parsed_relative_url = urlparse(relative_url)

        if parsed_relative_url.scheme:
            return relative_url
    
        return urljoin(parsed_base_url.geturl(), relative_url)
