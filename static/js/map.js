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
    // --- 1. Initialise Viewers ---
    const map = L.map('map').setView([20, 0], 2);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);
    // L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    //     attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    // }).addTo(map);

    // --- 2. Initialise ECharts Globe View ---
    const globeContainer = document.getElementById('cesium-container'); // Reusing the old container
    const globeChart = echarts.init(globeContainer);

    // --- 2. Setup UI and Data Storage ---
    const layersByYear = {};
    const loader = document.getElementById('loader-container');
    let allEchartsRoutes = []; // To store flight data for ECharts
    const viewSwitch = document.getElementById('view-switch');
    const leafletContainer = document.getElementById('map');
    // const cesiumContainer = document.getElementById('cesium-container');

    // *** THIS IS THE FIX: Change 'click' to 'input' ***
    viewSwitch.addEventListener('input', () => {
        if (!viewSwitch.selected) {
            leafletContainer.style.display = 'block';
            globeContainer.style.display = 'none';
        } else {
            leafletContainer.style.display = 'none';
            globeContainer.style.display = 'block';
            globeChart.resize(); // Important: resize chart when it becomes visible
        }
    });
    leafletContainer.style.display = 'block';
    globeContainer.style.display = 'none';
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
                                lat: parseFloat(row.latitude_deg), 
                                lng: parseFloat(row.longitude_deg), 
                                country: row.iso_country,
                                name: row.name, // Also store the name for the datalist
                                city: row.municipality // And the city
                                lat: parseFloat(row.latitude_deg), 
                                lng: parseFloat(row.longitude_deg), 
                                country: row.iso_country,
                                name: row.name, // Also store the name for the datalist
                                city: row.municipality // And the city
                            });
                        }
                    });
                    localStorage.setItem('airportData', JSON.stringify(Array.from(airportData.entries())));

                    console.log(`Finished parsing and cached ${airportData.size} airports.`);
                    
                    localStorage.setItem('airportData', JSON.stringify(Array.from(airportData.entries())));

                    console.log(`Finished parsing and cached ${airportData.size} airports.`);
                    

                    const allFlights = await getAllFlights();
                    const { uniqueYears } = calculateAndDisplayStats(allFlights, airportData);
                    const { uniqueYears } = calculateAndDisplayStats(allFlights, airportData);
                    const aggregatedRoutes = new Map();

                    // --- 5. Prepare Data and Draw for Both Views ---
                    allFlights.forEach(flight => {
                        const origin = airportData.get(flight.origin);
                        const dest = airportData.get(flight.destination);
                        const canonicalRoute = [flight.origin, flight.destination].sort().join('-');
                        if (!aggregatedRoutes.has(canonicalRoute)) {
                            aggregatedRoutes.set(canonicalRoute, { count: 0, maxDate: '1900-01-01' });
                        }
                        const routeData = aggregatedRoutes.get(canonicalRoute);
                        routeData.count += 1;
                        if (flight.date > routeData.maxDate) {
                            routeData.maxDate = flight.date;
                        }

                        if (origin && dest && !isNaN(origin.lat) && !isNaN(dest.lat)) {
                            const lineColour = '#006d39';
                            const lineWeight = routeData.count
                            const year = new Date(flight.date).getFullYear();
                            
                            const startPointL = L.latLng(origin.lat, origin.lng);
                            const endPointL = L.latLng(dest.lat, dest.lng);
                            const curvePoints = getGreatCirclePoints(startPointL, endPointL);
                            const leafletLine = L.polyline(curvePoints, { color: lineColour, weight: lineWeight, opacity: 0.7 });
                            const markerOptions = { radius: 3, fillColor: lineColour, color: "#000", weight: 0.5, opacity: 1, fillOpacity: 0.8 };
                            const tooltipOptions = { permanent: true, direction: 'top', offset: [0, -5], className: 'airport-label' };
                            
                            // *** THIS IS THE FIX ***
                            // Open the tooltip immediately when the marker is created.
                            const startDot = L.circleMarker(startPointL, markerOptions).bindTooltip(flight.origin, tooltipOptions).openTooltip();
                            const endDot = L.circleMarker(endPointL, markerOptions).bindTooltip(flight.destination, tooltipOptions).openTooltip();
                            const leafletLayer = L.featureGroup([leafletLine, startDot, endDot]);

                            if (!layersByYear[year]) layersByYear[year] = [];
                            layersByYear[year].push({ leaflet: leafletLayer });

                            // B. Prepare ECharts route data
                            const lineWeightDouble = lineWeight * 2;
                            allEchartsRoutes.push({
                                year: year,
                                coords: [[origin.lng, origin.lat], [dest.lng, dest.lat]],
                                weight: lineWeightDouble
                            });
                        }
                    });

                    // --- 6. Configure and Render ECharts Globe ---
                    globeChart.setOption({
                        backgroundColor: '#000',
                        globe: {
                            baseTexture: '/static/textures/world.topo.bathy.200401.jpg',
                            heightTexture: '/static/textures/bathymetry_bw_composite_4k.jpg',
                            shading: 'lambert',
                            light: { ambient: { intensity: 0.4 }, main: { intensity: 0.6 } },
                            viewControl: { autoRotate: false }
                        },
                        series: {
                            type: 'lines3D',
                            coordinateSystem: 'globe',
                            blendMode: 'lighter',
                            lineStyle: { color: '#006d39', opacity: 0.7 },
                            data: allEchartsRoutes.map(route => ({
                                coords: route.coords,
                                lineStyle: {
                                    width: route.weight,
                                }
                            }))
                        }
                    });
                
                    // --- 7. Create Filter Chips with updated logic ---
                    const chipContainer = document.getElementById('chip-container');
                    chipContainer.innerHTML = '';
                    const selectedYears = new Set(uniqueYears);

                    uniqueYears.forEach(year => {
                        const chip = document.createElement('md-filter-chip');
                        chip.label = String(year);
                        chip.selected = true;
                        chip.addEventListener('click', () => {
                            if (chip.selected) selectedYears.add(year);
                            else selectedYears.delete(year);

                            // Filter Leaflet
                            const leafletLayers = layersByYear[year] || [];
                            leafletLayers.forEach(l => chip.selected ? map.addLayer(l.leaflet) : map.removeLayer(l.leaflet));

                            // Filter ECharts
                            const filteredRoutes = allEchartsRoutes.filter(r => selectedYears.has(r.year));
                            globeChart.setOption({ series: { data: filteredRoutes.map(r => r.coords) } });
                        });
                        chipContainer.appendChild(chip);
                    });

                    // Initially add all Leaflet layers
                    for (const year in layersByYear) {
                        layersByYear[year].forEach(l => map.addLayer(l.leaflet));
                    }

                    // --- 7. Find and Draw Longest/Shortest Flights ---
                    if (allFlights.length >= 2) {
                        // First, ensure every flight has a calculated distance
                        allFlights.forEach(flight => {
                            if (typeof flight.distance === 'undefined') {
                                const origin = airportData.get(flight.origin);
                                const dest = airportData.get(flight.destination);
                                if (origin && dest && !isNaN(origin.lat)) {
                                    flight.distance = haversine(origin.lat, origin.lng, dest.lat, dest.lng);
                                } else {
                                    flight.distance = 0;
                                }
                            }
                        });

                        const sortedByDist = [...allFlights].filter(f => f.distance > 0).sort((a, b) => a.distance - b.distance);
                        

                        if (sortedByDist.length > 0) {
                            const shortestFlight = sortedByDist[0];
                            const longestFlight = sortedByDist[sortedByDist.length - 1];

                            const themeStyles = getComputedStyle(document.documentElement);
                            const longColor = themeStyles.getPropertyValue('--md-sys-color-primary-comp-yellow').trim();
                            const shortColor = themeStyles.getPropertyValue('--md-sys-color-primary-comp-purple').trim();

                            // Draw the longest flight
                            if (longestFlight) {
                                const origin = airportData.get(longestFlight.origin);
                                const dest = airportData.get(longestFlight.destination);
                                const startPoint = L.latLng(origin.lat, origin.lng);
                                const endPoint = L.latLng(dest.lat, dest.lng);
                                const curvePoints = getGreatCirclePoints(startPoint, endPoint);
                                L.polyline(curvePoints, { color: longColor, weight: 4, opacity: 1, dashArray: '5, 5' }).addTo(map);
                            }

                            // Draw the shortest flight
                            if (shortestFlight && shortestFlight.id !== longestFlight.id) {
                                const origin = airportData.get(shortestFlight.origin);
                                const dest = airportData.get(shortestFlight.destination);
                                const startPoint = L.latLng(origin.lat, origin.lng);
                                const endPoint = L.latLng(dest.lat, dest.lng);
                                const curvePoints = getGreatCirclePoints(startPoint, endPoint);
                                L.polyline(curvePoints, { color: shortColor, weight: 4, opacity: 1, dashArray: '5, 5' }).addTo(map);
                            }
                        }
                    }
                    
                    if (loader) loader.style.display = 'none';
                }
            });
        });
});