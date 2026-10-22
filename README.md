# tfl-bus-times
Live TfL bus times tracker: finds the bus stops closest to you and shows live arrivals, using the official [TfL Unified API](https://api.tfl.gov.uk).

## How it works

| Step | What happens | Where in `app.js` |
|---|---|---|
| 1 | Your TfL app key is saved in your browser (`localStorage`) and added to every request | `tfl()` |
| 2 | The browser's Geolocation API gives your latitude and longitude | `getLocation()` |
| 3 | `GET /StopPoint?lat=…&lon=…&radius=400&stopTypes=NaptanPublicBusCoachTram` returns nearby stops, nearest first | `findNearbyStops()` |
| 4 | `GET /StopPoint/{naptanId}/Arrivals` returns live predictions; we sort by `timeToStation` (seconds) | `getArrivals()` |

## Run it

It's plain HTML, CSS and JavaScript with no build step. Open `index.html` in a browser, or serve the folder:

```
python3 -m http.server 8000
```

then visit http://localhost:8000. Location access needs `localhost` or HTTPS.

Get a free app key at [api-portal.tfl.gov.uk](https://api-portal.tfl.gov.uk). Never commit your key to this repo.
