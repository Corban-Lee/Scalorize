"""Entry point for the application."""

from flask import Flask

from config import Config
from views import index_blueprint

app = Flask(__name__, template_folder="templates/", static_folder='static/')
app.config.from_object(Config)
app.register_blueprint(index_blueprint)

if __name__ == "__main__":
    app.run()
