"""
Entry point for the application.
"""

from quart import Quart
from views import index_blueprint

app = Quart(__name__, template_folder="templates/", static_folder="static/")
app.register_blueprint(index_blueprint)

if __name__ == "__main__":
    app.run(debug=True, use_reloader=False)
