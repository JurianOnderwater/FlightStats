// static/js/map.js

/**
 * Calculates a series of points along a great-circle arc.
 * @param {L.LatLng} start - The starting latitude/longitude.
 * @param {L.LatLng} end - The ending latitude/longitude.
 * @returns {L.LatLng[]} An array of points for the polyline.
 */
function getGreatCirclePoints(start, end) {
    const points = [];
    const numPoints = 360; // Increase for a smoother curve

    // Convert lat/lng to radians
    const lat1 = start.lat * Math.PI / 180;
    const lon1 = start.lng * Math.PI / 180;
    const lat2 = end.lat * Math.PI / 180;
    const lon2 = end.lng * Math.PI / 180;

    // Calculate the angular distance between the two points
    const d = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin((lat1 - lat2) / 2), 2) + 
        Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lon1 - lon2) / 2), 2)));

    for (let i = 0; i <= numPoints; i++) {
        const f = i / numPoints;
        if (Math.sin(d) === 0) { // Handle antipodal points
            points.push([start.lat, start.lng]);
            continue;
        }
        const A = Math.sin((1 - f) * d) / Math.sin(d);
        const B = Math.sin(f * d) / Math.sin(d);

        // Calculate x, y, z coordinates
        const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
        const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
        const z = A * Math.sin(lat1) + B * Math.sin(lat2);

        // Convert back to lat/lng
        const lat = Math.atan2(z, Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2))) * 180 / Math.PI;
        const lon = Math.atan2(y, x) * 180 / Math.PI;

        points.push([lat, lon]);
    }
    return points;
}


document.addEventListener('DOMContentLoaded', function () {
    const map = L.map('map').setView([20, 0], 2);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    // Object to hold our map layers, keyed by year
    const layersByYear = {};
    const loader = document.getElementById('loader-container');

    // Show the loader before fetching data
    if (loader) {
        loader.style.display = 'flex';
    }

    fetch('/api/data')
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => { throw new Error(text) });
            }
            return response.json();
        })
        .then(data => {
            if (!data || !data.stats || !data.routes) {
                console.error("Incomplete data received from API.");
                return;
            }

            // --- Populate All Stats ---
            const hero = data.stats.hero_stats || {};
            document.getElementById('hero-flights').textContent = hero.total_flights || 0;
            document.getElementById('hero-countries').textContent = hero.total_countries || 0;
            document.getElementById('hero-airports').textContent = hero.total_airports || 0;
            document.getElementById('hero-routes').textContent = hero.total_routes || 0;

            const dist = data.stats.distance_stats || {};
            document.getElementById('total-km').textContent = Math.round(dist.total_km || 0).toLocaleString();
            document.getElementById('total-miles').textContent = Math.round(dist.total_miles || 0).toLocaleString();
            document.getElementById('earth-circumnavigations').textContent = (dist.earth_circumnavigations || 0).toFixed(2);
            document.getElementById('percent-to-moon').textContent = (dist.percent_to_moon || 0).toFixed(2);

            const time = data.stats.time_stats || {};
            document.getElementById('total-hours').textContent = Math.round(time.total_hours || 0).toLocaleString();
            document.getElementById('total-days').textContent = (time.total_days || 0).toFixed(1);
            document.getElementById('total-weeks').textContent = (time.total_weeks || 0).toFixed(1);
            document.getElementById('total-months').textContent = (time.total_months || 0).toFixed(1);

            const topAirportsList = document.getElementById('top-airports-list');
            topAirportsList.innerHTML = '';
            (data.stats.top_airports || []).forEach(airport => {
                const listItem = document.createElement('li');
                listItem.innerHTML = `<b>${airport.iata}</b>: ${airport.count} visits (${airport.percent.toFixed(1)}%)`;
                topAirportsList.appendChild(listItem);
            });

            const topRoutesList = document.getElementById('top-routes-list');
            topRoutesList.innerHTML = '';
            (data.stats.top_routes || []).forEach(route => {
                const listItem = document.createElement('li');
                listItem.innerHTML = `<b>${route.route}</b>: ${route.count} times`;
                topRoutesList.appendChild(listItem);
            });

            // --- Store Map Layers by Year ---
            const lineColour = '#4f6353';
            data.routes.forEach(route => {
                const year = route.most_recent_year;
                const airport1 = route.airport1;
                const airport2 = route.airport2;

                if (airport1 && airport2) {
                    const startPoint = L.latLng(airport1.coords[0], airport1.coords[1]);
                    const endPoint = L.latLng(airport2.coords[0], airport2.coords[1]);

                    const curvePoints = getGreatCirclePoints(startPoint, endPoint);

                    const line = L.polyline(curvePoints, {
                        color: lineColour, weight: route.weight, opacity: 0.8
                    });
                    
                    const markerOptions = { radius: 3, fillColor: lineColour, color: "#000", weight: 0.5, opacity: 1, fillOpacity: 0.8 };
                    const tooltipOptions = { permanent: true, direction: 'top', offset: [0, -5], className: 'airport-label' };

                    const startDot = L.circleMarker(startPoint, markerOptions).bindTooltip(airport1.iata, tooltipOptions);
                    const endDot = L.circleMarker(endPoint, markerOptions).bindTooltip(airport2.iata, tooltipOptions);
                    
                    const routeLayer = L.featureGroup([line, startDot, endDot]);

                    if (!layersByYear[year]) {
                        layersByYear[year] = [];
                    }
                    layersByYear[year].push(routeLayer);
                }
            });

            // --- Create and Add Filter Chips ---
            const chipContainer = document.getElementById('chip-container');
            const uniqueYears = data.stats.unique_years || [];

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

            // --- Initially Add All Layers to the Map ---
            for (const year in layersByYear) {
                layersByYear[year].forEach(layer => {
                    layer.addTo(map).openTooltip();
                });
            }
        })
        .catch(error => console.error('Error fetching flight data:', error))
        .finally(() => {
            if (loader) {
                loader.style.display = 'none';
            }
        });
});