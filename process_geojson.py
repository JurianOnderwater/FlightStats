# process_geojson.py
import json
import pycountry

INPUT_FILENAME = "static/countries.geojson"
OUTPUT_FILENAME = "static/countries_with_a2.geojson"

print(f"Reading from {INPUT_FILENAME}...")

try:
    with open(INPUT_FILENAME, "r", encoding="utf-8") as f:
        data = json.load(f)
except FileNotFoundError:
    print(
        f"Error: Could not find the input file '{INPUT_FILENAME}'. Make sure it's in your static folder."
    )
    exit()

print("Processing features...")
countries_found = 0
countries_not_found = 0

for feature in data["features"]:
    if "properties" in feature and "ISO_A3" in feature["properties"]:
        iso_a3_code = feature["properties"]["ISO_A3"]

        try:
            # Look up the country by its 3-letter code
            country = pycountry.countries.get(alpha_3=iso_a3_code)
            if country:
                # If found, add the 2-letter code to the properties
                feature["properties"]["ISO_A2"] = country.alpha_2
                countries_found += 1
            else:
                countries_not_found += 1
        except Exception:
            # Handle non-standard codes like '-99' or 'ATA'
            countries_not_found += 1

print(f"Finished processing. Added ISO_A2 codes for {countries_found} countries.")
if countries_not_found > 0:
    print(f"Could not find a match for {countries_not_found} entries.")

print(f"Saving new file to {OUTPUT_FILENAME}...")
with open(OUTPUT_FILENAME, "w", encoding="utf-8") as f:
    json.dump(data, f)

print("Success! Your new GeoJSON file is ready.")
