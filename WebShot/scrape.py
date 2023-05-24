"""Scraping processes for the application."""

import time
import random
from urllib.parse import urljoin

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import WebDriverException

class Scraper:

    def __init__(self):
        driver_path = "drivers/chrome-win32.exe"
        options = Options()
        options.add_argument("--headless")
        self.driver = webdriver.Chrome(driver_path, options=options)

    def stream_screenshots_generator(self, url):

        def generate():
            screenshots = self.capture_recursive(url)

            for screenshot in screenshots:
                yield f"data: {screenshot}\n\n"
                time.sleep(1)

        return generate()

    def capture_recursive(self, url, visited_hrefs=[]):
        screenshots = []
        print(visited_hrefs)
        

        try:
            screenshot_path = self.capture(url)
            screenshots.append(screenshot_path)
            yield screenshot_path

            anchor_tags = self.get_anchor_tags(url)
            for anchor_tag in anchor_tags:
                href = anchor_tag.get_attribute("href")
                if href and href not in visited_hrefs:
                    visited_hrefs.append(href)
                    absolute_url = self.construct_absolute_url(url, href)
                    yield from self.capture_recursive(absolute_url)

        except WebDriverException as error:
            print(f"error capturing screenshots: {error}")

    def capture(self, url):
        try:
            self.driver.get(url)
            screenshot_path = f"WebShot/static/images/{random.randint(0, 1000)}.png"
            self.driver.save_screenshot(screenshot_path)
            return screenshot_path

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
        return urljoin(base_url, relative_url)
