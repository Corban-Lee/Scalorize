"""
Handle views for the application.
"""

import time
import json
import asyncio
import gevent
# from flask import Blueprint, render_template, request, send_file, Response, make_response, stream_with_context
from quart import Blueprint, render_template, request, send_file, Response, make_response

from webscraper import WebScraper

index_blueprint = Blueprint("index", __name__)

@index_blueprint.route("/")
async def index():
    return await render_template("index.html")

async def capture_generator(url: str, browser: str, resolutions: tuple[str], fullscreen: bool, save_to_disk: bool, semaphore_limit):
    """

    """

    scraper = WebScraper(browser, resolutions, fullscreen, save_to_disk, semaphore_limit)
    asyncio.ensure_future(scraper.stream_content_generator(url))

    while True:
        screenshot_data = scraper.get_next_screenshot()
        async for data in screenshot_data:
            if data.get("complete", False):
                print("screenshot gathering complete")
                break

            data = f"data:{json.dumps(data)}\n\n"
            yield data

    print("finished")

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
    response.timeout = None

    return response

# TODO: old? should be removed ?
@index_blueprint.route("/output/<path:filename>")
async def serve_file(filename):
    return send_file("../output/" + filename)