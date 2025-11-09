# DES222 - Stress Awareness Map
A realtime stress awareness map that utilises crowd-sourced data. 
The map displays various metrics such as crowd density and noise levels. These metrics are used to calculate a weighted average of the overall stress score of a particular location.
The website contains a seed database for the initial locations displayed on the map with provided noise and crowd metrics. This architecture can be expanded to support IoT integration with nodes in popular locations that listen and report for these metrics back to the database.
In addition to providing an initial data set, the website allows user's to report noise and crowd levels of their current location by filling out a simple form. The database and webpage are then updated to reflect these changes.
To avoid overlapping markers on the map with user-submitted data, the map API will merge points that are within a 50m radius of each other to avoid cluttering the map with large number of user submitted data.
The map will refresh automatically every 30 seconds.

# Installation

1. Install Flask

  ```$ pip install Flask ```

2. Install Flask-Cors

   ```$ pip install Flask-cors```

3. Ensure data.csv is preloaded with seed data

4. Run start-project.bat - This will open the backend api, front-end api and launch the map in your default browser.

The map API will automatically generate a SQLite database of the seed data provided in data.csv "/backend/data.csv".
Note: If the seed data in data.csv is to change, the database.db file in "/backend/database.db".

# Usage

To use this program, the user can navigate the map by using the mouse to drag. The user can also use the zoom buttons on the left side of the map to zoom in and out. The heatmap overlay is responsive to the zoom level, displaying the weighted average of the overall stress score per-location.
Clicking on a marker will reveal the source of the data, the noise and crowd score in addition to the calculated stress score. The information cards underneath the map display helpful information about whether the specified location is suitable to travel to based on the busyness metrics.

By default, seeded data uses interpolation to inflate the sample size of the seed data. The interpolation can be configured in "/backend/server.py". 5 extra points are interpolated around each pre-monitored location within a ~200m radius. This can be disabled by adjusting the "POINTS_PER_LOCATION" to 0.
Note: The database must be re-seeded after disabling interpolation by closing the program, deleting "/backend/database.db" and restarting the server. This should be done with caution as user-submitted data will be lost when re-seeding the initial dataset.

To provide user-submitted data to the API, the user can click the "Submit Location Data" button on the bottom right of their screen. This will prompt the user to allow the API to access their devices current location. From there, the user can give the marker a name and give a score between 0-100 for crowd density, noise level and overall stress score.
After submitting this data, the user may refresh the map with F5/Ctrl-F5 or by clicking the "Refresh Data" button located on the top right corner of the webpage. The user will be able to see their newly placed marker on the map with the metrics they provided.

The website will auto-refresh every 30 seconds and update the map with additional markers, allowing markers to appear on the map during peak hours of website usage.

# References

Leaflet - https://github.com/Leaflet/Leaflet

Leaflet.Heat - https://github.com/Leaflet/Leaflet.heat?tab=readme-ov-file

Flask - https://flask.palletsprojects.com/en/stable/

# License

MIT License
