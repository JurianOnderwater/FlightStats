// static/js/map.js

/**
 * Calculates a series of points along a great-circle arc.
 */
function getGreatCirclePoints(start, end) {
    const points = [];
    const numPoints = 100;

    const lat1 = start.lat * Math.PI / 180, lon1 = start.lng * Math.PI / 180;
    const lat2 = end.lat * Math.PI / 180, lon2 = end.lng * Math.PI / 180;
    const d = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin((lat1 - lat2) / 2), 2) + Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lon1 - lon2) / 2), 2)));

    for (let i = 0; i <= numPoints; i++) {
        const f = i / numPoints;
        if (Math.sin(d) === 0) { points.push([start.lat, start.lng]); continue; }
        const A = Math.sin((1 - f) * d) / Math.sin(d);
        const B = Math.sin(f * d) / Math.sin(d);
        const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
        const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
        const z = A * Math.sin(lat1) + B * Math.sin(lat2);
        const lat = Math.atan2(z, Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2))) * 180 / Math.PI;
        const lon = Math.atan2(y, x) * 180 / Math.PI;
        points.push([lat, lon]);
    }
    return points;
}


document.addEventListener('DOMContentLoaded', () => {
    const map = L.map('map').setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const loader = document.getElementById('loader-container');
    if (loader) loader.style.display = 'flex';

    // Fetch the airport CSV data first
    fetch('/static/airports.csv')
        .then(response => response.text())
        .then(csvText => {
            // Use Papa Parse to robustly parse the CSV data
            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                complete: async (results) => {
                    const airportData = new Map();
                    results.data.forEach(row => {
                        if (row.iata_code && row.latitude_deg && row.longitude_deg) {
                            airportData.set(row.iata_code, {
                                lat: parseFloat(row.latitude_deg),
                                lng: parseFloat(row.longitude_deg),
                                country: row.iso_country
                            });
                        }
                    });
                    console.log(`Finished parsing. Found ${airportData.size} airports.`);

                    // Now that we have airport data, get the flights from the local DB
                    const allFlights = await getAllFlights();

                    // --- 1. Calculate and Display All Stats using stats.js ---
                    const uniqueYears = calculateAndDisplayStats(allFlights, airportData);

                    // --- 2. Draw Map Layers and Create Filter Chips ---
                    const layersByYear = {};
                    const lineColour = '#000000';

                    allFlights.forEach(flight => {
                        const origin = airportData.get(flight.origin);
                        const dest = airportData.get(flight.destination);

                        if (origin && dest) {
                            const year = new Date(flight.date).getFullYear();
                            
                            const startPoint = L.latLng(origin.lat, origin.lng);
                            const endPoint = L.latLng(dest.lat, dest.lng);
                            const curvePoints = getGreatCirclePoints(startPoint, endPoint);

                            const line = L.polyline(curvePoints, { color: lineColour, weight: 2, opacity: 0.7 });
                            const markerOptions = { radius: 3, fillColor: lineColour, color: "#000", weight: 0.5, opacity: 1, fillOpacity: 0.8 };
                            const startDot = L.circleMarker(startPoint, markerOptions).bindTooltip(flight.origin);
                            const endDot = L.circleMarker(endPoint, markerOptions).bindTooltip(flight.destination);
                            const routeLayer = L.featureGroup([line, startDot, endDot]);

                            if (!layersByYear[year]) layersByYear[year] = [];
                            layersByYear[year].push(routeLayer);
                        }
                    });

                    const chipContainer = document.getElementById('chip-container');
                    chipContainer.innerHTML = ''; // Clear any old chips
                    uniqueYears.forEach(year => {
                        const chip = document.createElement('md-filter-chip');
                        chip.label = String(year);
                        chip.selected = true;
                        chip.addEventListener('click', () => {
                            const layers = layersByYear[year] || [];
                            if (chip.selected) {
                                layers.forEach(layer => layer.addTo(map).openTooltip());
                            } else {
                                layers.forEach(layer => map.removeLayer(layer));
                            }
                        });
                        chipContainer.appendChild(chip);
                    });

                    for (const year in layersByYear) {
                        layersByYear[year].forEach(layer => layer.addTo(map).openTooltip());
                    }
                    
                    if (loader) loader.style.display = 'none';
                },
                error: (error) => {
                    console.error("Papa Parse Error:", error);
                    if (loader) loader.style.display = 'none';
                }
            });
        })
        .catch(error => {
            console.error("Failed to fetch airports.csv:", error);
            if (loader) loader.style.display = 'none';
        });
});