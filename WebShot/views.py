"""Handle views for the application."""

from urllib.parse import unquote

from flask import Blueprint, render_template, request, Response, send_file, make_response
from scrape import Scraper

scraper = Scraper()
index_blueprint = Blueprint("index", __name__)

@index_blueprint.route("/")
def index():
    return render_template("index.html")

@index_blueprint.route("/stream-screenshots")
def stream_screenshots():
    url = request.args.get("url")
    print("streaming from url: " + url)
    response = make_response(Response(scraper.stream_screenshots_generator(url), mimetype="text/event-stream"))
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'

    return response

@index_blueprint.route("/output/<path:filename>")
def serve_file(filename):
    return send_file("../output/" + filename)