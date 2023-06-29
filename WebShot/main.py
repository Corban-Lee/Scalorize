"""
Entry point for the application.
"""

import sass
from quart import Quart
from views import index_blueprint
from logs import setup_logging

app = Quart(__name__, template_folder="templates/", static_folder="static/")
app.register_blueprint(index_blueprint)

def main():

    setup_logging()

    # Compile (and minify) SASS files
    css_directory = "WebShot/static/css/"
    scss_directory = "WebShot/static/scss/"
    sass.compile(dirname=(scss_directory, css_directory), output_style="expanded")  # set output_style to "compressed" for production

    app.run(debug=True, use_reloader=False)

if __name__ == "__main__":
    main()
