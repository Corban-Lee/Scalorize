"""Handle views for the application."""

from flask import Blueprint, render_template, request, Response
from scrape import Scraper

scraper = Scraper()
index_blueprint = Blueprint("index", __name__)

@index_blueprint.route("/")
def index():
    return render_template("index.html")

@index_blueprint.post("/")
def index_post():
    url = request.get_json()["url"]
    return Response(scraper.stream_screenshots_generator(url), mimetype="text/event-stream")
