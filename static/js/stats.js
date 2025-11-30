// static/js/stats.js

// Global references to chart instances
let distanceChartInstance = null;
let seasonalityChartInstance = null;
let weekdayChartInstance = null;
let yearChartInstance = null; // NEW
let sunburstChartInstance = null;
let countryMapInstance = null;
let countryGeoJsonLayer = null;
let globalVisitedCountries = new Set();

// NOTE: countryToContinent is assumed to be loaded globally from utils.js or another file.

/**
 * Calculates distance between two lat/lng points in km using the Haversine formula.
 */
function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Helper to get current CSS variables
 */
function getThemeColors() {
    const styles = getComputedStyle(document.documentElement);
    return {
        primary: styles.getPropertyValue('--md-sys-color-primary').trim(),
        primaryContainer: styles.getPropertyValue('--md-sys-color-primary-container').trim(),
        onPrimaryContainer: styles.getPropertyValue('--md-sys-color-on-primary-container').trim(),
        secondary: styles.getPropertyValue('--md-sys-color-secondary').trim(),
        secondaryContainer: styles.getPropertyValue('--md-sys-color-secondary-container').trim(),
        tertiary: styles.getPropertyValue('--md-sys-color-tertiary').trim(),
        tertiaryContainer: styles.getPropertyValue('--md-sys-color-tertiary-container').trim(),
        surfaceVariant: styles.getPropertyValue('--md-sys-color-surface-variant').trim(),
        surfaceBorder: styles.getPropertyValue('--md-sys-color-surface').trim()
    };
}

async function createCountryMap(visitedCountries) {
    const mapElement = document.getElementById('country-map');
    if (!mapElement) return;

    if (!countryMapInstance) {
        countryMapInstance = L.map(mapElement, {
            center: [20, 0], zoom: 2, attributionControl: false,
            zoomControl: false, dragging: true, scrollWheelZoom: true
        });
    }

    const getStyle = (feature) => {
        const colors = getThemeColors();
        let countryCode = feature.properties.ISO_A2;
        if (countryCode === '-99' || !countryCode) countryCode = feature.properties.ISO_A2_EH;
        
        const isVisited = countryCode && visitedCountries.has(countryCode.toUpperCase());
        return {
            fillColor: isVisited ? colors.onPrimaryContainer : colors.surfaceVariant,
            weight: 1, opacity: 1,
            color: colors.primary, fillOpacity: 0.8
        };
    };

    if (countryGeoJsonLayer) {
        countryGeoJsonLayer.setStyle(getStyle);
    } else {
        try {
            const response = await fetch('/static/countries_with_a2.geojson');
            const geojsonData = await response.json();
            countryGeoJsonLayer = L.geoJSON(geojsonData, { style: getStyle }).addTo(countryMapInstance);
        } catch (error) {
            console.error("Failed to load GeoJSON data for country map:", error);
        }
    }
}

function createSunburstChart(allFlights, airportData) {
    const chartDom = document.getElementById('sunburst-chart');
    if (!chartDom) return;

    if (!sunburstChartInstance) {
        sunburstChartInstance = echarts.init(chartDom);
    }

    const hierarchy = {};
    const airportVisits = new Map();
    allFlights.forEach(flight => {
        airportVisits.set(flight.origin, (airportVisits.get(flight.origin) || 0) + 1);
        airportVisits.set(flight.destination, (airportVisits.get(flight.destination) || 0) + 1);
    });

    for (const [iata, count] of airportVisits.entries()) {
        const airport = airportData.get(iata);
        if (!airport || !airport.country || !airport.city) continue;
        
        // Ensure countryToContinent is available (loaded via utils.js or global scope)
        if (typeof countryToContinent === 'undefined') {
            console.warn("countryToContinent map not found!");
            continue;
        }

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

    const colors = getThemeColors();
    const option = {
        color: [colors.primary, colors.secondary, colors.tertiary, colors.primaryContainer, colors.secondaryContainer, colors.tertiaryContainer],
        series: {
            type: 'sunburst', data: echartsData, radius: [0, '95%'], sort: undefined,
            emphasis: { focus: 'ancestor' },
            levels: [{}, { r0: '15%', r: '40%', itemStyle: { borderWidth: 2, borderColor: colors.surfaceBorder }, label: { rotate: 'tangential' } },
                { r0: '40%', r: '70%', itemStyle: { borderColor: colors.surfaceBorder }, label: { align: 'right' } },
                { r0: '70%', r: '72%', label: { position: 'outside', padding: 3, silent: false }, itemStyle: { borderWidth: 3, borderColor: colors.surfaceBorder } }
            ]
        }
    };
    sunburstChartInstance.setOption(option);
    window.addEventListener('resize', () => sunburstChartInstance.resize());
}

function calculateAndDisplayStats(allFlights, airportData) {
    if (!allFlights || allFlights.length === 0) return { uniqueYears: [] };

    // 1. Data Processing
    let totalKm = 0;
    const airportVisits = new Map();
    const routeFrequency = new Map();
    const uniqueYears = new Set();
    const monthCounts = Array(12).fill(0);
    const weekdayCounts = Array(7).fill(0);
    const yearCounts = new Map(); // NEW: Track flights per year

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
        const month = flightDate.getMonth();
        const weekday = flightDate.getDay();
        
        uniqueYears.add(year);
        monthCounts[month]++;
        weekdayCounts[weekday]++;
        yearCounts.set(year, (yearCounts.get(year) || 0) + 1); // Increment year count

        const origin = airportData.get(flight.origin);
        const dest = airportData.get(flight.destination);
        let distance = 0;
        if (origin && dest && !isNaN(origin.lat) && !isNaN(dest.lat)) {
            distance = haversine(origin.lat, origin.lng, dest.lat, dest.lng);
            totalKm += distance;
        }
        
        cumulativeDistance += distance;
        chartData.push({x: flightCount, y: cumulativeDistance});

        for (let i = milestonesToFind.length - 1; i >= 0; i--) {
            if (cumulativeDistance >= milestonesToFind[i]) {
                milestones[milestonesToFind[i]] = flightCount;
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
    globalVisitedCountries = uniqueCountries;

    // 2. DOM Updates
    const updateText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
    const updateHtml = (id, value) => { const el = document.getElementById(id); if (el) el.innerHTML = value; };

    updateText('hero-flights', allFlights.length);
    updateText('hero-countries', uniqueCountries.size);
    updateText('hero-airports', uniqueAirports.length);
    updateText('hero-routes', routeFrequency.size);
    updateText('total-km', Math.round(totalKm).toLocaleString());
    updateText('total-miles', Math.round(totalKm / 1.60934).toLocaleString());
    updateText('earth-circumnavigations', (totalKm / 40075).toFixed(2));
    updateText('percent-to-moon', (totalKm / 384400 * 100).toFixed(2));

    const totalHours = totalKm / 850;
    updateText('total-hours', Math.round(totalHours).toLocaleString());
    updateText('total-days', (totalHours / 24).toFixed(1));
    updateText('total-weeks', (totalHours / 24 / 7).toFixed(1));
    updateText('total-months', (totalHours / 24 / 30.44).toFixed(1));

    const sortedByDist = [...allFlights].filter(f => f.distance > 0).sort((a, b) => a.distance - b.distance);
    if (sortedByDist.length > 0) {
        const shortest = sortedByDist[0];
        const longest = sortedByDist[sortedByDist.length - 1];
        updateHtml('shortest-flight-route', `${shortest.origin} &rarr; ${shortest.destination}`);
        updateText('shortest-flight-dist', `${Math.round(shortest.distance).toLocaleString()} km`);
        updateHtml('longest-flight-route', `${longest.origin} &rarr; ${longest.destination}`);
        updateText('longest-flight-dist', `${Math.round(longest.distance).toLocaleString()} km`);
    }

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

    // 3. Charts
    const colors = getThemeColors();

    // Distance Chart
    const chartCanvas = document.getElementById('distance-chart');
    if (chartCanvas) {
        if (distanceChartInstance) distanceChartInstance.destroy();
        distanceChartInstance = new Chart(chartCanvas, {
            type: 'line', data: { datasets: [{
                    label: 'Cumulative Distance', data: chartData,
                    borderColor: colors.primary, backgroundColor: colors.primaryContainer,
                    fill: true, tension: 0.4, pointRadius: 0
                }]},
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
                scales: { x: { display: true, grid: { color: colors.surfaceVariant } }, y: { display: true, grid: { color: colors.surfaceVariant }, ticks: { callback: (v) => `${(v/1000).toLocaleString()}k`} } }
            }
        });
    }

    // Seasonality Chart
    const seasonalityCanvas = document.getElementById('seasonality-chart');
    if (seasonalityCanvas) {
        if (seasonalityChartInstance) seasonalityChartInstance.destroy();
        seasonalityChartInstance = new Chart(seasonalityCanvas, {
            type: 'bar', data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [{ label: 'Flights', data: monthCounts, backgroundColor: colors.secondaryContainer, borderColor: colors.secondary, borderWidth: 1 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: colors.surfaceVariant } }, x: { grid: { display: false } } } }
        });
    }

    // Weekday Chart
    const weekdayCanvas = document.getElementById('weekday-chart');
    if (weekdayCanvas) {
        if (weekdayChartInstance) weekdayChartInstance.destroy();
        // Updated color to use PRIMARY to fix "wrong color" issue
        weekdayChartInstance = new Chart(weekdayCanvas, {
            type: 'bar', data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{ label: 'Flights', data: [...weekdayCounts.slice(1), weekdayCounts[0]], backgroundColor: colors.primaryContainer, borderColor: colors.primary, borderWidth: 1 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: colors.surfaceVariant } }, x: { grid: { display: false } } } }
        });
    }

    // NEW: Flights by Year Chart
    const yearCanvas = document.getElementById('yearly-chart');
    if (yearCanvas) {
        if (yearChartInstance) yearChartInstance.destroy();
        const sortedYears = [...uniqueYears].sort((a, b) => a - b); // Sort ascending for chart
        const yearData = sortedYears.map(y => yearCounts.get(y) || 0);
        
        yearChartInstance = new Chart(yearCanvas, {
            type: 'bar', data: {
                labels: sortedYears,
                datasets: [{ label: 'Flights', data: yearData, backgroundColor: colors.secondaryContainer, borderColor: colors.secondary, borderWidth: 1 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: colors.surfaceVariant } }, x: { grid: { display: false } } } }
        });
    }

    createCountryMap(uniqueCountries);
    createSunburstChart(allFlights, airportData);

    return { uniqueYears: [...uniqueYears].sort((a, b) => b - a) };
}

window.addEventListener('themeChanged', () => {
    const colors = getThemeColors();

    const updateChartColors = (chart, bgColor, borderColor) => {
        if (chart) {
            chart.data.datasets[0].backgroundColor = bgColor;
            chart.data.datasets[0].borderColor = borderColor;
            chart.options.scales.x.grid.color = colors.surfaceVariant;
            if (chart.options.scales.y) chart.options.scales.y.grid.color = colors.surfaceVariant;
            chart.update();
        }
    };

    updateChartColors(distanceChartInstance, colors.primaryContainer, colors.primary);
    updateChartColors(seasonalityChartInstance, colors.secondaryContainer, colors.secondary);
    updateChartColors(weekdayChartInstance, colors.primaryContainer, colors.primary);
    updateChartColors(yearChartInstance, colors.secondaryContainer, colors.secondary);

    if (sunburstChartInstance) {
        sunburstChartInstance.setOption({
            color: [ colors.primary, colors.secondary, colors.tertiary, colors.primaryContainer, colors.secondaryContainer, colors.tertiaryContainer ],
            series: { levels: [{}, { itemStyle: { borderColor: colors.surfaceBorder } }, { itemStyle: { borderColor: colors.surfaceBorder } }, { itemStyle: { borderColor: colors.surfaceBorder } }] }
        });
    }

    if (countryGeoJsonLayer) {
        countryGeoJsonLayer.setStyle((feature) => {
            let countryCode = feature.properties.ISO_A2;
            if (countryCode === '-99' || !countryCode) countryCode = feature.properties.ISO_A2_EH;
            const isVisited = countryCode && globalVisitedCountries.has(countryCode.toUpperCase());
            return { fillColor: isVisited ? colors.onPrimaryContainer : colors.surfaceVariant, weight: 1, opacity: 1, color: colors.primary, fillOpacity: 0.8 };
        });
    }
});