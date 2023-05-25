"""Entry point for the application."""

from flask import Flask

from config import FlaskConfig
from views import index_blueprint

app = Flask(__name__, template_folder="templates/", static_folder='static/')
app.config.from_object(FlaskConfig)
app.register_blueprint(index_blueprint)

if __name__ == "__main__":
    app.run(threaded=True)
