// static/js/stats.js

/**
 * Calculates distance between two lat/lng points in km using the Haversine formula.
 */
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

/**
 * Takes flight data and airport data, calculates all stats, and updates the DOM.
 * @param {Array} allFlights - The array of flight objects from the local database.
 * @param {Map} airportData - The map of airport IATA codes to their data.
 * @returns {Array} A sorted list of unique years for the filter chips.
 */
function calculateAndDisplayStats(allFlights, airportData) {
    if (allFlights.length === 0) return [];

    // --- 1. Process flights to gather raw data ---
    let totalKm = 0;
    const airportVisits = new Map();
    const routeFrequency = new Map();
    const uniqueYears = new Set();

    allFlights.forEach(flight => {
        const origin = airportData.get(flight.origin);
        const dest = airportData.get(flight.destination);

        if (origin && dest && !isNaN(origin.lat) && !isNaN(dest.lat)) {
            totalKm += haversine(origin.lat, origin.lng, dest.lat, dest.lng);
            const year = new Date(flight.date).getFullYear();
            uniqueYears.add(year);
        }
        
        airportVisits.set(flight.origin, (airportVisits.get(flight.origin) || 0) + 1);
        airportVisits.set(flight.destination, (airportVisits.get(flight.destination) || 0) + 1);
        
        const canonicalRoute = [flight.origin, flight.destination].sort().join('-');
        routeFrequency.set(canonicalRoute, (routeFrequency.get(canonicalRoute) || 0) + 1);
    });

    // --- 2. Calculate final stats ---
    const uniqueAirports = Array.from(airportVisits.keys());
    const uniqueCountries = new Set(uniqueAirports.map(iata => airportData.get(iata)?.country).filter(Boolean));
    const sortedAirports = [...airportVisits.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const sortedRoutes = [...routeFrequency.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const totalVisits = [...airportVisits.values()].reduce((sum, count) => sum + count, 0);

    // --- 3. Populate all HTML elements ---
    document.getElementById('hero-flights').textContent = allFlights.length;
    document.getElementById('hero-countries').textContent = uniqueCountries.size;
    document.getElementById('hero-airports').textContent = uniqueAirports.length;
    document.getElementById('hero-routes').textContent = routeFrequency.size;

    document.getElementById('total-km').textContent = Math.round(totalKm).toLocaleString();
    document.getElementById('total-miles').textContent = Math.round(totalKm / 1.60934).toLocaleString();
    document.getElementById('earth-circumnavigations').textContent = (totalKm / 40075).toFixed(2);
    document.getElementById('percent-to-moon').textContent = (totalKm / 384400 * 100).toFixed(2);

    const totalHours = totalKm / 850;
    const totalDays = totalHours / 24;
    document.getElementById('total-hours').textContent = Math.round(totalHours).toLocaleString();
    document.getElementById('total-days').textContent = totalDays.toFixed(1);
    document.getElementById('total-weeks').textContent = (totalDays / 7).toFixed(1);
    document.getElementById('total-months').textContent = (totalDays / 30.44).toFixed(1);

    const topAirportsList = document.getElementById('top-airports-list');
    topAirportsList.innerHTML = '';
    sortedAirports.forEach(([iata, count]) => {
        const percent = totalVisits > 0 ? (count / totalVisits * 100).toFixed(1) : 0;
        topAirportsList.innerHTML += `<li><b>${iata}</b>: ${count} visits (${percent}%)</li>`;
    });

    const topRoutesList = document.getElementById('top-routes-list');
    topRoutesList.innerHTML = '';
    sortedRoutes.forEach(([route, count]) => {
        topRoutesList.innerHTML += `<li><b>${route}</b>: ${count} times</li>`;
    });

    return [...uniqueYears].sort((a, b) => b - a);
}