// Mock stress data for locations around Brisbane
function getStressColor(stressScore) {
    if (stressScore >= 80) return '#d32f2f';      // High stress - red
    if (stressScore >= 60) return '#f57c00';      // Medium-high - orange
    if (stressScore >= 40) return '#fbc02d';      // Medium - yellow
    if (stressScore >= 20) return '#7cb342';      // Low - light green
    return '#388e3c';                              // Very low - green
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
        window.expandedStressData = window.stressData;
        console.log('Loaded stress data:', window.stressData.length, 'locations (static demo version)');
    } catch (err) {
        console.error('Error loading stress data:', err);
        window.stressData = [];
        window.expandedStressData = [];
    }
})();