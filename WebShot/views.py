"""
Handle views for the application.
"""

import json
import asyncio
from typing import Generator, Any
from quart import (
    Blueprint,
    render_template,
    request,
    send_file,
    Response,
    make_response
)

from webscraper import WebScraper

index_blueprint = Blueprint("index", __name__)

@index_blueprint.route("/")
async def index() -> str:
    """
    Returns a render of the index page.
    """

    return await render_template("index.html")

async def capture_generator(
        url: str,
        browser: str,
        resolutions: tuple[str],
        fullscreen: bool,
        save_to_disk: bool,
        semaphore_limit: int
    ) -> Generator[str, Any, None]:
    """
    An iterative generator that yields data string for the client.
    Takes some arguments for the web scraper.

    Parameters
    ----------
    url : str
        The base URL of the web scraper. All scraping will branch out from this URL.

    browser : str
        The browser to be used, options are 'chrome', 'firefox' or 'safari'.

    resolutions : tuple of str
        An iterable of string resolutions, example: '1920x1080', '1080x1920', etc.       

    fullscreen : bool
        Whether to capture the entire web page in each screenshot.

    save_to_disk : bool
        Wether to write the captured screenshots to disk. High memory usage if False.

    semaphore_limit : int
        The maximum number of concurrent tasks to execute in parallel. High memory usage if number is high.

    Yields
    ------
    str
        The data as a json string. Should be returned to the client side.
    """

    # Initialize the web scraper and start scraping.
    scraper = WebScraper(browser, resolutions, fullscreen, save_to_disk, semaphore_limit)
    asyncio.ensure_future(scraper.start(url))

    # Keep listening for new data.
    while True:
        screenshot_data = scraper.fetch_completed()
        async for data in screenshot_data:
            if data.get("complete", False):
                break

            data = f"data:{json.dumps(data)}\n\n"
            yield data

@index_blueprint.route("/stream-screenshots")
async def stream_screenshots():
    """
    Event stream for sending image data to the client.
    """

    # Request Data
    url = request.args.get("url")
    browser = request.args.get("browser")
    resolutions = request.args.getlist("resolution")
    fullscreen = request.args.get("fullscreen") == "true"
    save_to_disk = request.args.get("saveToDisk") == "true"
    semaphore_limit = request.args.get("semaphoreLimit", default=8, type=int)

    # Screenshot Generator
    capture_gen =  capture_generator(url, browser, resolutions, fullscreen, save_to_disk, semaphore_limit)

    # Response
    response = await make_response(Response(capture_gen, mimetype="text/event-stream"))
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    response.timeout = None  # important

    return response

# TODO: old? should be removed ?
@index_blueprint.route("/output/<path:filename>")
async def serve_file(filename):
    return send_file("../output/" + filename)
