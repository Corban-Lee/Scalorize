"""Entry point for the application."""

# from flask import Flask
from quart import Quart

# from config import FlaskConfig
from views import index_blueprint

# app = Flask(__name__, template_folder="templates/", static_folder='static/')
# app.config.from_object(FlaskConfig)

app = Quart(__name__, template_folder="templates/", static_folder="static/")
app.register_blueprint(index_blueprint)


if __name__ == "__main__":
    app.run(debug=True, use_reloader=False)
