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
    // --- IMPORTANT: Paste your Cesium Ion Access Token here ---
    Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyOGMwNTA3OS1jMWI2LTRlMmUtYWNhNy1iMDBmZWRlYTA4ZWQiLCJpZCI6MzMyMDU1LCJpYXQiOjE3NTUxODM1MTd9.GaaEimukHVcwZ1WEkqo71CT6Heb3M4hFIkKaU8WMb7E';

    // --- 1. Initialise Viewers ---
    const map = L.map('map').setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map);

    const viewer = new Cesium.Viewer('cesium-container', {
        animation: false, timeline: false, geocoder: false, homeButton: false, sceneModePicker: false, 
        baseLayerPicker: false, navigationHelpButton: false, infoBox: false, selectionIndicator: false, fullscreenButton: false,
    });
    viewer.cesiumWidget.creditContainer.style.display = "none";

    // --- 2. Setup UI and Data Storage ---
    const layersByYear = {};
    const loader = document.getElementById('loader-container');
    const viewSwitch = document.getElementById('view-switch');
    const leafletContainer = document.getElementById('map');
    const cesiumContainer = document.getElementById('cesium-container');

    // *** THIS IS THE FIX: Change 'click' to 'input' ***
    viewSwitch.addEventListener('input', () => {
        if (!viewSwitch.selected) { // 2D Map view
            leafletContainer.style.display = 'block';
            cesiumContainer.style.display = 'none';
        } else { // Globe view
            leafletContainer.style.display = 'none';
            cesiumContainer.style.display = 'block';
        }
    });
    leafletContainer.style.display = 'block';
    cesiumContainer.style.display = 'none';
    viewSwitch.selected = false;

    if (loader) loader.style.display = 'flex';

    // --- 3. Fetch and Process Data ---
    fetch('/static/airports.csv')
        .then(response => response.text())
        .then(csvText => {
            Papa.parse(csvText, {
                header: true, skipEmptyLines: true,
                complete: async (results) => {
                    const airportData = new Map();
                    results.data.forEach(row => {
                        if (row.iata_code && row.latitude_deg && row.longitude_deg) {
                            airportData.set(row.iata_code, {
                                lat: parseFloat(row.latitude_deg), lng: parseFloat(row.longitude_deg), country: row.iso_country
                            });
                        }
                    });

                    const allFlights = await getAllFlights();
                    const uniqueYears = calculateAndDisplayStats(allFlights, airportData);

                    // --- 4. Draw on Both Viewers & Store Layers ---
                    allFlights.forEach(flight => {
                        const origin = airportData.get(flight.origin);
                        const dest = airportData.get(flight.destination);

                        if (origin && dest && !isNaN(origin.lat) && !isNaN(dest.lat)) {
                            const year = new Date(flight.date).getFullYear();
                            const lineColour = '#4f6353';
                            
                            const startPointL = L.latLng(origin.lat, origin.lng);
                            const endPointL = L.latLng(dest.lat, dest.lng);
                            const curvePoints = getGreatCirclePoints(startPointL, endPointL);
                            const leafletLine = L.polyline(curvePoints, { color: lineColour, weight: 2, opacity: 0.7 });
                            const markerOptions = { radius: 3, fillColor: lineColour, color: "#4f6353", weight: 0.5, opacity: 1, fillOpacity: 0.8 };
                            const tooltipOptions = { permanent: true, direction: 'top', offset: [0, -5], className: 'airport-label' };
                            
                            // *** THIS IS THE FIX ***
                            // Open the tooltip immediately when the marker is created.
                            const startDot = L.circleMarker(startPointL, markerOptions).bindTooltip(flight.origin, tooltipOptions).openTooltip();
                            const endDot = L.circleMarker(endPointL, markerOptions).bindTooltip(flight.destination, tooltipOptions).openTooltip();
                            const leafletLayer = L.featureGroup([leafletLine, startDot, endDot]);

                            const cesiumLine = viewer.entities.add({ polyline: { positions: Cesium.Cartesian3.fromDegreesArray([origin.lng, origin.lat, dest.lng, dest.lat]), width: 2, material: Cesium.Color.BLACK.withAlpha(0.7), arcType: Cesium.ArcType.GEODESIC } });

                            if (!layersByYear[year]) layersByYear[year] = [];
                            layersByYear[year].push({ leaflet: leafletLayer, cesium: cesiumLine });
                        }
                    });

                    // --- 5. Create Filter Chips ---
                    const chipContainer = document.getElementById('chip-container');
                    chipContainer.innerHTML = '';
                    uniqueYears.forEach(year => {
                        const chip = document.createElement('md-filter-chip');
                        chip.label = String(year);
                        chip.selected = true;
                        chip.addEventListener('click', () => {
                            const layers = layersByYear[year] || [];
                            layers.forEach(layer => {
                                // *** THIS IS THE FIX ***
                                // Simply add or remove the layer. Do not call openTooltip here.
                                if (chip.selected) { map.addLayer(layer.leaflet); } 
                                else { map.removeLayer(layer.leaflet); }
                                layer.cesium.show = chip.selected;
                            });
});
                        chipContainer.appendChild(chip);
                    });

                    // --- 6. Initially Add All Layers ---
                    for (const year in layersByYear) {
                        layersByYear[year].forEach(layer => {
                            // *** THIS IS THE FIX ***
                            // Simply add the layer. The tooltips are already open.
                            map.addLayer(layer.leaflet);
                            layer.cesium.show = true;
                        });
                    }
                    
                    if (loader) loader.style.display = 'none';
                }
            });
        });
});