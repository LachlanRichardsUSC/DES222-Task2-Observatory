class SubmissionManager {
    constructor() {
        this.API_BASE = 'http://localhost:5001/api';
        this.currentPosition = null;
        this.init();
    }

    init() {
        this.createSubmissionUI();
        this.attachEventListeners();
    }

    createSubmissionUI() {
        const submitBtn = document.createElement('button');
        submitBtn.id = 'submit-data-btn';
        submitBtn.className = 'submit-btn';
        submitBtn.innerHTML = '📍 Submit Location Data';
        
        const modal = document.createElement('div');
        modal.id = 'submission-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <h2>Submit Location Data</h2>
                
                <div id="location-status" class="status-message">
                    <p>📍 Requesting your location...</p>
                </div>
                
                <div id="submission-form" style="display: none;">
                    <div class="form-group">
                        <label for="location-name">Location Name (optional)</label>
                        <input type="text" id="location-name" placeholder="e.g., My Local Cafe">
                    </div>
                    
                    <div class="form-group">
                        <label for="crowd-slider">
                            Crowd Density: <span id="crowd-value">50</span>/100
                        </label>
                        <input type="range" id="crowd-slider" min="0" max="100" value="50">
                        <div class="slider-labels">
                            <span>Empty</span>
                            <span>Packed</span>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="noise-slider">
                            Noise Level: <span id="noise-value">50</span>/100
                        </label>
                        <input type="range" id="noise-slider" min="0" max="100" value="50">
                        <div class="slider-labels">
                            <span>Silent</span>
                            <span>Very Loud</span>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="stress-slider">
                            Overall Stress Score: <span id="stress-value">50</span>/100
                        </label>
                        <input type="range" id="stress-slider" min="0" max="100" value="50">
                        <div class="slider-labels">
                            <span>Very Calm</span>
                            <span>Very Stressful</span>
                        </div>
                    </div>
                    
                    <div class="location-info">
                        <p><strong>Your Location:</strong></p>
                        <p id="coords-display">Lat: --, Lng: --</p>
                    </div>
                    
                    <button id="submit-btn-final" class="btn-primary">Submit Data</button>
                    <p class="help-text">Your submission will help others make informed decisions about visiting this area.</p>
                </div>
                
                <div id="submission-result" style="display: none;"></div>
            </div>
        `;
        
        document.body.appendChild(submitBtn);
        document.body.appendChild(modal);
    }

    attachEventListeners() {
        const modal = document.getElementById('submission-modal');
        const submitBtn = document.getElementById('submit-data-btn');
        const closeBtn = modal.querySelector('.close-modal');
        const finalSubmitBtn = document.getElementById('submit-btn-final');

        // Open modal and get location
        submitBtn.addEventListener('click', () => {
            modal.style.display = 'block';
            this.requestLocation();
        });

        // Close modal
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            this.resetForm();
        });

        // Close on outside click
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
                this.resetForm();
            }
        });

        // Update slider values
        ['crowd', 'noise', 'stress'].forEach(type => {
            const slider = document.getElementById(`${type}-slider`);
            const display = document.getElementById(`${type}-value`);
            slider.addEventListener('input', () => {
                display.textContent = slider.value;
            });
        });

        // Submit data
        finalSubmitBtn.addEventListener('click', () => {
            this.submitData();
        });
    }

    requestLocation() {
        const statusDiv = document.getElementById('location-status');
        const formDiv = document.getElementById('submission-form');
        const resultDiv = document.getElementById('submission-result');

        statusDiv.style.display = 'block';
        formDiv.style.display = 'none';
        resultDiv.style.display = 'none';

        if (!navigator.geolocation) {
            statusDiv.innerHTML = '<p class="error">❌ Geolocation is not supported by your browser</p>';
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                this.currentPosition = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                statusDiv.style.display = 'none';
                formDiv.style.display = 'block';

                document.getElementById('coords-display').textContent =
                    `Lat: ${this.currentPosition.lat.toFixed(6)}, Lng: ${this.currentPosition.lng.toFixed(6)}`;
            },
            (error) => {
                let errorMsg = 'Unable to retrieve your location';
                if (error.code === error.PERMISSION_DENIED) {
                    errorMsg = '❌ Location permission denied. Please enable location access in your browser settings.';
                }
                statusDiv.innerHTML = `<p class="error">${errorMsg}</p>`;
            }
        );
    }

    async submitData() {
        const submitBtn = document.getElementById('submit-btn-final');
        const resultDiv = document.getElementById('submission-result');

        if (!this.currentPosition) {
            alert('Location not available. Please try again.');
            return;
        }

        // Get form values
        const data = {
            name: document.getElementById('location-name').value || `Location ${new Date().toLocaleTimeString()}`,
            lat: this.currentPosition.lat,
            lng: this.currentPosition.lng,
            crowdDensity: parseInt(document.getElementById('crowd-slider').value),
            noiseLevel: parseInt(document.getElementById('noise-slider').value),
            stressScore: parseInt(document.getElementById('stress-slider').value)
        };

        // Disable submit button
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        try {
            const response = await fetch(`${this.API_BASE}/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                resultDiv.style.display = 'block';
                resultDiv.className = 'success-message';
                resultDiv.innerHTML = `
                    <h3>✅ Submission Successful!</h3>
                    <p>${result.message}</p>
                    <p>Thank you for contributing to the community data.</p>
                    <button onclick="window.submissionManager.closeModalAndRefresh()">View on Map</button>
                `;

                document.getElementById('submission-form').style.display = 'none';
            } else {
                throw new Error(result.error || 'Submission failed');
            }
        } catch (error) {
            resultDiv.style.display = 'block';
            resultDiv.className = 'error-message';
            resultDiv.innerHTML = `
                <h3>❌ Submission Failed</h3>
                <p>${error.message}</p>
                <p>Please check that the backend server is running on http://localhost:5001</p>
            `;
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Data';
        }
    }

    closeModalAndRefresh() {
        document.getElementById('submission-modal').style.display = 'none';
        this.resetForm();

        // Trigger map refresh
        if (window.refreshMapData) {
            window.refreshMapData();
        }
    }

    resetForm() {
        document.getElementById('location-name').value = '';
        document.getElementById('crowd-slider').value = 50;
        document.getElementById('noise-slider').value = 50;
        document.getElementById('stress-slider').value = 50;
        document.getElementById('crowd-value').textContent = '50';
        document.getElementById('noise-value').textContent = '50';
        document.getElementById('stress-value').textContent = '50';

        document.getElementById('location-status').style.display = 'block';
        document.getElementById('submission-form').style.display = 'none';
        document.getElementById('submission-result').style.display = 'none';

        this.currentPosition = null;
    }
}

// Initialise when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.submissionManager = new SubmissionManager();
});