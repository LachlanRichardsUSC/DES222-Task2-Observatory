document.addEventListener('DOMContentLoaded', function () {
    if (typeof L === 'undefined') {
        console.error('Leaflet not loaded.');
        return;
    }

    const infoCardOne = document.getElementById('info-card-one');
    const infoCardTwo = document.getElementById('info-card-two');
    const infoCardThree = document.getElementById('info-card-three');
    const infoCardFour = document.getElementById('info-card-four');

    // Initialise map centered on Brisbane
    var map = L.map('map').setView([-27.46860, 153.02230], 13);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        minZoom: 12,
        attribution: '© OpenStreetMap'
    }).addTo(map);

    // Use dataset for heatmap
    const heatmapData = expandedStressData.map(location => {
        return [
            location.lat,
            location.lng,
            location.stressScore / 100 // Normalize values between 0-1
        ];
    });

    // Create heatmap with gradient
    const heat = L.heatLayer(heatmapData, {
        radius: 35, // Large radius to compensate for small sample size
        blur: 25, //  Same applies for the blur
        maxZoom: 16,
        max: 1.0, 
        gradient: {
            0.4: 'blue',
            0.6: 'cyan',
            0.7: 'lime',
            0.8: 'yellow',
            1.0: 'red'
        },
        minOpacity: 0.4
    }).addTo(map);
    

// Create markers for key locations
    let selectedLocation = null;

// Create markers for points from dataset
    expandedStressData.forEach(location => {
        const isInterpolated = location.id.toString().includes('-');

        const marker = L.circleMarker([location.lat, location.lng], {
            radius: isInterpolated ? 3 : 5,  // 3 = interpolated location, 5 = parent location
            fillColor: getStressColor(location.stressScore),
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 1
        }).addTo(map);

        marker.bindPopup(`
        <strong>${location.name}</strong><br>
        ${isInterpolated ? '' : '<em>(Original Location)</em><br>'}
        Stress Score: ${location.stressScore}/100<br>
        Crowd: ${location.crowdDensity}% | Noise: ${location.noiseLevel}dB
    `);

        marker.on('click', function(e) {
            L.DomEvent.stopPropagation(e);
            selectedLocation = location;
            updateInfoCards(location);
        });
    });
    
    
    function updateInfoCards(location) {
        infoCardOne.innerHTML = `
            <h3>${location.name}</h3>
            <p>Overall Stress Level</p>
            <p style="font-size: 2rem; font-weight: bold; color: ${getStressColor(location.stressScore)}">
                ${location.stressScore}/100
            </p>
        `;

        infoCardTwo.innerHTML = `
            <h3>Crowd Density</h3>
            <p>${location.crowdDensity}%</p>
            <p style="font-size: 0.8rem; opacity: 0.8;">
                ${location.crowdDensity > 70 ? 'Very busy' : location.crowdDensity > 50 ? 'Moderate' : 'Quiet'}
            </p>
        `;

        infoCardThree.innerHTML = `
            <h3>Noise Level</h3>
            <p>${location.noiseLevel} dB</p>
            <p style="font-size: 0.8rem; opacity: 0.8;">
                ${location.noiseLevel > 75 ? 'Very loud' : location.noiseLevel > 55 ? 'Moderate' : 'Quiet'}
            </p>
        `;

        infoCardFour.innerHTML = `
            <h3>Recommendation</h3>
            <p>${getRecommendation(location.stressScore)}</p>
        `;
        
        
    }

    function getRecommendation(stressScore) {
        if (stressScore >= 80) return "❌ Avoid - High stress area";
        if (stressScore >= 60) return "⚠️ Caution - Moderate stress";
        if (stressScore >= 40) return "🟡 Fair - Some activity";
        if (stressScore >= 20) return "✅ Good - Low stress";
        return "🌳 Excellent - Very peaceful";
    }

    infoCardOne.innerHTML = '<h3>Overall Map</h3><p>Click any location marker to view details</p>';
    infoCardTwo.innerHTML = `<h3>Total Locations</h3><p>${stressData.length} monitored sites</p>`;
    infoCardThree.innerHTML = `<h3>Average Stress</h3><p>${Math.round(stressData.reduce((sum, loc) => sum + loc.stressScore, 0) / stressData.length)}/100</p>`;
    infoCardFour.innerHTML = '<h3>Data Source</h3><p>Mock community data</p>';
});