// Mock stress data for locations around Brisbane

// Configurable parameters for interpolated points
const POINTS_PER_LOCATION = 5; // Number of extra points to plot
const SPREAD_RADIUS = 0.0035; //Distance from parent marker


// Base data, to be moved to database. Map.js should poll this hypothetical database.
// We could use long/lat coords off public lists, I know some exist for NZ.
// const stressData = [
//     {
//         id: 1,
//         name: "Queen Street Mall",
//         lat: -27.4698,
//         lng: 153.0251,
//         crowdDensity: 85,
//         noiseLevel: 78,
//         stressScore: 82 // Bogus data. Actual stress score should be calculated by a sum of crowdDensity and noiseLevel
//                         // I chose these numbers arbitrarily for testing and just moved points around.
//     },
    
//     {
//         id: 2,
//         name: "Central Station",
//         lat: -27.4654,
//         lng: 153.0268,
//         crowdDensity: 92,
//         noiseLevel: 88,
//         stressScore: 90
//     },
//     {
//         id: 3,
//         name: "Roma Street Parkland",
//         lat: -27.4627,
//         lng: 153.0183,
//         crowdDensity: 35,
//         noiseLevel: 42,
//         stressScore: 38
//     },
    
//     {
//         id: 4,
//         name: "South Bank Parklands",
//         lat: -27.4805,
//         lng: 153.0250,
//         crowdDensity: 30,
//         noiseLevel: 30,
//         stressScore: 25
//     },
    
//     {
//         id: 5,
//         name: "New Farm Park",
//         lat: -27.4676,
//         lng: 153.0506,
//         crowdDensity: 28,
//         noiseLevel: 35,
//         stressScore: 31
//     },
    
//     {
//         id: 6,
//         name: "Fortitude Valley",
//         lat: -27.4577,
//         lng: 153.0344,
//         crowdDensity: 75,
//         noiseLevel: 82,
//         stressScore: 78
//     },
    
//     {
//         id: 7,
//         name: "Westfield Chermside",
//         lat: -27.3854,
//         lng: 153.0351,
//         crowdDensity: 71,
//         noiseLevel: 68,
//         stressScore: 69
//     },
    
//     {
//         id: 8,
//         name: "Carindale Shopping Centre",
//         lat: -27.5008,
//         lng: 153.1020,
//         crowdDensity: 64,
//         noiseLevel: 62,
//         stressScore: 63
//     },
    
//     {
//         id: 9,
//         name: "UQ St Lucia Campus",
//         lat: -27.4975,
//         lng: 153.0137,
//         crowdDensity: 58,
//         noiseLevel: 55,
//         stressScore: 56
//     },
    
//     {
//         id: 10,
//         name: "QUT Gardens Point",
//         lat: -27.4772,
//         lng: 153.0286,
//         crowdDensity: 62,
//         noiseLevel: 58,
//         stressScore: 60
//     },
    
//     {
//         id: 11,
//         name: "Mount Coot-tha Botanic Gardens",
//         lat: -27.4769,
//         lng: 152.9761,
//         crowdDensity: 22,
//         noiseLevel: 25,
//         stressScore: 23
//     },
    
//     {
//         id: 12,
//         name: "Kangaroo Point Cliffs",
//         lat: -27.4786,
//         lng: 153.0388,
//         crowdDensity: 31,
//         noiseLevel: 48,
//         stressScore: 39
//     },
    
//     {
//         id: 13,
//         name: "Brisbane Airport",
//         lat: -27.3842,
//         lng: 153.1175,
//         crowdDensity: 81,
//         noiseLevel: 91,
//         stressScore: 86
//     },
    
//     {
//         id: 14,
//         name: "Toowong Village",
//         lat: -27.4842,
//         lng: 152.9901,
//         crowdDensity: 56,
//         noiseLevel: 59,
//         stressScore: 57
//     },
    
//     {
//         id: 15,
//         name: "West End Markets",
//         lat: -27.4819,
//         lng: 153.0098,
//         crowdDensity: 73,
//         noiseLevel: 71,
//         stressScore: 72
//     },
    
//     {
//         id: 16,
//         name: "South Bank Station",
//         lat: -27.481850,
//         lng: 153.023186,
//         crowdDensity: 66,
//         noiseLevel: 75,
//         stressScore: 70
//     },
    
//     {
//         id: 17,
//         name: "Teneriffe Park",
//         lat: -27.457871,
//         lng: 153.047204,
//         crowdDensity: 20,
//         noiseLevel: 20,
//         stressScore: 15
//     }
// ];

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

// Processed Data

// const expandedStressData = generateInterpolatedPoints(
//     stressData,
//     POINTS_PER_LOCATION,
//     SPREAD_RADIUS
// );
