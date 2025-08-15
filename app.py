# app.py
from flask import Flask, render_template, Response
import requests

app = Flask(__name__)


# These routes just serve the static HTML pages.
# All data logic is now in the browser's JavaScript.
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/flights")
def view_flights():
    return render_template("flights.html")


@app.route("/stats")
def stats_page():
    return render_template("stats.html")


@app.route("/add")
def add_flight():
    return render_template("add_flight.html")


@app.route("/edit/<int:flight_id>")
def edit_flight(flight_id):
    # Pass the ID so JS can fetch the right flight from IndexedDB
    return render_template("edit_flight.html", flight_id=flight_id)


@app.route("/import")
def import_flights():
    return render_template("import.html")


@app.route("/tile_proxy/<s>/<style>/<int:z>/<int:x>/<int:y>.png")
def tile_proxy(s, style, z, x, y):
    """A proxy to fetch map tiles from CartoDB."""
    # The URL for CartoDB's Positron (light_all) or Dark Matter (dark_all) maps
    tile_url = f"https://{s}.basemaps.cartocdn.com/{style}/{z}/{x}/{y}.png"

    try:
        headers = {"User-Agent": "FlightStatsApp/1.0"}
        r = requests.get(tile_url, timeout=10, headers=headers)
        r.raise_for_status()
        return Response(r.content, mimetype=r.headers["Content-Type"])

    except requests.exceptions.RequestException as e:
        print(f"Could not proxy tile: {e}")
        return "Tile proxy error", 502
