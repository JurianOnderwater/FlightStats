# app.py
from flask import Flask, render_template

app = Flask(__name__)


# These routes just serve the static HTML pages.
# All data logic is now in the browser's JavaScript.
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/flights")
def view_flights():
    return render_template("flights.html")


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


# NOTE: The database.py file is no longer used by the application.
