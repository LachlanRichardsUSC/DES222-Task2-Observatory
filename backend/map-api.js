// map-api.js - Modified version that fetches from API instead of CSV

const API_BASE = 'http://localhost:5001/api';
let map = null;
let heatLayer = null;
let markersLayer = null;
let isInitialLoad = true;  // Track if this is the first data load
let currentOpenLocation = null;
let lastDataHash = null;

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadMapData();

    // Add refresh button
    addRefreshButton();

    // Auto-refresh every 30 seconds
    setInterval(() => {
        loadMapData(true);
    }, 30000);
});

function initMap() {
    if (typeof L === 'undefined') {
        console.error('Leaflet not loaded.');
        return;
    }

    map = L.map('map').setView([-27.46860, 153.02230], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        minZoom: 12,
        attribution: '© OpenStreetMap'
    }).addTo(map);

    // Create a layer group for markers
    markersLayer = L.layerGroup().addTo(map);

    map.on('click', function(e) {
        // Only reset if click wasn't on a marker
        if (!e.originalEvent.defaultPrevented) {
            resetInfoCards();
        }
    });
}

function addRefreshButton() {
    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'refresh-btn';
    refreshBtn.innerHTML = '🔄 Refresh Data';
    refreshBtn.onclick = () => loadMapData(false);
    document.body.appendChild(refreshBtn);

    // Make refresh function globally available
    window.refreshMapData = () => loadMapData(false);
}

async function loadMapData(silent = false) {
    if (!silent) {
        showLoadingState();
    }

    try {
        const response = await fetch(`${API_BASE}/locations`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success && result.locations) {
            console.log(`Loaded ${result.locations.length} locations from API`);

            // Check if data actually changed
            const newDataHash = JSON.stringify(result.locations);
            const dataChanged = newDataHash !== lastDataHash;
            lastDataHash = newDataHash;

            renderMap(result.locations, dataChanged);

            // Only update info cards if no specific location is selected
            if (!currentOpenLocation) {
                updateInfoCards(result.locations);
            }
        } else {
            throw new Error('Invalid API response');
        }
    } catch (error) {
        console.error('Error loading data from API:', error);
        showErrorState(error.message);
    }
}

function renderMap(locations, dataChanged = true) {
    if (!map) return;

    // Store reference to currently open popup if exists
    let shouldReopenPopup = false;
    let locationToReopen = null;

    if (currentOpenLocation && !dataChanged) {
        // Data hasn't changed, we should reopen the popup
        shouldReopenPopup = true;
        locationToReopen = locations.find(loc =>
            loc.id === currentOpenLocation.id ||
            (Math.abs(loc.lat - currentOpenLocation.lat) < 0.00001 &&
                Math.abs(loc.lng - currentOpenLocation.lng) < 0.00001)
        );

        // Check if the specific location's data changed
        if (locationToReopen && JSON.stringify(locationToReopen) !== JSON.stringify(currentOpenLocation)) {
            shouldReopenPopup = false;  // Data changed for this location, don't reopen
            currentOpenLocation = null;
        }
    }

    // Clear existing markers
    markersLayer.clearLayers();

    // Remove existing heatmap
    if (heatLayer) {
        map.removeLayer(heatLayer);
    }

    // Prepare heatmap data
    const heatmapData = locations.map(loc => [
        loc.lat,
        loc.lng,
        (loc.stressScore || 0) / 100
    ]);

    // Add heatmap layer
    if (typeof L.heatLayer === 'function') {
        heatLayer = L.heatLayer(heatmapData, {
            radius: 35,
            blur: 25,
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
    }

    let markerToReopen = null;

    // Add markers for each location
    locations.forEach(location => {
        if (typeof location.lat !== 'number' || typeof location.lng !== 'number') return;

        const isUserSubmitted = location.source === 'user';
        const markerColor = getStressColor(location.stressScore);

        const marker = L.circleMarker([location.lat, location.lng], {
            radius: isUserSubmitted ? 6 : 5,
            fillColor: markerColor,
            color: isUserSubmitted ? '#fff' : '#fff',
            weight: isUserSubmitted ? 2 : 1,
            opacity: 1,
            fillOpacity: isUserSubmitted ? 0.9 : 0.8
        }).addTo(markersLayer);

        const timeAgo = location.timestamp ? formatTimeAgo(location.timestamp) : '';

        marker.bindPopup(`
            <strong>${escapeHtml(location.name || 'Location')}</strong><br>
            ${isUserSubmitted ? '<em style="color: #667eea;">👤 User Submitted</em><br>' : '<em>📍 Monitored Location</em><br>'}
            ${timeAgo ? `<small style="opacity: 0.8;">Updated ${timeAgo}</small><br>` : ''}
            <br>
            <strong>Stress Score:</strong> ${location.stressScore ?? 'N/A'}/100<br>
            <strong>Crowd:</strong> ${location.crowdDensity ?? 'N/A'}%<br>
            <strong>Noise:</strong> ${location.noiseLevel ?? 'N/A'} dB
        `);

        marker.on('click', (e) => {
            L.DomEvent.stopPropagation(e);  // Prevent map click event
            currentOpenLocation = location;
            updateInfoCardsForLocation(location);
        });

        marker.on('popupclose', () => {
            // Only clear if this was the currently tracked location
            if (currentOpenLocation && currentOpenLocation.id === location.id) {
                currentOpenLocation = null;
                resetInfoCards();
            }
        });

        // Check if this is the marker we need to reopen
        if (shouldReopenPopup && locationToReopen && locationToReopen.id === location.id) {
            markerToReopen = marker;
        }
    });

    // Reopen popup if needed
    if (markerToReopen && shouldReopenPopup) {
        setTimeout(() => {
            markerToReopen.openPopup();
        }, 100);
    }

    // Fit map to show all markers (only on initial load)
    if (isInitialLoad) {
        const latLngs = locations
            .filter(d => typeof d.lat === 'number' && typeof d.lng === 'number')
            .map(d => [d.lat, d.lng]);

        if (latLngs.length) {
            map.fitBounds(latLngs, { padding: [40, 40] });
        }
        isInitialLoad = false;
    }
}
function resetInfoCards() {
    // Fetch current data and show default overview
    fetch(`${API_BASE}/locations`)
        .then(response => response.json())
        .then(result => {
            if (result.success && result.locations) {
                updateInfoCards(result.locations);
            }
        })
        .catch(err => console.error('Error resetting info cards:', err));
}
function updateInfoCards(locations) {
    const infoCardOne = document.getElementById('info-card-one');
    const infoCardTwo = document.getElementById('info-card-two');
    const infoCardThree = document.getElementById('info-card-three');
    const infoCardFour = document.getElementById('info-card-four');

    if (!locations || locations.length === 0) {
        infoCardOne.innerHTML = '<h3>No Data</h3><p>No locations available</p>';
        return;
    }

    // Calculate statistics
    const totalLocations = locations.length;
    const userSubmissions = locations.filter(l => l.source === 'user').length;
    const avgStress = Math.round(
        locations.reduce((sum, loc) => sum + (loc.stressScore || 0), 0) / totalLocations
    );

    // Find most recent update
    const mostRecent = locations.reduce((latest, loc) => {
        if (!latest) return loc;
        return new Date(loc.timestamp) > new Date(latest.timestamp) ? loc : latest;
    }, null);

    const lastUpdateTime = mostRecent ? formatTimeAgo(mostRecent.timestamp) : 'Unknown';

    infoCardOne.innerHTML = `
        <h3>Live Map Overview</h3>
        <p style="font-size: 0.9rem;">Click any marker for details</p>
        <p style="font-size: 0.85rem; opacity: 0.8; margin-top: 8px;">
            🔄 Last update: ${lastUpdateTime}
        </p>
    `;

    infoCardTwo.innerHTML = `
        <h3>Total Locations</h3>
        <p style="font-size: 1.8rem; font-weight: bold; margin: 8px 0;">${totalLocations}</p>
        <p style="font-size: 0.85rem; opacity: 0.8;">
            ${userSubmissions} user submission${userSubmissions !== 1 ? 's' : ''}
        </p>
    `;

    infoCardThree.innerHTML = `
        <h3>Average Stress</h3>
        <p style="font-size: 1.8rem; font-weight: bold; margin: 8px 0; color: ${getStressColor(avgStress)}">
            ${avgStress}/100
        </p>
        <p style="font-size: 0.85rem; opacity: 0.8;">
            ${getStressLabel(avgStress)}
        </p>
    `;

    infoCardFour.innerHTML = `
        <h3>Community Data</h3>
        <p style="font-size: 0.9rem;">Help others by submitting your location's current conditions</p>
    `;
}

function updateInfoCardsForLocation(location) {
    const infoCardOne = document.getElementById('info-card-one');
    const infoCardTwo = document.getElementById('info-card-two');
    const infoCardThree = document.getElementById('info-card-three');
    const infoCardFour = document.getElementById('info-card-four');

    const timeAgo = location.timestamp ? formatTimeAgo(location.timestamp) : '';

    infoCardOne.innerHTML = `
        <h3>${escapeHtml(location.name || 'Location')}</h3>
        ${location.source === 'user' ? '<p style="color: #667eea; font-size: 0.85rem;">👤 User Submitted</p>' : ''}
        <p style="font-size: 2rem; font-weight: bold; color: ${getStressColor(location.stressScore)}; margin: 12px 0;">
    ${location.stressScore ?? 'N/A'}/100
    </p>
        ${timeAgo ? `<p style="font-size: 0.8rem; opacity: 0.8;">Updated ${timeAgo}</p>` : ''}
    `;

    infoCardTwo.innerHTML = `
        <h3>Crowd Density</h3>
        <p style="font-size: 1.8rem; font-weight: bold; margin: 12px 0;">${location.crowdDensity ?? 'N/A'}%</p>
        <p style="font-size: 0.8rem; opacity: 0.8;">
            ${getCrowdLabel(location.crowdDensity)}
        </p>
    `;

    infoCardThree.innerHTML = `
        <h3>Noise Level</h3>
        <p style="font-size: 1.8rem; font-weight: bold; margin: 12px 0;">${location.noiseLevel ?? 'N/A'} dB</p>
        <p style="font-size: 0.8rem; opacity: 0.8;">
            ${getNoiseLabel(location.noiseLevel)}
        </p>
    `;

    infoCardFour.innerHTML = `
        <h3>Recommendation</h3>
        <p style="font-size: 1.1rem; margin-top: 12px;">${getRecommendation(location.stressScore)}</p>
    `;
}

// Helper functions
function getStressColor(score) {
    if (score >= 80) return '#d32f2f';
    if (score >= 60) return '#f57c00';
    if (score >= 40) return '#fbc02d';
    if (score >= 20) return '#7cb342';
    return '#388e3c';
}

function getStressLabel(score) {
    if (score >= 80) return 'Very High Stress';
    if (score >= 60) return 'High Stress';
    if (score >= 40) return 'Moderate Stress';
    if (score >= 20) return 'Low Stress';
    return 'Very Low Stress';
}

function getCrowdLabel(crowd) {
    if (crowd > 80) return 'Extremely busy';
    if (crowd > 60) return 'Very busy';
    if (crowd > 40) return 'Moderately busy';
    if (crowd > 20) return 'Some people';
    return 'Very quiet';
}

function getNoiseLabel(noise) {
    if (noise > 80) return 'Extremely loud';
    if (noise > 60) return 'Very loud';
    if (noise > 40) return 'Moderate noise';
    if (noise > 20) return 'Quiet';
    return 'Very quiet';
}

function getRecommendation(stressScore) {
    if (stressScore >= 80) return "❌ Avoid - High stress area";
    if (stressScore >= 60) return "⚠️ Caution - Moderate stress";
    if (stressScore >= 40) return "🟡 Fair - Some activity";
    if (stressScore >= 20) return "✅ Good - Low stress";
    return "🌳 Excellent - Very peaceful";
}

function formatTimeAgo(timestamp) {
    if (!timestamp) return '';
    
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

function escapeHtml(str = '') {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function showLoadingState() {
    const infoCardOne = document.getElementById('info-card-one');
    if (infoCardOne) {
        infoCardOne.innerHTML = '<h3>Loading...</h3><p>Fetching latest data</p>';
    }
}

function showErrorState(errorMsg) {
    const infoCardOne = document.getElementById('info-card-one');
    if (infoCardOne) {
        infoCardOne.innerHTML = `
    <h3>Connection Error</h3>
    <p style="font-size: 0.85rem;">Unable to load data from server</p>
    <p style="font-size: 0.75rem; opacity: 0.7; margin-top: 8px;">
    Make sure the backend is running on http://localhost:5001
    </p>
    `;
    }
}