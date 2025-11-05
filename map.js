document.addEventListener('DOMContentLoaded', function () {
    if (typeof L === 'undefined') {
        console.error('Leaflet not loaded.');
        return;
    }

    const infoCardOne = document.getElementById('info-card-one');
    const infoCardTwo = document.getElementById('info-card-two');
    const infoCardThree = document.getElementById('info-card-three');
    const infoCardFour = document.getElementById('info-card-four');

    var map = L.map('map').setView([-27.46860, 153.02230], 13);

    infoCardOne.textContent = 'Test One';
    infoCardTwo.textContent = 'Test Two';
    infoCardThree.textContent = 'Test Three';
    infoCardFour.textContent = 'Test Four';

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(map);
});