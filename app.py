from flask import Flask, render_template, request, redirect, url_for, jsonify, flash
import pandas as pd
import haversine as hs
from database import db, Flight, init_db
from werkzeug.utils import secure_filename

# --- App Initialization ---
app = Flask(__name__)
app.secret_key = "sijiv12_@@$@T$ER#VC"  # Change this to a random string
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///flights.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
init_db(app)


# --- Data Loading ---
# Load airport data once into a pandas DataFrame for quick lookups
try:
    airport_df = pd.read_csv("airports.csv", index_col="iata_code")
except FileNotFoundError:
    print(
        "FATAL ERROR: airports.csv not found. Please download it and place it in the project root."
    )
    exit()


# --- Helper Functions ---
def get_coords(iata_code):
    """Looks up coordinates for an IATA code."""
    try:
        # Ensure index is treated as string
        if not isinstance(iata_code, str):
            iata_code = str(iata_code)

        airport = airport_df.loc[iata_code.upper()]
        return (airport["latitude_deg"], airport["longitude_deg"])
    except KeyError:
        return None


# --- View Routes ---
@app.route("/")
def index():
    """Renders the main map page."""
    return render_template("index.html")


# In app.py, replace the view_flights function


@app.route("/flights")
def view_flights():
    """Renders a paginated list of all flights."""
    # Get the requested page number from the URL query (e.g., /flights?page=2)
    page = request.args.get("page", 1, type=int)

    # Instead of .all(), we use .paginate() to get a specific page
    # The 'error_out=False' prevents errors if a user requests a page that doesn't exist
    pagination = Flight.query.order_by(Flight.date.desc()).paginate(
        page=page, per_page=20, error_out=False
    )

    # We now iterate over pagination.items instead of all_flights
    flights_with_flags = []
    for flight in pagination.items:
        try:
            origin_country = airport_df.loc[flight.origin]["iso_country"]
            dest_country = airport_df.loc[flight.destination]["iso_country"]
        except KeyError:
            origin_country, dest_country = None, None

        flights_with_flags.append(
            {
                "id": flight.id,
                "date": flight.date,
                "origin": flight.origin,
                "destination": flight.destination,
                "distance": flight.distance,
                "origin_flag": country_code_to_flag(origin_country),
                "destination_flag": country_code_to_flag(dest_country),
            }
        )

    # Pass the pagination object AND the processed list to the template
    return render_template(
        "flights.html", flights=flights_with_flags, pagination=pagination
    )


def country_code_to_flag(code):
    """Converts a two-letter country code to a flag emoji."""
    if not code or len(code) != 2:
        return ""
    # Formula to convert letters to regional indicator symbols
    offset = 127397
    return chr(ord(code[0].upper()) + offset) + chr(ord(code[1].upper()) + offset)


@app.route("/add", methods=["GET", "POST"])
def add_flight():
    """Handles the form for adding a new flight."""
    if request.method == "POST":
        origin = request.form["origin"].upper()
        destination = request.form["destination"].upper()
        date = request.form["date"]

        origin_coords = get_coords(origin)
        dest_coords = get_coords(destination)

        if origin_coords and dest_coords:
            distance_km = hs.haversine(
                origin_coords, dest_coords, unit=hs.Unit.KILOMETERS
            )
            new_flight = Flight(
                origin=origin, destination=destination, date=date, distance=distance_km
            )
            db.session.add(new_flight)
            db.session.commit()

        return redirect(url_for("index"))
    return render_template("add_flight.html")


@app.route("/edit/<int:flight_id>", methods=["GET", "POST"])
def edit_flight(flight_id):
    """Handles editing an existing flight."""
    flight_to_edit = Flight.query.get_or_404(flight_id)

    if request.method == "POST":
        flight_to_edit.origin = request.form["origin"].upper()
        flight_to_edit.destination = request.form["destination"].upper()
        flight_to_edit.date = request.form["date"]

        origin_coords = get_coords(flight_to_edit.origin)
        dest_coords = get_coords(flight_to_edit.destination)
        if origin_coords and dest_coords:
            flight_to_edit.distance = hs.haversine(
                origin_coords, dest_coords, unit=hs.Unit.KILOMETERS
            )

        db.session.commit()
        return redirect(url_for("view_flights"))

    return render_template("edit_flight.html", flight=flight_to_edit)

# Add this function to app.py


@app.route("/delete/<int:flight_id>", methods=["POST"])
def delete_flight(flight_id):
    """Deletes a flight from the database."""
    flight_to_delete = Flight.query.get_or_404(flight_id)
    db.session.delete(flight_to_delete)
    db.session.commit()
    return redirect(url_for("view_flights"))


@app.route("/api/data")
def get_flight_data():
    """API endpoint to provide all flight data to the frontend."""
    flights = Flight.query.all()

    empty_stats = {
        "distance_stats": {
            "total_km": 0,
            "total_miles": 0,
            "earth_circumnavigations": 0,
            "percent_to_moon": 0,
        },
        "time_stats": {
            "total_hours": 0,
            "total_days": 0,
            "total_weeks": 0,
            "total_months": 0,
        },
        "top_airports": [],
        "top_routes": [],
        "unique_years": [],
        "hero_stats": {
            "total_flights": 0,
            "total_countries": 0,
            "total_airports": 0,
            "total_routes": 0,
        },
    }

    if not flights:
        return jsonify({"routes": [], "stats": empty_stats})

    flight_data_for_df = [
        {
            "origin": f.origin,
            "destination": f.destination,
            "date": f.date,
            "distance": f.distance,
        }
        for f in flights
    ]
    df = pd.DataFrame(flight_data_for_df)

    # --- Hero Stat Calculations ---
    airport_visits = pd.concat([df["origin"], df["destination"]]).value_counts()
    unique_airports_visited = airport_visits.index.tolist()
    countries = {
        airport_df.loc[iata]["iso_country"]
        for iata in unique_airports_visited
        if iata in airport_df.index
    }
    df["canonical_route"] = df.apply(
        lambda row: "-".join(sorted((row["origin"], row["destination"]))), axis=1
    )
    hero_stats = {
        "total_flights": len(df),
        "total_countries": len(countries),
        "total_airports": len(unique_airports_visited),
        "total_routes": df["canonical_route"].nunique(),
    }

    # --- Top 10 Lists ---
    total_visits = airport_visits.sum()
    top_airports_df = airport_visits.head(10)
    top_airports = [
        {"iata": iata, "count": int(count), "percent": (count / total_visits) * 100}
        for iata, count in top_airports_df.items()
    ]
    top_routes_series = df["canonical_route"].value_counts().head(10)
    top_routes = [
        {"route": route, "count": int(count)}
        for route, count in top_routes_series.items()
    ]
    unique_years_np = pd.to_datetime(df["date"]).dt.year.unique()
    unique_years = sorted([int(year) for year in unique_years_np], reverse=True)

    # --- Route Aggregation for Map (Corrected Logic) ---
    route_counts = {}
    for flight in flights:
        key = tuple(sorted((flight.origin, flight.destination)))
        if key not in route_counts:
            # When we first see a route, get coords for both airports in the sorted key
            coords1 = get_coords(key[0])
            coords2 = get_coords(key[1])
            if coords1 and coords2:
                route_counts[key] = {
                    "count": 0,
                    "max_date": flight.date,
                    "airport1_iata": key[0],
                    "airport1_coords": coords1,
                    "airport2_iata": key[1],
                    "airport2_coords": coords2,
                }
        if key in route_counts:
            route_counts[key]["count"] += 1
            if flight.date > route_counts[key]["max_date"]:
                route_counts[key]["max_date"] = flight.date

    route_list = []
    for key, data in route_counts.items():
        if key in route_counts:  # Check if key was added (i.e., coords were found)
            count, weight = data["count"], 0.5 + ((data["count"]))
            route_list.append(
                {
                    "airport1": {
                        "iata": data["airport1_iata"],
                        "coords": data["airport1_coords"],
                    },
                    "airport2": {
                        "iata": data["airport2_iata"],
                        "coords": data["airport2_coords"],
                    },
                    "weight": weight,
                    "most_recent_year": data["max_date"].split("-")[0],
                }
            )

    # --- Final Stats Calculations ---
    total_km = float(df["distance"].sum())
    distance_stats = {
        "total_km": total_km,
        "total_miles": total_km / 1.60934,
        "earth_circumnavigations": total_km / 40075,
        "percent_to_moon": (total_km / 384400) * 100,
    }
    total_hours = total_km / 850
    total_days = total_hours / 24
    time_stats = {
        "total_hours": total_hours,
        "total_days": total_days,
        "total_weeks": total_days / 7,
        "total_months": total_days / 30.44,
    }

    stats = {
        "distance_stats": distance_stats,
        "time_stats": time_stats,
        "top_airports": top_airports,
        "top_routes": top_routes,
        "unique_years": unique_years,
        "hero_stats": hero_stats,
    }
    return jsonify({"routes": route_list, "stats": stats})


# --- Import Routes ---
@app.route("/import", methods=["GET", "POST"])
def import_flights():
    if request.method == "POST":
        if "file" not in request.files:
            flash("No file part")
            return redirect(request.url)
        file = request.files["file"]
        if file.filename == "":
            flash("No selected file")
            return redirect(request.url)
        if file and file.filename.endswith(".csv"):
            try:
                df = pd.read_csv(file.stream)
                new_flights = []
                for index, row in df.iterrows():
                    origin = row["origin"].upper()
                    destination = row["destination"].upper()
                    date = row["date"]

                    origin_coords = get_coords(origin)
                    dest_coords = get_coords(destination)

                    if origin_coords and dest_coords:
                        distance = hs.haversine(
                            origin_coords, dest_coords, unit=hs.Unit.KILOMETERS
                        )
                        new_flights.append(
                            Flight(
                                origin=origin,
                                destination=destination,
                                date=date,
                                distance=distance,
                            )
                        )

                db.session.add_all(new_flights)
                db.session.commit()
                flash(f"Successfully imported {len(new_flights)} flights!")
            except Exception as e:
                flash(f"An error occurred during import: {e}")

            return redirect(url_for("view_flights"))

    return render_template("import.html")
