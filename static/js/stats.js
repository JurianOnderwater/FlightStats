// static/js/stats.js

function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
const countryToContinent = {
    "AF": "Asia", "AX": "Europe", "AL": "Europe", "DZ": "Africa", "AS": "Oceania", "AD": "Europe", "AO": "Africa", "AI": "North America", "AQ": "Antarctica", "AG": "North America", "AR": "South America", "AM": "Asia", "AW": "North America", "AU": "Oceania", "AT": "Europe", "AZ": "Asia", "BS": "North America", "BH": "Asia", "BD": "Asia", "BB": "North America", "BY": "Europe", "BE": "Europe", "BZ": "North America", "BJ": "Africa", "BM": "North America", "BT": "Asia", "BO": "South America", "BQ": "North America", "BA": "Europe", "BW": "Africa", "BR": "South America", "IO": "Asia", "VG": "North America", "BN": "Asia", "BG": "Europe", "BF": "Africa", "BI": "Africa", "KH": "Asia", "CM": "Africa", "CA": "North America", "CV": "Africa", "KY": "North America", "CF": "Africa", "TD": "Africa", "CL": "South America", "CN": "Asia", "CX": "Asia", "CC": "Asia", "CO": "South America", "KM": "Africa", "CK": "Oceania", "CR": "North America", "HR": "Europe", "CU": "North America", "CW": "North America", "CY": "Asia", "CZ": "Europe", "CD": "Africa", "DK": "Europe", "DJ": "Africa", "DM": "North America", "DO": "North America", "EC": "South America", "EG": "Africa", "SV": "North America", "GQ": "Africa", "ER": "Africa", "EE": "Europe", "ET": "Africa", "FK": "South America", "FO": "Europe", "FJ": "Oceania", "FI": "Europe", "FR": "Europe", "GF": "South America", "PF": "Oceania", "GA": "Africa", "GM": "Africa", "GE": "Asia", "DE": "Europe", "GH": "Africa", "GI": "Europe", "GR": "Europe", "GL": "North America", "GD": "North America", "GP": "North America", "GU": "Oceania", "GT": "North America", "GG": "Europe", "GN": "Africa", "GW": "Africa", "GY": "South America", "HT": "North America", "HN": "North America", "HK": "Asia", "HU": "Europe", "IS": "Europe", "IN": "Asia", "ID": "Asia", "IR": "Asia", "IQ": "Asia", "IE": "Europe", "IM": "Europe", "IL": "Asia", "IT": "Europe", "CI": "Africa", "JM": "North America", "JP": "Asia", "JE": "Europe", "JO": "Asia", "KZ": "Asia", "KE": "Africa", "KI": "Oceania", "KW": "Asia", "KG": "Asia", "LA": "Asia", "LV": "Europe", "LB": "Asia", "LS": "Africa", "LR": "Africa", "LY": "Africa", "LI": "Europe", "LT": "Europe", "LU": "Europe", "MO": "Asia", "MK": "Europe", "MG": "Africa", "MW": "Africa", "MY": "Asia", "MV": "Asia", "ML": "Africa", "MT": "Europe", "MH": "Oceania", "MQ": "North America", "MR": "Africa", "MU": "Africa", "YT": "Africa", "MX": "North America", "FM": "Oceania", "MD": "Europe", "MC": "Europe", "MN": "Asia", "ME": "Europe", "MS": "North America", "MA": "Africa", "MZ": "Africa", "MM": "Asia", "NA": "Africa", "NR": "Oceania", "NP": "Asia", "NL": "Europe", "NC": "Oceania", "NZ": "Oceania", "NI": "North America", "NE": "Africa", "NG": "Africa", "NU": "Oceania", "NF": "Oceania", "KP": "Asia", "MP": "Oceania", "NO": "Europe", "OM": "Asia", "PK": "Asia", "PW": "Oceania", "PS": "Asia", "PA": "North America", "PG": "Oceania", "PY": "South America", "PE": "South America", "PH": "Asia", "PN": "Oceania", "PL": "Europe", "PT": "Europe", "PR": "North America", "QA": "Asia", "CG": "Africa", "RO": "Europe", "RU": "Europe", "RW": "Africa", "RE": "Africa", "BL": "North America", "SH": "Africa", "KN": "North America", "LC": "North America", "MF": "North America", "PM": "North America", "VC": "North America", "WS": "Oceania", "SM": "Europe", "ST": "Africa", "SA": "Asia", "SN": "Africa", "RS": "Europe", "SC": "Africa", "SL": "Africa", "SG": "Asia", "SX": "North America", "SK": "Europe", "SI": "Europe", "SB": "Oceania", "SO": "Africa", "ZA": "Africa", "GS": "Antarctica", "KR": "Asia", "SS": "Africa", "ES": "Europe", "LK": "Asia", "SD": "Africa", "SR": "South America", "SJ": "Europe", "SZ": "Africa", "SE": "Europe", "CH": "Europe", "SY": "Asia", "TW": "Asia", "TJ": "Asia", "TZ": "Africa", "TH": "Asia", "TL": "Asia", "TG": "Africa", "TK": "Oceania", "TO": "Oceania", "TT": "North America", "TN": "Africa", "TR": "Asia", "TM": "Asia", "TC": "North America", "TV": "Oceania", "UG": "Africa", "UA": "Europe", "AE": "Asia", "GB": "Europe", "US": "North America", "UM": "Oceania", "VI": "North America", "UY": "South America", "UZ": "Asia", "VU": "Oceania", "VA": "Europe", "VE": "South America", "VN": "Asia", "WF": "Oceania", "EH": "Africa", "YE": "Asia", "ZM": "Africa", "ZW": "Africa"
};

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

/**
 * Takes flight data, calculates all stats, and updates the DOM elements that it finds.
 */
function calculateAndDisplayStats(allFlights, airportData) {
    // This entire function is correct and does not need changes.
    // ... (The full contents of your existing, working function) ...
    if (!allFlights || allFlights.length === 0) return [];

    let totalKm = 0;
    const airportVisits = new Map();
    const routeFrequency = new Map();
    const uniqueYears = new Set();
    const monthCounts = Array(12).fill(0); // Array for month counts (0=Jan, 1=Feb, etc.)
    const weekdayCounts = Array(7).fill(0); // Array for weekday counts (0=Sun, 1=Mon, etc.)
    
    
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
        if (el) el.textContent = value;
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
                    backgroundColor: themeStyles.getPropertyValue('--md-sys-color-secondary-container').trim(),
                    borderColor: themeStyles.getPropertyValue('--md-sys-color-secondary').trim(),
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
                    backgroundColor: themeStyles.getPropertyValue('--md-sys-color-secondary-container').trim(),
                    borderColor: themeStyles.getPropertyValue('--md-sys-color-secondary').trim(),
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


    createCountryMap(uniqueCountries);
    createSunburstChart(allFlights, airportData);
    return [...uniqueYears].sort((a, b) => b - a);
}
