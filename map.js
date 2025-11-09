document.addEventListener('DOMContentLoaded', () => {
    waitForData(10000, 100)
        .then(({ stressData, expandedStressData }) => initMapWithData(stressData, expandedStressData))
        .catch(err => {
            console.error('Timed out waiting for data:', err);
            initMapWithData(window.stressData || [], window.expandedStressData || []);
        });
});

function waitForData(timeoutMs = 10000, intervalMs = 100) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        (function check() {
            const sd = window.stressData;
            const esd = window.expandedStressData;
            if (Array.isArray(sd) && Array.isArray(esd)) {
                resolve({ stressData: sd, expandedStressData: esd });
                return;
            }
            if (Date.now() - start > timeoutMs) {
                reject(new Error('waitForData: timeout'));
                return;
            }
            setTimeout(check, intervalMs);
        })();
    });
}

function initMapWithData(stressData = [], expandedStressData = []) {
    if (typeof L === 'undefined') {
        console.error('Leaflet not loaded.');
        return;
    }

    const infoCardOne = document.getElementById('info-card-one');
    const infoCardTwo = document.getElementById('info-card-two');
    const infoCardThree = document.getElementById('info-card-three');
    const infoCardFour = document.getElementById('info-card-four');

    const map = L.map('map').setView([-27.46860, 153.02230], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        minZoom: 12,
        attribution: '© OpenStreetMap'
    }).addTo(map);

    if (!Array.isArray(expandedStressData) || expandedStressData.length === 0) {
        console.warn('No expandedStressData available; showing basic info.');
        populateInitialInfo(stressData, infoCardOne, infoCardTwo, infoCardThree, infoCardFour);
        return;
    }

    const heatmapData = expandedStressData.map(loc => [loc.lat, loc.lng, (loc.stressScore || 0) / 100]);

    if (typeof L.heatLayer === 'function') {
        L.heatLayer(heatmapData, {
            radius: 35,
            blur: 25,
            maxZoom: 16,
            max: 1.0,
            gradient: { 0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red' },
            minOpacity: 0.4
        }).addTo(map);
    } else {
        console.warn('Leaflet heat plugin not found; skipping heat layer.');
    }

    const stressColor = window.getStressColor || function (s = 0) {
        if (s >= 80) return '#d32f2f';
        if (s >= 60) return '#f57c00';
        if (s >= 40) return '#fbc02d';
        if (s >= 20) return '#7cb342';
        return '#388e3c';
    };

    expandedStressData.forEach(location => {
        if (typeof location.lat !== 'number' || typeof location.lng !== 'number') return;
        const isInterpolated = String(location.id).includes('-');

        const marker = L.circleMarker([location.lat, location.lng], {
            radius: isInterpolated ? 3 : 5,
            fillColor: stressColor(location.stressScore),
            color: '#fff',
            weight: 1,
            opacity: 1,
            fillOpacity: 1
        }).addTo(map);

        marker.bindPopup(`
            <strong>${escapeHtml(location.name || 'Location')}</strong><br>
            ${isInterpolated ? '' : '<em>(Original Location)</em><br>'}
            Stress Score: ${location.stressScore ?? 'N/A'}/100<br>
            Crowd: ${location.crowdDensity ?? 'N/A'}% | Noise: ${location.noiseLevel ?? 'N/A'} dB
        `);

        marker.on('click', () => updateInfoCards(location));
    });

    const latLngs = expandedStressData
        .filter(d => typeof d.lat === 'number' && typeof d.lng === 'number')
        .map(d => [d.lat, d.lng]);
    if (latLngs.length) map.fitBounds(latLngs, { padding: [40, 40] });

    populateInitialInfo(stressData, infoCardOne, infoCardTwo, infoCardThree, infoCardFour);
}

function populateInitialInfo(stressData = [], a, b, c, d) {
    a.innerHTML = '<h3>Overall Map</h3><p>Click any location marker to view details</p>';
    if (Array.isArray(stressData) && stressData.length) {
        b.innerHTML = `<h3>Total Locations</h3><p>${stressData.length} monitored sites</p>`;
        const avg = Math.round(stressData.reduce((sum, loc) => sum + (loc.stressScore || 0), 0) / stressData.length);
        c.innerHTML = `<h3>Average Stress</h3><p>${avg}/100</p>`;
    } else {
        b.innerHTML = `<h3>Total Locations</h3><p>N/A</p>`;
        c.innerHTML = `<h3>Average Stress</h3><p>N/A</p>`;
    }
    d.innerHTML = '<h3>Data Source</h3><p>Mock community data</p>';
}

function updateInfoCards(location) {
    const infoCardOne = document.getElementById('info-card-one');
    const infoCardTwo = document.getElementById('info-card-two');
    const infoCardThree = document.getElementById('info-card-three');
    const infoCardFour = document.getElementById('info-card-four');

    infoCardOne.innerHTML = `
        <h3>${escapeHtml(location.name || 'Location')}</h3>
        <p>Overall Stress Level</p>
        <p style="font-size: 2rem; font-weight: bold; color: ${getColorSafe(location.stressScore)}">
            ${location.stressScore ?? 'N/A'}/100
        </p>
    `;
    infoCardTwo.innerHTML = `
        <h3>Crowd Density</h3>
        <p>${location.crowdDensity ?? 'N/A'}%</p>
        <p style="font-size: 0.8rem; opacity: 0.8;">
            ${location.crowdDensity > 70 ? 'Very busy' : location.crowdDensity > 50 ? 'Moderate' : 'Quiet'}
        </p>
    `;
    infoCardThree.innerHTML = `
        <h3>Noise Level</h3>
        <p>${location.noiseLevel ?? 'N/A'} dB</p>
        <p style="font-size: 0.8rem; opacity: 0.8;">
            ${location.noiseLevel > 75 ? 'Very loud' : location.noiseLevel > 55 ? 'Moderate' : 'Quiet'}
        </p>
    `;
    infoCardFour.innerHTML = `
        <h3>Recommendation</h3>
        <p>${getRecommendation(location.stressScore)}</p>
    `;
}

function getColorSafe(score) {
    return (window.getStressColor || (s => {
        if (s >= 80) return '#d32f2f';
        if (s >= 60) return '#f57c00';
        if (s >= 40) return '#fbc02d';
        if (s >= 20) return '#7cb342';
        return '#388e3c';
    }))(score);
}

function getRecommendation(stressScore) {
    if (stressScore >= 80) return "❌ Avoid - High stress area";
    if (stressScore >= 60) return "⚠️ Caution - Moderate stress";
    if (stressScore >= 40) return "🟡 Fair - Some activity";
    if (stressScore >= 20) return "✅ Good - Low stress";
    return "🌳 Excellent - Very peaceful";
}

function escapeHtml(str = '') {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}