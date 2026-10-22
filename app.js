// Nearby Bus Times: finds the closest TfL bus stops and shows live arrivals.
// TfL Unified API docs: https://api.tfl.gov.uk

const API = "https://api.tfl.gov.uk";
const SEARCH_RADIUS_METRES = 400;
const MAX_STOPS = 5;
const DEMO_LOCATION = { lat: 51.5080, lon: -0.1281 }; // Trafalgar Square

const keyInput = document.getElementById("api-key");
const statusEl = document.getElementById("status");
const stopsEl = document.getElementById("stops");

// --- Step 1: remember the API key in this browser only ---

keyInput.value = localStorage.getItem("tflKey") || "";
document.getElementById("save-key").addEventListener("click", () => {
  localStorage.setItem("tflKey", keyInput.value.trim());
  setStatus("Key saved in this browser.");
});

// Every TfL request goes through here, so the key is added in one place.
async function tfl(path, params = {}) {
  const url = new URL(API + path);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  const key = localStorage.getItem("tflKey");
  if (key) url.searchParams.set("app_key", key);

  const response = await fetch(url);
  if (!response.ok) throw new Error(`TfL returned ${response.status} for ${path}`);
  return response.json();
}

// --- Step 2: get the user's location from the browser ---

function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("This browser can't share its location."));
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lon: position.coords.longitude }),
      () => reject(new Error("Location permission was refused, so I can't find nearby stops.")),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

// --- Step 3: find the bus stops closest to a location ---

async function findNearbyStops({ lat, lon }) {
  const data = await tfl("/StopPoint", {
    lat,
    lon,
    radius: SEARCH_RADIUS_METRES,
    stopTypes: "NaptanPublicBusCoachTram",
    modes: "bus",
  });
  // TfL returns the stops sorted by distance, nearest first.
  return data.stopPoints.slice(0, MAX_STOPS);
}

// --- Step 4: live arrivals for one stop, soonest first ---

async function getArrivals(stopId) {
  const arrivals = await tfl(`/StopPoint/${stopId}/Arrivals`);
  return arrivals.sort((a, b) => a.timeToStation - b.timeToStation);
}

// --- Putting it on the page ---

function setStatus(message) {
  statusEl.textContent = message;
}

function formatDue(seconds) {
  const minutes = Math.floor(seconds / 60);
  return minutes < 1 ? "Due" : `${minutes} min`;
}

function renderStop(stop, arrivals) {
  const card = document.createElement("section");
  card.className = "card stop";

  const letter = stop.stopLetter ? `<span class="stop-letter">${escapeHtml(stop.stopLetter)}</span>` : "";
  const towards = stop.additionalProperties?.find((p) => p.key === "Towards")?.value;

  card.innerHTML = `
    <h2>${letter}${escapeHtml(stop.commonName)}</h2>
    <p class="meta">${Math.round(stop.distance)} m away${towards ? ` · towards ${escapeHtml(towards)}` : ""}</p>
  `;

  const list = document.createElement("ul");
  list.className = "arrivals";
  if (arrivals.length === 0) {
    list.innerHTML = `<li>No buses expected right now.</li>`;
  }
  for (const bus of arrivals.slice(0, 6)) {
    const item = document.createElement("li");
    item.innerHTML = `
      <span class="route">${escapeHtml(bus.lineName)}</span>
      <span class="dest">${escapeHtml(bus.destinationName)}</span>
      <span class="due">${formatDue(bus.timeToStation)}</span>
    `;
    list.appendChild(item);
  }
  card.appendChild(list);
  return card;
}

// Text from an API should never be inserted as raw HTML.
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

async function showBusesNear(location) {
  stopsEl.innerHTML = "";
  setStatus("Looking for nearby bus stops…");
  try {
    const stops = await findNearbyStops(location);
    if (stops.length === 0) {
      setStatus(`No TfL bus stops within ${SEARCH_RADIUS_METRES} m. Are you inside London?`);
      return;
    }
    setStatus(`Fetching live arrivals for ${stops.length} stops…`);
    // Ask TfL for all stops at once instead of one after another.
    const allArrivals = await Promise.all(stops.map((stop) => getArrivals(stop.naptanId)));
    stops.forEach((stop, i) => stopsEl.appendChild(renderStop(stop, allArrivals[i])));
    setStatus(`Updated at ${new Date().toLocaleTimeString()}`);
  } catch (error) {
    setStatus(error.message);
  }
}

document.getElementById("find-me").addEventListener("click", async () => {
  try {
    setStatus("Asking for your location…");
    showBusesNear(await getLocation());
  } catch (error) {
    setStatus(error.message);
  }
});

document.getElementById("demo").addEventListener("click", () => showBusesNear(DEMO_LOCATION));
