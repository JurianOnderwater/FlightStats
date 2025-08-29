// static/js/stats.js


/**
 * Creates a sunburst chart of travel distribution.
 */
function createSunburstChart(allFlights, airportData) {
    const chartDom = document.getElementById('sunburst-chart');
    if (!chartDom) return;

    const hierarchy = {};
    const airportVisits = new Map();
    allFlights.forEach(flight => {
        airportVisits.set(flight.origin, (airportVisits.get(flight.origin) || 0) + 1);
        airportVisits.set(flight.destination, (airportVisits.get(flight.destination) || 0) + 1);
    });

    for (const [iata, count] of airportVisits.entries()) {
        const airport = airportData.get(iata);
        if (!airport || !airport.country || !airport.city) continue;
        const continent = countryToContinent[airport.country];
        if (!continent) continue;
        if (!hierarchy[continent]) hierarchy[continent] = { name: continent, children: {} };
        if (!hierarchy[continent].children[airport.country]) hierarchy[continent].children[airport.country] = { name: airport.country, children: {} };
        if (!hierarchy[continent].children[airport.country].children[airport.city]) {
             hierarchy[continent].children[airport.country].children[airport.city] = { name: airport.city, value: 0 };
        }
        hierarchy[continent].children[airport.country].children[airport.city].value += count;
    }

    const echartsData = Object.values(hierarchy).map(continent => ({
        name: continent.name,
        children: Object.values(continent.children).map(country => ({
            name: country.name,
            children: Object.values(country.children)
        }))
    }));

    const myChart = echarts.init(chartDom);
    const themeStyles = getComputedStyle(document.documentElement);
    const option = {
        color: [
            // themeStyles.getPropertyValue('--md-sys-color-comp-pink').trim(),
            // themeStyles.getPropertyValue('--md-sys-color-comp-orange').trim(),
            themeStyles.getPropertyValue('--md-sys-color-error-container').trim(),
            themeStyles.getPropertyValue('--md-sys-color-primary-container').trim(), 
              themeStyles.getPropertyValue('--md-sys-color-comp-yellow').trim(),
            themeStyles.getPropertyValue('--md-sys-color-comp-cyan').trim(),
        ],
        series: {
            type: 'sunburst', data: echartsData, radius: [0, '95%'], sort: undefined,
            emphasis: { focus: 'ancestor' },
            levels: [{}, { r0: '15%', r: '40%', itemStyle: { borderWidth: 2, borderColor: themeStyles.getPropertyValue('--md-sys-color-surface').trim() }, label: { rotate: 'tangential' } },
                { r0: '40%', r: '70%', itemStyle: { borderColor: themeStyles.getPropertyValue('--md-sys-color-surface').trim() }, label: { align: 'right' } },
                { r0: '70%', r: '72%', label: { position: 'outside', padding: 3, silent: false }, itemStyle: { borderWidth: 3, borderColor: themeStyles.getPropertyValue('--md-sys-color-surface').trim() } }
            ]
        }
    };
    myChart.setOption(option);
}

// In static/js/stats.js, replace the createCountryMap function

async function createCountryMap(visitedCountries) {
    const mapElement = document.getElementById('country-map');
    if (!mapElement) return;

    const map = L.map(mapElement, {
        center: [20, 0],
        zoom: 2,
        attributionControl: false
    });

    const themeStyles = getComputedStyle(document.documentElement);
    const visitedColor = themeStyles.getPropertyValue('--md-sys-color-primary-container').trim();
    const defaultColor = themeStyles.getPropertyValue('--md-sys-color-surface-variant').trim();

    try {
        const response = await fetch('/static/countries_with_a2.geojson');
        const geojsonData = await response.json();

        L.geoJSON(geojsonData, {
            style: (feature) => {
                // *** THIS IS THE FIX ***
                // Get the primary code
                let countryCode = feature.properties.ISO_A2;
                
                // If the primary code is invalid, try the backup code
                if (countryCode === '-99' || !countryCode) {
                    countryCode = feature.properties.ISO_A2_EH;
                }
                
                const isVisited = countryCode && visitedCountries.has(countryCode.toUpperCase());
                
                return {
                    fillColor: isVisited ? visitedColor : defaultColor,
                    weight: 1,
                    opacity: 1,
                    color: themeStyles.getPropertyValue('--md-sys-color-primary').trim(),
                    fillOpacity: 0.8
                };
            }
        }).addTo(map);

    } catch (error) {
        console.error("Failed to load GeoJSON data for country map:", error);
    }
}

async function calculateAndDisplayHometownStats(allFlights, airportData) {
    const setupContainer = document.getElementById('hometown-setup');
    if (!setupContainer) {
        return;
    }
    const displayContainer = document.getElementById('hometown-display');
    const setBtn = document.getElementById('set-hometown-btn');
    const changeBtn = document.getElementById('change-hometown-btn');
    const dialog = document.getElementById('hometown-dialog');
    const dialogInput = document.getElementById('hometown-input');

    const render = () => {
        const hometownIata = localStorage.getItem('hometownIata');

        if (!hometownIata || !airportData.has(hometownIata)) {
            setupContainer.style.display = 'flex';
            displayContainer.style.display = 'none';
        } else {
            setupContainer.style.display = 'none';
            displayContainer.style.display = 'flex';
            
            document.getElementById('hometown-iata').textContent = hometownIata;
            
            const homeCoords = airportData.get(hometownIata);
            const uniqueAirports = [...new Set(allFlights.flatMap(f => [f.origin, f.destination]))];

            let northernmost = {iata: 'N/A', lat: 0, dist: 0};
            let southernmost = {iata: 'N/A', lat: 0, dist: 0};
            let easternmost = {iata: 'N/A', lng: 0, dist: 0};
            let westernmost = {iata: 'N/A', lng: 0, dist: 0};

            if (homeCoords && homeCoords.lat && homeCoords.lng) {
                northernmost = {iata: hometownIata, lat: homeCoords.lat, dist: 0};
                southernmost = {iata: hometownIata, lat: homeCoords.lat, dist: 0};
                easternmost = {iata: hometownIata, lng: homeCoords.lng, dist: 0};
                westernmost = {iata: hometownIata, lng: homeCoords.lng, dist: 0};
            }

            const hometownFlights = allFlights.filter(f => f.origin === hometownIata);
            const uniqueDestinations = [...new Set(hometownFlights.map(f => f.destination))];
            // console.log('Unique destinations:', uniqueDestinations);
            uniqueDestinations.forEach(iata => {
                const airport = airportData.get(iata);
                if (airport) {
                    if (airport.lat > northernmost.lat) northernmost = { iata, lat: airport.lat, dist: compassdistance(homeCoords.lat, airport.lat), city: airport.city };
                    if (airport.lng > easternmost.lng) easternmost = { iata, lng: airport.lng, dist: compassdistance(homeCoords.lng, airport.lng), city: airport.city };
                    if (airport.lat < southernmost.lat) southernmost = { iata, lat: airport.lat, dist: compassdistance(homeCoords.lat, airport.lat), city: airport.city };
                    if (airport.lng < westernmost.lng) westernmost = { iata, lng: airport.lng, dist: compassdistance(homeCoords.lng, airport.lng), city: airport.city };
                }
            });

            document.querySelector('#northernmost-li span').textContent = `${northernmost.city} (${Math.round(northernmost.dist).toLocaleString()} km)`;
            document.querySelector('#easternmost-li span').textContent = `${easternmost.city} (${Math.round(easternmost.dist).toLocaleString()} km)`;
            document.querySelector('#southernmost-li span').textContent = `${southernmost.city} (${Math.round(southernmost.dist).toLocaleString()} km)`;
            document.querySelector('#westernmost-li span').textContent = `${westernmost.city} (${Math.round(westernmost.dist).toLocaleString()} km)`;

            const mapContainer = document.getElementById('hometown-map');
            if (mapContainer._leaflet_id) {
                mapContainer._leaflet_id = null;
            }
            mapContainer.innerHTML = '';


            const map = L.map('hometown-map', { attributionControl: false, zoomControl: false });
            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(map);

            const tooltipOptions = { permanent: true, direction: 'top', offset: [0, -5], className: 'airport-label' };

            const points = [homeCoords];
            const destinations = [northernmost, southernmost, easternmost, westernmost];
            const bounds = L.latLngBounds();
            bounds.extend([homeCoords.lat, homeCoords.lng]);

            const themeStyles = getComputedStyle(document.documentElement);
            const homeColor = themeStyles.getPropertyValue('--md-sys-color-comp-yellow').trim();
            const compassColor = themeStyles.getPropertyValue('--md-sys-color-primary-container').trim();
            const lineColor = themeStyles.getPropertyValue('--md-sys-color-primary-comp-green').trim();

            L.circleMarker([homeCoords.lat, homeCoords.lng], { radius: 6, fillColor: homeColor, color: '#FFF', weight: 1, fillOpacity: 1 }).addTo(map)
            .bindTooltip(hometownIata, tooltipOptions)
            .openTooltip();

            destinations.forEach(dest => {
                if (dest.iata !== 'N/A') {
                    const destCoords = airportData.get(dest.iata);
                    points.push(destCoords);
                    L.circleMarker([destCoords.lat, destCoords.lng], { radius: 4, fillColor: lineColor, color: '#FFF', weight: 1, fillOpacity: 0.8 }).addTo(map)
                    .bindTooltip(dest.iata, tooltipOptions)
                    .openTooltip();
                    
                    const line = L.polyline(getGreatCirclePoints(L.latLng(homeCoords.lat, homeCoords.lng), L.latLng(destCoords.lat, destCoords.lng)), { color: lineColor, weight: 1.5, opacity: 0.7 });
                    line.addTo(map);
                    bounds.extend([destCoords.lat, destCoords.lng]);
                }
            });
            
            map.fitBounds(bounds, { padding: [20, 20] });
        }
    };

    const promptForHometown = () => {
        const iata = prompt("Please enter your hometown's 3-letter IATA code (e.g., TOS, LHR, JFK):");
        if (iata && iata.length === 3 && airportData.has(iata.toUpperCase())) {
            localStorage.setItem('hometownIata', iata.toUpperCase());
            render();
        } else if (iata) {
            alert("Invalid IATA code. Please try again.");
        }
    };

    setBtn.addEventListener('click', promptForHometown);
    changeBtn.addEventListener('click', promptForHometown);

    render();
}

/**
 * Takes flight data, calculates all stats, and updates the DOM elements that it finds.
 */
function calculateAndDisplayStats(allFlights, airportData) {
    if (!allFlights || allFlights.length === 0) return [];

    let totalKm = 0;
    const airportVisits = new Map();
    const routeFrequency = new Map();
    const uniqueYears = new Set();
    const monthCounts = Array(12).fill(0);
    const weekdayCounts = Array(7).fill(0);
    const yearlyCounts = new Map(); // Map to store flight counts per year
    
    
    const sortedFlights = [...allFlights].sort((a, b) => new Date(a.date) - new Date(b.date));

    const milestones = { 1000: 0, 10000: 0, 50000: 0, 100000: 0, 1000000: 0 };
    let cumulativeDistance = 0;
    let flightCount = 0;
    let milestonesToFind = Object.keys(milestones).map(Number);
    const chartData = [{x: 0, y: 0}];

    sortedFlights.forEach(flight => {
        flightCount++;

        const flightDate = new Date(flight.date);
        const year = flightDate.getFullYear();
        const month = flightDate.getMonth(); // Get month (0-11)
        const weekday = flightDate.getDay(); // Get day of week (0=Sun, 1=Mon, etc.)        
        
        
        uniqueYears.add(year);
        monthCounts[month]++; // Increment count for the month
        weekdayCounts[weekday]++;
        yearlyCounts.set(year, (yearlyCounts.get(year) || 0) + 1);

        // Add distance to each flight object once
        allFlights.forEach(flight => {
            const origin = airportData.get(flight.origin);
            const dest = airportData.get(flight.destination);
            if (origin && dest && !isNaN(origin.lat)) {
                flight.distance = haversine(origin.lat, origin.lng, dest.lat, dest.lng);
            } else {
                flight.distance = 0;
            }
        });

        const origin = airportData.get(flight.origin);
        const dest = airportData.get(flight.destination);
        let distance = 0;

        if (origin && dest && !isNaN(origin.lat) && !isNaN(dest.lat)) {
            distance = haversine(origin.lat, origin.lng, dest.lat, dest.lng);
            totalKm += distance;
            uniqueYears.add(new Date(flight.date).getFullYear());
        }
        
        cumulativeDistance += distance;
        chartData.push({x: flightCount, y: cumulativeDistance});

        for (let i = milestonesToFind.length - 1; i >= 0; i--) {
            const milestone = milestonesToFind[i];
            if (cumulativeDistance >= milestone) {
                milestones[milestone] = flightCount;
                milestonesToFind.splice(i, 1);
            }
        }
        
        airportVisits.set(flight.origin, (airportVisits.get(flight.origin) || 0) + 1);
        airportVisits.set(flight.destination, (airportVisits.get(flight.destination) || 0) + 1);
        const canonicalRoute = [flight.origin, flight.destination].sort().join('-');
        routeFrequency.set(canonicalRoute, (routeFrequency.get(canonicalRoute) || 0) + 1);
    });

    const uniqueAirports = Array.from(airportVisits.keys());
    const uniqueCountries = new Set(uniqueAirports.map(iata => airportData.get(iata)?.country).filter(Boolean));
    const sortedAirports = [...airportVisits.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const sortedRoutes = [...routeFrequency.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const totalVisits = [...airportVisits.values()].reduce((sum, count) => sum + count, 0);

    const updateText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = value;
    };
    
    updateText('hero-flights', allFlights.length);
    updateText('hero-countries', uniqueCountries.size);
    updateText('hero-airports', uniqueAirports.length);
    updateText('hero-routes', routeFrequency.size);

    updateText('total-km', Math.round(totalKm).toLocaleString());
    updateText('total-miles', Math.round(totalKm / 1.60934).toLocaleString());
    updateText('earth-circumnavigations', (totalKm / 40075).toFixed(2));
    updateText('percent-to-moon', (totalKm / 384400 * 100).toFixed(2));

    const totalHours = totalKm / 850;
    const totalDays = totalHours / 24;
    updateText('total-hours', Math.round(totalHours).toLocaleString());
    updateText('total-days', totalDays.toFixed(1));
    updateText('total-weeks', (totalDays / 7).toFixed(1));
    updateText('total-months', (totalDays / 30.44).toFixed(1));

    const topAirportsList = document.getElementById('top-airports-list');
    if (topAirportsList) {
        topAirportsList.innerHTML = '';
        sortedAirports.forEach(([iata, count]) => {
            const percent = totalVisits > 0 ? (count / totalVisits * 100).toFixed(1) : 0;
            topAirportsList.innerHTML += `<li><b>${iata}</b>: ${count} visits (${percent}%)</li>`;
        });
    }

    const topRoutesList = document.getElementById('top-routes-list');
    if (topRoutesList) {
        topRoutesList.innerHTML = '';
        sortedRoutes.forEach(([route, count]) => {
            topRoutesList.innerHTML += `<li><b>${route}</b>: ${count} times</li>`;
        });
    }

    const milestonesList = document.getElementById('milestones-list');
    if (milestonesList) {
        milestonesList.innerHTML = '';
        for (const [dist, count] of Object.entries(milestones)) {
            const status = count > 0 ? `${count} flights` : 'Not yet reached';
            milestonesList.innerHTML += `<li><b>${Number(dist).toLocaleString()} km:</b> ${status}</li>`;
        }
    }
    
    const chartCanvas = document.getElementById('distance-chart');
    if (chartCanvas) {
        const themeStyles = getComputedStyle(document.documentElement);
        new Chart(chartCanvas, {
            type: 'line',
            data: { datasets: [{
                    label: 'Cumulative Distance', data: chartData,
                    borderColor: themeStyles.getPropertyValue('--md-sys-color-primary').trim(),
                    backgroundColor: themeStyles.getPropertyValue('--md-sys-color-primary-container').trim(),
                    fill: true, tension: 0.4, pointRadius: 0
                }]
            },
            options: { responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: {
                    title: (tooltipItems) => `After ${tooltipItems[0].label} flights`,
                    label: (tooltipItem) => `Total distance: ${Math.round(tooltipItem.raw.y).toLocaleString()} km`
                }}},
                scales: { x: { type: 'linear', title: { display: true, text: 'Number of Flights' }, grid: { color: themeStyles.getPropertyValue('--md-sys-color-surface-variant').trim() }},
                    y: { title: { display: true, text: 'Total Distance (km)' }, grid: { color: themeStyles.getPropertyValue('--md-sys-color-surface-variant').trim() },
                        ticks: { callback: (value) => `${(value / 1000).toLocaleString()}k` }
                    }
                }
            }
        });
    }
    // --- 5. Create the Seasonality Chart (NEW) ---
    const yearlyCanvas = document.getElementById('yearly-chart');
    if (yearlyCanvas) {
        const themeStyles = getComputedStyle(document.documentElement);
        // Sort the yearly data for a clean chart
        const sortedYearlyData = [...yearlyCounts.entries()].sort((a, b) => a[0] - b[0]);
        
        new Chart(yearlyCanvas, {
            type: 'bar',
            data: {
                labels: sortedYearlyData.map(entry => entry[0]), // Years
                datasets: [{
                    label: 'Flights per Year',
                    data: sortedYearlyData.map(entry => entry[1]), // Counts
                    backgroundColor: themeStyles.getPropertyValue('--md-sys-color-primary-container').trim(),
                    borderColor: themeStyles.getPropertyValue('--md-sys-color-primary').trim(),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    }
                }
            }
        });
    }
    const seasonalityCanvas = document.getElementById('seasonality-chart');
    if (seasonalityCanvas) {
        const themeStyles = getComputedStyle(document.documentElement);
        new Chart(seasonalityCanvas, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [{
                    label: 'Flights per Month',
                    data: monthCounts,
                    backgroundColor: themeStyles.getPropertyValue('--md-sys-color-primary-container').trim(),
                    borderColor: themeStyles.getPropertyValue('--md-sys-color-primary').trim(),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    }
                }
            }
        });
    }
    // --- 6. Create the Weekday Chart (NEW) ---
    const weekdayCanvas = document.getElementById('weekday-chart');
    if (weekdayCanvas) {
        const themeStyles = getComputedStyle(document.documentElement);
        // Reorder array to start the week on Monday
        const chartLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const chartCounts = [...weekdayCounts.slice(1), weekdayCounts[0]];

        new Chart(weekdayCanvas, {
            type: 'bar',
            data: {
                labels: chartLabels,
                datasets: [{
                    label: 'Flights per Weekday',
                    data: chartCounts,
                    backgroundColor: themeStyles.getPropertyValue('--md-sys-color-primary-container').trim(),
                    borderColor: themeStyles.getPropertyValue('--md-sys-color-primary').trim(),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    }
                }
            }
        });
    }
    const sortedByDist = [...allFlights].filter(f => f.distance > 0).sort((a, b) => a.distance - b.distance);
    const shortestFlight = sortedByDist[0];
    const longestFlight = sortedByDist[sortedByDist.length - 1];
    
    // --- NEW: Populate the Flight Records card ---
    if (shortestFlight) {
        updateText('shortest-flight-route', `${shortestFlight.origin}<br> ↓ <br>${shortestFlight.destination}`);
        updateText('shortest-flight-dist', `${Math.round(shortestFlight.distance).toLocaleString()} km`);
    }
    if (longestFlight) {
        updateText('longest-flight-route', `${longestFlight.origin}<br> ↓ <br>${longestFlight.destination}`);
        updateText('longest-flight-dist', `${Math.round(longestFlight.distance).toLocaleString()} km`);
    }



    createCountryMap(uniqueCountries);
    createSunburstChart(allFlights, airportData);
    calculateAndDisplayHometownStats(allFlights, airportData);
    return {
        uniqueYears: [...uniqueYears].sort((a, b) => b - a),
    };}
