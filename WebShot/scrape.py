"""Scraping processes for the application."""

import re
import time
import random
from pathlib import Path
from urllib.parse import urljoin, urlparse

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import WebDriverException

class Scraper:

    def __init__(self):
        driver_path = "drivers/chrome-win32.exe"
        options = Options()
        options.add_argument("--headless")
        options.add_argument("--window-size=1920,1080")
        self.driver = webdriver.Chrome(driver_path, options=options)

        self.visited_urls = set()

    def stream_screenshots_generator(self, url):
        self.visited_urls.clear()

        def generate():
            screenshots = self.capture_recursive(url)

            for screenshot in screenshots:
                yield f"data: {screenshot}\n\n"

        return generate()

    def capture_recursive(self, url):
        screenshots = []

        if url in self.visited_urls:
            print(f"already visited: {url}")
            return screenshots

        print(f"visiting: {url}")

        self.visited_urls.add(url)
        domain = urlparse(url).netloc

        try:
            screenshot_path = self.capture(url)
            if screenshot_path is not None:
                screenshots.append(screenshot_path)
                yield screenshot_path

            anchor_tags = self.get_anchor_tags(url)
            for anchor_tag in anchor_tags:
                href = anchor_tag.get_attribute("href")
                if href and urlparse(href).netloc == domain and not href.endswith("#"):
                    absolute_url = self.construct_absolute_url(url, href)
                    yield from self.capture_recursive(absolute_url)

        except WebDriverException as error:
            print(f"error capturing screenshots: {error}")

    def capture(self, url):
        try:
            self.driver.get(url)

            output_path = Path(Path.cwd() / "output/")
            output_path.mkdir(exist_ok=True)

            parsed_url = urlparse(self.driver.current_url)

            safe_characters = (' ','.','_', '/')
            screenshot_safe_path = "".join(c for c in parsed_url.path if c.isalnum() or c in safe_characters).rstrip()
            screenshot_safe_path = screenshot_safe_path.removeprefix("/")

            screenshot_folder = Path(output_path / parsed_url.netloc / screenshot_safe_path)
            screenshot_folder.mkdir(parents=True, exist_ok=True)

            filename = screenshot_folder / "1920x1080.png"

            self.driver.save_screenshot(filename)

            return str(filename).replace(str(output_path), "output/")

        except WebDriverException as error:
            print(f"Error capturing screenshots: {error}")

    def get_anchor_tags(self, url):

        try:
            self.driver.get(url)
            anchor_tags = self.driver.find_elements(By.TAG_NAME, "a")
            return anchor_tags

        finally:
            pass

    @staticmethod
    def construct_absolute_url(base_url, relative_url):
        parsed_base_url = urlparse(base_url)
        parsed_relative_url = urlparse(relative_url)

        if parsed_relative_url.scheme:
            return relative_url
    
        return urljoin(parsed_base_url.geturl(), relative_url)
