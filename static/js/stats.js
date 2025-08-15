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
 * Takes flight data, calculates all stats, and updates the DOM elements that it finds.
 * @param {Array} allFlights - The array of flight objects from the local database.
 * @param {Map} airportData - The map of airport IATA codes to their data.
 * @returns {Array} A sorted list of unique years for the filter chips.
 */
function calculateAndDisplayStats(allFlights, airportData) {
    if (!allFlights || allFlights.length === 0) return [];

    // --- 1. Process flights to gather raw data ---
    let totalKm = 0;
    const airportVisits = new Map();
    const routeFrequency = new Map();
    const uniqueYears = new Set();
    
    // Sort flights by date ascending to correctly calculate milestones
    const sortedFlights = [...allFlights].sort((a, b) => new Date(a.date) - new Date(b.date));

    const milestones = { 1000: 0, 10000: 0, 50000: 0, 100000: 0, 1000000: 0 };
    let cumulativeDistance = 0;
    let flightCount = 0;
    let milestonesToFind = Object.keys(milestones).map(Number);

    sortedFlights.forEach(flight => {
        flightCount++;
        const origin = airportData.get(flight.origin);
        const dest = airportData.get(flight.destination);
        let distance = 0;

        if (origin && dest && !isNaN(origin.lat) && !isNaN(dest.lat)) {
            distance = haversine(origin.lat, origin.lng, dest.lat, dest.lng);
            totalKm += distance;
            const year = new Date(flight.date).getFullYear();
            uniqueYears.add(year);
        }
        
        // Check for milestones
        cumulativeDistance += distance;
        for (let i = milestonesToFind.length - 1; i >= 0; i--) {
            const milestone = milestonesToFind[i];
            if (cumulativeDistance >= milestone) {
                milestones[milestone] = flightCount;
                milestonesToFind.splice(i, 1); // Remove found milestone so we don't check it again
            }
        }
        
        // Aggregate data for Top 10 lists (using the original unsorted list)
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

    // --- 3. Populate HTML elements (with safety checks) ---
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

    return [...uniqueYears].sort((a, b) => b - a);
}