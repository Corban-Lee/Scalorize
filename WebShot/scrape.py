"""Scraping processes for the application."""

import re
import requests
from pathlib import Path
from typing import Generator
from multiprocessing import Queue as MPQueue
from urllib.parse import urljoin, urlparse, ParseResult

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

    def __init__(self, resolutions: tuple[str] = ("360x640",)):
        driver_path = "drivers/chrome-win32.exe"
        options = Options()
        options.add_argument("--headless")
        self.driver = lambda: webdriver.Chrome(driver_path, options=options)

        self.resolutions = resolutions
        self.initial_url: ParseResult = None
        self.visited_urls = set()
        self.url_queue = MPQueue()

    def get_driver(self, browser: str):
        """
        Creates and returns a driver for the given browser name.

        Parameters
        ----------
        browser : str
            The name of the browser to be used. Can be `chrome`, `firefox` or `edge`.

        Returns
        -------
        webdriver : selenium.webdriver.WebDriver
            A configued driver for the given browser.
        """

        match browser:

            case "chrome":
                options = webdriver.ChromeOptions
                driver = webdriver.Chrome
                driver_path = "drivers/chromedriver-win32.exe"

            case "firefox":
                options = webdriver.FirefoxOptions
                driver = webdriver.Firefox
                driver_path = "drivers/geckodriver-win64.exe"

            case "edge":
                options = webdriver.EdgeOptions
                driver = webdriver.Edge
                driver_path = "drivers/msedgedriver-win64"

            case _:
                raise ValueError(f"Invalid browser: {browser}")

        options = options()
        options.add_argument("--headless")

        return driver(executable_path=driver_path, options=options)


    def stream_screenshots_generator(self, url: str, browser = "chrome") -> Generator[str, None, None]:
        """
        Streams a generator of screenshots from the given url.

        Parameters
        ----------
        url : str
            The initial URL to visit, all scraping will start from this URL.
        browser : str, optional
            The name of the browser to be used. If not provided defaults to `chrome`.

        Yields
        -------
        data : str
            A serialized json dictionary containing the screenshot filepath as a string.
        """

        self.initial_url = urlparse(url)
        self.url_queue.put(url)
        driver = self.get_driver(browser)

        while not self.url_queue.empty():
            url = self.url_queue.get()

            for image_data, screenshot_filepath in self.process_url(driver, url):
                yield f'data: {{"screenshotPath": "{str(screenshot_filepath)}", "imageData": "{str(image_data)}"}}\n\n'.replace("\\", "/")

    @staticmethod
    def is_redirect(url):
        response = requests.head(url, allow_redirects=True)
        return response.is_redirect

    def process_url(self, driver, url: str):
        """
        Process a url through the scraper
        
        Parameters
        ----------
        url : str
            The URL to process.

        Returns
        -------
        NoneType
            The passed URL is not of the initial domain, is a visitied URL or is a redirect. 

        Yields
        ------
        capture_generator : Generator object
            Generates a screenshot of the passed URL at each resolution.
        """

        if urlparse(url).netloc != self.initial_url.netloc or url in self.visited_urls or self.is_redirect(url):
            return

        driver.get(url)
        self.visited_urls.add(url)

        # if driver.current_url != url: redirect slipped through

        # Capture screenshot of the current page at each resolution 
        for capture in self.capture(driver):
            yield capture

        # Scrape all URLs from the current page and add valid URLS to the queue
        self.scrape_urls_to_queue(driver, url)


    def scrape_urls_to_queue(self, driver, url: str) -> None:
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

        for href in self.generate_hrefs(driver):
            absolute_url = self.construct_absolute_url(url, clean_url(href))
            if is_initial_domain(href) and absolute_url not in self.visited_urls:
                self.url_queue.put(absolute_url)

    @staticmethod
    def generate_hrefs(driver):
        for anchor_tag in driver.find_elements(By.TAG_NAME, "a"):
            href = anchor_tag.get_attribute("href")
            if href:
                yield href

    def create_screenshot_folder(self, driver, relative_path: Path, safe_characters: tuple[str]) -> Path:
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

        parsed_url = urlparse(driver.current_url)
        screenshot_safe_path = re.sub(r"[^a-zA-Z0-9%s]+" % re.escape(safe_characters), "", parsed_url.path).lstrip("/")

        screeshot_folder = Path(relative_path, parsed_url.netloc, screenshot_safe_path)
        # screeshot_folder.mkdir(parents=True, exist_ok=True)

        return screeshot_folder

    def capture(self, driver) -> str:
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
            # output_path.mkdir(exist_ok=True)

            screenshot_folder = self.create_screenshot_folder(driver, output_path, " ._/-")

            for resolution in self.resolutions:

                # Get a full screen screenshot
                width, height = map(int, resolution.split("x"))
                driver.set_window_size(width, height)

                if False:  # TODO: This will be for the full screenshot setting
                    total_height = driver.execute_script('return document.body.parentNode.scrollHeight')
                    driver.set_window_size(width, total_height)

                filename = screenshot_folder / f"{width} {driver.capabilities['browserName']}.png"
                image_data = driver.get_screenshot_as_base64()
                yield (image_data, filename)

        except WebDriverException as error:
            print(f"Error capturing screenshots: {error}")

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
