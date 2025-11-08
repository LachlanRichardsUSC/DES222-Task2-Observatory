from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import csv
from datetime import datetime, timedelta
import os
import random
import math

app = Flask(__name__)
CORS(app)  # Enable CORS for local development

DB_PATH = 'database.db'

# Interpolation settings
POINTS_PER_LOCATION = 5  # Number of extra points to plot around each location
SPREAD_RADIUS = 0.0035   # Distance from parent marker

def generate_interpolated_points(base_location):
    """Generate interpolated points around a base location for smoother heatmap"""
    interpolated = []
    
    for i in range(POINTS_PER_LOCATION):
        # Random offset within radius
        angle = random.random() * math.pi * 2
        distance = random.random() * SPREAD_RADIUS
        
        lat_offset = math.cos(angle) * distance
        lng_offset = math.sin(angle) * distance
        
        # Add 10% variance to stress score
        stress_variation = base_location['stressScore'] * (0.9 + random.random() * 0.2)
        
        interpolated.append({
            'name': base_location['name'],
            'lat': base_location['lat'] + lat_offset,
            'lng': base_location['lng'] + lng_offset,
            'crowdDensity': round(max(0, min(100, base_location['crowdDensity'] + (random.random() - 0.5) * 20))),
            'noiseLevel': round(max(0, min(100, base_location['noiseLevel'] + (random.random() - 0.5) * 20))),
            'stressScore': round(max(0, min(100, stress_variation)))
        })
    
    return interpolated

def init_database():
    """Initialize database with schema and seed data from CSV"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create locations table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS locations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            lat REAL NOT NULL,
            lng REAL NOT NULL,
            crowdDensity INTEGER,
            noiseLevel INTEGER,
            stressScore INTEGER,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            source TEXT DEFAULT 'seed'
        )
    ''')
    
    # Check if we need to seed data
    cursor.execute('SELECT COUNT(*) FROM locations')
    count = cursor.fetchone()[0]
    
    if count == 0:
        print("Seeding database with initial data from CSV...")
        # Load seed data from the CSV file in the project directory
        csv_path = 'data.csv'
        if os.path.exists(csv_path):
            base_locations = []
            with open(csv_path, 'r') as f:
                csv_reader = csv.DictReader(f)
                for row in csv_reader:
                    base_loc = {
                        'name': row['name'].strip(),
                        'lat': float(row['lat']),
                        'lng': float(row['lng']),
                        'crowdDensity': int(row['crowdDensity']),
                        'noiseLevel': int(row['noiseLevel']),
                        'stressScore': int(row['stressScore'])
                    }
                    base_locations.append(base_loc)
                    
                    # Insert the original location
                    cursor.execute('''
                        INSERT INTO locations (name, lat, lng, crowdDensity, noiseLevel, stressScore, source)
                        VALUES (?, ?, ?, ?, ?, ?, 'seed')
                    ''', (
                        base_loc['name'],
                        base_loc['lat'],
                        base_loc['lng'],
                        base_loc['crowdDensity'],
                        base_loc['noiseLevel'],
                        base_loc['stressScore']
                    ))
                    
                    # Generate and insert interpolated points
                    interpolated_points = generate_interpolated_points(base_loc)
                    for point in interpolated_points:
                        cursor.execute('''
                            INSERT INTO locations (name, lat, lng, crowdDensity, noiseLevel, stressScore, source)
                            VALUES (?, ?, ?, ?, ?, ?, 'interpolated')
                        ''', (
                            point['name'],
                            point['lat'],
                            point['lng'],
                            point['crowdDensity'],
                            point['noiseLevel'],
                            point['stressScore']
                        ))
            
            print(f"Seeded {len(base_locations)} base locations with {POINTS_PER_LOCATION} interpolated points each")
            print(f"Total locations in database: {len(base_locations) * (1 + POINTS_PER_LOCATION)}")
        else:
            print("Warning: CSV file not found for seeding")
    
    conn.commit()
    conn.close()
    print("Database initialized successfully")

def get_db_connection():
    """Create a database connection"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def calculate_distance(lat1, lng1, lat2, lng2):
    """Calculate approximate distance in meters between two coordinates"""
    # Simple approximation for short distances
    lat_diff = abs(lat1 - lat2) * 111000  # ~111km per degree latitude
    lng_diff = abs(lng1 - lng2) * 111000 * 0.85  # Brisbane is ~27° latitude
    return (lat_diff**2 + lng_diff**2) ** 0.5

def find_nearby_location(lat, lng, radius_meters=50):
    """Find if there's an existing location within radius"""
    conn = get_db_connection()
    locations = conn.execute('SELECT * FROM locations WHERE source = "seed"').fetchall()
    conn.close()
    
    for location in locations:
        distance = calculate_distance(lat, lng, location['lat'], location['lng'])
        if distance <= radius_meters:
            return dict(location)
    return None

@app.route('/api/locations', methods=['GET'])
def get_all_locations():
    """Get all locations (seed + user submissions)"""
    try:
        conn = get_db_connection()
        
        # Get all locations
        locations = conn.execute('''
            SELECT id, name, lat, lng, crowdDensity, noiseLevel, stressScore, 
                   timestamp, source
            FROM locations
            ORDER BY timestamp DESC
        ''').fetchall()
        
        conn.close()
        
        # Convert to list of dicts
        result = []
        for loc in locations:
            result.append({
                'id': loc['id'],
                'name': loc['name'],
                'lat': loc['lat'],
                'lng': loc['lng'],
                'crowdDensity': loc['crowdDensity'],
                'noiseLevel': loc['noiseLevel'],
                'stressScore': loc['stressScore'],
                'timestamp': loc['timestamp'],
                'source': loc['source']
            })
        
        return jsonify({
            'success': True,
            'count': len(result),
            'locations': result
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/recent', methods=['GET'])
def get_recent_locations():
    """Get locations updated in the last hour"""
    try:
        # Calculate time 1 hour ago
        one_hour_ago = (datetime.now() - timedelta(hours=1)).strftime('%Y-%m-%d %H:%M:%S')
        
        conn = get_db_connection()
        
        locations = conn.execute('''
            SELECT id, name, lat, lng, crowdDensity, noiseLevel, stressScore, 
                   timestamp, source
            FROM locations
            WHERE timestamp >= ?
            ORDER BY timestamp DESC
        ''', (one_hour_ago,)).fetchall()
        
        conn.close()
        
        result = []
        for loc in locations:
            result.append({
                'id': loc['id'],
                'name': loc['name'],
                'lat': loc['lat'],
                'lng': loc['lng'],
                'crowdDensity': loc['crowdDensity'],
                'noiseLevel': loc['noiseLevel'],
                'stressScore': loc['stressScore'],
                'timestamp': loc['timestamp'],
                'source': loc['source']
            })
        
        return jsonify({
            'success': True,
            'count': len(result),
            'timeframe': 'last_hour',
            'locations': result
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/submit', methods=['POST'])
def submit_location():
    """Accept user submission of location data"""
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['lat', 'lng', 'crowdDensity', 'noiseLevel', 'stressScore']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False, 
                    'error': f'Missing required field: {field}'
                }), 400
        
        lat = float(data['lat'])
        lng = float(data['lng'])
        crowd = int(data['crowdDensity'])
        noise = int(data['noiseLevel'])
        stress = int(data['stressScore'])
        
        # Validate ranges
        if not (0 <= crowd <= 100 and 0 <= noise <= 100 and 0 <= stress <= 100):
            return jsonify({
                'success': False,
                'error': 'Values must be between 0 and 100'
            }), 400
        
        # Check if near an existing seed location
        nearby = find_nearby_location(lat, lng, radius_meters=100)
        
        conn = get_db_connection()
        
        if nearby:
            # Update existing location with averaged values
            # Get recent submissions for this location
            recent_submissions = conn.execute('''
                SELECT crowdDensity, noiseLevel, stressScore 
                FROM locations 
                WHERE id = ? OR (
                    ABS(lat - ?) < 0.001 AND 
                    ABS(lng - ?) < 0.001 AND
                    timestamp >= datetime('now', '-1 hour')
                )
            ''', (nearby['id'], lat, lng)).fetchall()
            
            # Calculate new averages
            all_crowd = [r['crowdDensity'] for r in recent_submissions] + [crowd]
            all_noise = [r['noiseLevel'] for r in recent_submissions] + [noise]
            all_stress = [r['stressScore'] for r in recent_submissions] + [stress]
            
            avg_crowd = round(sum(all_crowd) / len(all_crowd))
            avg_noise = round(sum(all_noise) / len(all_noise))
            avg_stress = round(sum(all_stress) / len(all_stress))
            
            # Update the seed location
            cursor = conn.execute('''
                UPDATE locations 
                SET crowdDensity = ?, noiseLevel = ?, stressScore = ?, 
                    timestamp = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (avg_crowd, avg_noise, avg_stress, nearby['id']))
            
            conn.commit()
            
            location_id = nearby['id']
            location_name = nearby['name']
            message = f"Updated existing location: {location_name}"
            
        else:
            # Create new location
            location_name = data.get('name', f"User Location {datetime.now().strftime('%H:%M')}")
            
            cursor = conn.execute('''
                INSERT INTO locations (name, lat, lng, crowdDensity, noiseLevel, stressScore, source)
                VALUES (?, ?, ?, ?, ?, ?, 'user')
            ''', (location_name, lat, lng, crowd, noise, stress))
            
            conn.commit()
            
            location_id = cursor.lastrowid
            message = "New location added"
        
        conn.close()
        
        return jsonify({
            'success': True,
            'message': message,
            'location': {
                'id': location_id,
                'name': location_name,
                'lat': lat,
                'lng': lng,
                'crowdDensity': crowd if not nearby else avg_crowd,
                'noiseLevel': noise if not nearby else avg_noise,
                'stressScore': stress if not nearby else avg_stress
            }
        })
    
    except ValueError as e:
        return jsonify({'success': False, 'error': 'Invalid data format'}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get statistics about the data"""
    try:
        conn = get_db_connection()
        
        stats = conn.execute('''
            SELECT 
                COUNT(*) as total_locations,
                COUNT(CASE WHEN source = 'seed' THEN 1 END) as seed_locations,
                COUNT(CASE WHEN source = 'user' THEN 1 END) as user_submissions,
                AVG(stressScore) as avg_stress,
                MAX(timestamp) as last_update
            FROM locations
        ''').fetchone()
        
        conn.close()
        
        return jsonify({
            'success': True,
            'stats': {
                'total_locations': stats['total_locations'],
                'seed_locations': stats['seed_locations'],
                'user_submissions': stats['user_submissions'],
                'average_stress': round(stats['avg_stress'], 1) if stats['avg_stress'] else 0,
                'last_update': stats['last_update']
            }
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/', methods=['GET'])
def index():
    """API info endpoint"""
    return jsonify({
        'name': 'Brisbane Stress Map API',
        'version': '1.0',
        'endpoints': {
            'GET /api/locations': 'Get all locations',
            'GET /api/recent': 'Get locations from last hour',
            'POST /api/submit': 'Submit new location data',
            'GET /api/stats': 'Get statistics'
        }
    })

if __name__ == '__main__':
    print("Initializing Brisbane Stress Map API...")
    init_database()
    print("\nStarting server on http://localhost:5001")
    print("API Endpoints:")
    print("  - GET  http://localhost:5001/api/locations")
    print("  - GET  http://localhost:5001/api/recent")
    print("  - POST http://localhost:5001/api/submit")
    print("  - GET  http://localhost:5001/api/stats")
    app.run(debug=True, host='0.0.0.0', port=5001)