// Mock stress data for locations around Brisbane

// Configurable parameters for interpolated points
const POINTS_PER_LOCATION = 5; // Number of extra points to plot
const SPREAD_RADIUS = 0.0035; //Distance from parent marker

function getStressColor(stressScore) {
    if (stressScore >= 80) return '#d32f2f';      // High stress - red
    if (stressScore >= 60) return '#f57c00';      // Medium-high - orange
    if (stressScore >= 40) return '#fbc02d';      // Medium - yellow
    if (stressScore >= 20) return '#7cb342';      // Low - light green
    return '#388e3c';                              // Very low - green
}

/**
 * Generate interpolated points around each location for smoother heatmap
 * @param {Array} baseData - Array of base location objects
 * @param {number} pointsPerLocation - Number of interpolated points per location
 * @param {number} spreadRadius - Radius for spreading interpolated points
 * @returns {Array} Expanded data array with interpolated points
 */
function generateInterpolatedPoints(baseData, pointsPerLocation, spreadRadius) {
    const expandedData = [];

    baseData.forEach(location => {
        // Add the original point
        expandedData.push(location);

        // Generate random points around each location
        for (let i = 0; i < pointsPerLocation; i++) {
            // Random offset within radius
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * spreadRadius;

            const latOffset = Math.cos(angle) * distance;
            const lngOffset = Math.sin(angle) * distance;

            // Add 10% variance to stress score
            const stressVariation = location.stressScore * (0.9 + Math.random() * 0.2);

            expandedData.push({
                id: `${location.id}-${i}`,
                name: `${location.name}`,
                lat: location.lat + latOffset,
                lng: location.lng + lngOffset,
                crowdDensity: Math.round(Math.max(0, Math.min(100, location.crowdDensity + (Math.random() - 0.5) * 20))),
                noiseLevel: Math.round(Math.max(0, Math.min(100, location.noiseLevel + (Math.random() - 0.5) * 20))),
                stressScore: Math.round(Math.max(0, Math.min(100, stressVariation)))
            });
        }
    });

    return expandedData;
}

async function fetchCsv(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load CSV: ' + res.status);
    const text = await res.text();
    const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
    const header = lines.shift().split(',').map(h => h.trim());
    return lines.map(line => {
        const cols = line.split(',').map(c => c.trim());
        const obj = {};
        header.forEach((h, i) => {
            obj[h] = cols[i];
        });
        return {
            id: isNaN(Number(obj.id)) ? obj.id : Number(obj.id),
            name: obj.name,
            lat: parseFloat(obj.lat),
            lng: parseFloat(obj.lng),
            crowdDensity: parseInt(obj.crowdDensity, 10),
            noiseLevel: parseInt(obj.noiseLevel, 10),
            stressScore: parseInt(obj.stressScore, 10)
        };
    });
}

(async function initData() {
    try {
        const csvUrl = './data.csv';
        window.stressData = await fetchCsv(csvUrl);
        window.expandedStressData = generateInterpolatedPoints(window.stressData, POINTS_PER_LOCATION, SPREAD_RADIUS);
        console.log('Loaded stress data:', window.stressData.length, 'locations. Expanded to', window.expandedStressData.length);
    } catch (err) {
        console.error('Error loading stress data:', err);
        window.stressData = [];
        window.expandedStressData = [];
    }
})();