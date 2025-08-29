// static/js/utils.js



/**
 * Calculates a series of points along a great-circle arc for drawing curved lines.
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

