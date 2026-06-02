// ============================================================
//  STATE
// ============================================================
const STORAGE_KEY      = 'worldmap_v2';
const STORAGE_KEY_OLD  = 'travelMapSharedData';
const SYNC_CONFIG_KEY  = 'worldmap_sync_config';

let supabaseClient = null;
let syncChannel    = null;
let syncInterval   = null;

let state = {
  places: [],
  users: { user1: { name: 'USER_1' }, user2: { name: 'USER_2' } },
};

let map;
let markers         = {};
let currentFilter   = 'all';
let currentUser     = 'user1';
let editingPlaceId  = null;
let tripPlaceId     = null;
let tripEditId      = null; // trip id being edited (null = new trip)
let pickingCoords   = false;

const ITEM_TYPES = {
  attraction: { emoji: '📍', label: 'ATTRACTION', color: '#3fb950' },
  food:       { emoji: '🍜', label: 'FOOD',       color: '#d29922' },
  hotel:      { emoji: '🏨', label: 'HOTEL',      color: '#bc8cff' },
  transport:  { emoji: '🚄', label: 'TRANSPORT',  color: '#58a6ff' },
  other:      { emoji: '✨', label: 'OTHER',       color: '#7d8590' },
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ============================================================
//  BOOT
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  await loadState();
  initMap();
  setupEventListeners();
  renderAll();
  initSync(); // try to connect if previously configured
  setStatus('ready ♡');
});

// ============================================================
//  DATA
// ============================================================
async function loadState() {
  let raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    raw = localStorage.getItem(STORAGE_KEY_OLD);
    if (raw) setStatus('migrated data from previous version');
  }
  // Auto-load bundled JSON on first visit
  if (!raw) {
    try {
      const res = await fetch('travel-map-data-2025-12-29.json');
      if (res.ok) {
        raw = await res.text();
        setStatus('loaded travel data ♡');
      }
    } catch (_) { /* no bundled data */ }
  }
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (parsed.places) {
      state.places = parsed.places.map(p => ({
        ...p,
        trips:   p.trips   || [],
        country: p.country || '',
        addedBy: p.addedBy || p.user || 'user1',
      }));
    }
    if (parsed.users) {
      state.users = {
        user1: { name: 'USER_1', ...parsed.users.user1 },
        user2: { name: 'USER_2', ...parsed.users.user2 },
      };
    }
  } catch (e) {
    setStatus('error: failed to load saved data', true);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (supabaseClient) pushToSupabase();
}

function uuid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ============================================================
//  MAP
// ============================================================
function initMap() {
  map = L.map('map', { center: [20, 0], zoom: 2, zoomControl: true });

  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Nat. Geo., Esri, DeLorme, NAVTEQ, UNEP-WCMC, USGS, NASA, ESA',
    maxZoom: 16,
  }).addTo(map);

  map.on('click', onMapClick);
  map.on('mousemove', e => {
    document.getElementById('coordDisplay').textContent =
      `${e.latlng.lat.toFixed(3)}, ${e.latlng.lng.toFixed(3)}`;
  });
}

function onMapClick(e) {
  const { lat, lng } = e.latlng;
  if (document.getElementById('placeModalOverlay').classList.contains('open')) {
    document.getElementById('placeLat').value = lat.toFixed(5);
    document.getElementById('placeLng').value = lng.toFixed(5);
    setStatus(`coords picked: ${lat.toFixed(3)}, ${lng.toFixed(3)}`);
  }
}

function makeMarker(place) {
  const icon = L.divIcon({
    html: `<div class="map-marker ${place.type}" style="width:10px;height:10px"></div>`,
    className: '',
    iconSize: [10, 10],
    iconAnchor: [5, 5],
    popupAnchor: [0, -8],
  });

  const m = L.marker([place.lat, place.lng], { icon }).addTo(map);
  m.bindPopup(`
    <div class="popup-name">${escHtml(place.name)}</div>
    <div class="popup-type ${place.type}">${place.type.toUpperCase()}</div>
    ${place.date ? `<div class="popup-date">${place.date}</div>` : ''}
  `);
  m.on('click', () => openDetailModal(place.id));
  return m;
}

function refreshMarkers() {
  Object.values(markers).forEach(m => m.remove());
  markers = {};
  getFilteredPlaces().forEach(p => { markers[p.id] = makeMarker(p); });
}

// ============================================================
//  FILTER + RENDER
// ============================================================
function getFilteredPlaces(searchQuery) {
  let list = currentFilter === 'all'
    ? state.places
    : state.places.filter(p => p.type === currentFilter);

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.country || '').toLowerCase().includes(q)
    );
  }
  return list;
}

function renderAll() {
  renderStats();
  renderSidebar();
  refreshMarkers();
  updateUserUI();
}

function renderStats() {
  const visited  = state.places.filter(p => p.type === 'visited').length;
  const wishlist = state.places.filter(p => p.type === 'wishlist').length;
  const planned  = state.places.filter(p => p.type === 'planned').length;
  const countries = new Set(
    state.places.filter(p => p.type === 'visited' && p.country).map(p => p.country)
  ).size;

  document.getElementById('visitedCount').textContent  = visited;
  document.getElementById('wishlistCount').textContent = wishlist;
  document.getElementById('plannedCount').textContent  = planned;
  document.getElementById('headerStats').textContent   =
    `// ${state.places.length} locations · ${countries} countries`;
}

function renderSidebar(searchQuery) {
  const list     = document.getElementById('placesList');
  const filtered = getFilteredPlaces(searchQuery);

  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-msg">// no locations found<br>click [+ ADD_PLACE] to start</div>`;
    return;
  }

  const groups = {};
  filtered.forEach(p => {
    const key = p.country || 'UNKNOWN';
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });

  list.innerHTML = Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([country, places]) => `
      <div class="country-group">
        <div class="country-header" onclick="toggleCountry(this)">
          <span class="country-name">${escHtml(country)}</span>
          <span class="country-count">${places.length}</span>
          <span class="country-toggle open">&#9658;</span>
        </div>
        <div class="country-places">
          ${places.map(p => `
            <div class="place-item ${p.type}" onclick="openDetailModal('${p.id}')">
              <div class="place-dot ${p.type}"></div>
              <span class="place-name">${escHtml(p.name)}</span>
              ${p.date ? `<span class="place-date">${p.date}</span>` : ''}
              <button class="place-plan-btn" onclick="event.stopPropagation();openTripPlanner('${p.id}',null)">+ plan</button>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
}

function toggleCountry(header) {
  const body   = header.nextElementSibling;
  const toggle = header.querySelector('.country-toggle');
  if (body.style.display === 'none') {
    body.style.display = '';
    toggle.classList.add('open');
  } else {
    body.style.display = 'none';
    toggle.classList.remove('open');
  }
}

// ============================================================
//  MODAL HELPERS
// ============================================================
function openModal(id) {
  document.getElementById(id + 'Overlay').classList.add('open');
}

function closeModal(id) {
  document.getElementById(id + 'Overlay').classList.remove('open');
}

// ============================================================
//  PLACE FORM MODAL
// ============================================================
function openAddPlaceModal() {
  editingPlaceId = null;
  document.getElementById('placeModalTitle').textContent = 'ADD_PLACE';
  document.getElementById('placeForm').reset();
  document.getElementById('deletePlaceBtn').style.display = 'none';
  const userRadio = document.querySelector(`input[name="placeUser"][value="${currentUser}"]`);
  if (userRadio) userRadio.checked = true;
  openModal('placeModal');
}

function openEditPlaceModal(id) {
  const place = state.places.find(p => p.id === id);
  if (!place) return;
  editingPlaceId = id;
  document.getElementById('placeModalTitle').textContent = 'EDIT_PLACE';
  document.getElementById('placeName').value    = place.name;
  document.getElementById('placeCountry').value = place.country || '';
  document.getElementById('placeDate').value    = place.date    || '';
  document.getElementById('placeNotes').value   = place.notes   || '';
  document.getElementById('placeLat').value     = place.lat;
  document.getElementById('placeLng').value     = place.lng;
  const typeRadio = document.querySelector(`input[name="placeType"][value="${place.type}"]`);
  if (typeRadio) typeRadio.checked = true;
  const userRadio = document.querySelector(`input[name="placeUser"][value="${place.addedBy || 'user1'}"]`);
  if (userRadio) userRadio.checked = true;
  document.getElementById('deletePlaceBtn').style.display = 'block';
  closeModal('detailModal');
  openModal('placeModal');
}

function handlePlaceSave(e) {
  e.preventDefault();
  const name    = document.getElementById('placeName').value.trim();
  const country = document.getElementById('placeCountry').value.trim();
  const type    = document.querySelector('input[name="placeType"]:checked')?.value;
  const addedBy = document.querySelector('input[name="placeUser"]:checked')?.value || 'user1';
  const date    = document.getElementById('placeDate').value;
  const notes   = document.getElementById('placeNotes').value.trim();
  const lat     = parseFloat(document.getElementById('placeLat').value);
  const lng     = parseFloat(document.getElementById('placeLng').value);

  if (!name || isNaN(lat) || isNaN(lng)) {
    setStatus('error: name and coordinates are required', true);
    return;
  }

  if (editingPlaceId) {
    const idx = state.places.findIndex(p => p.id === editingPlaceId);
    if (idx !== -1) {
      state.places[idx] = { ...state.places[idx], name, country, type, addedBy, date, notes, lat, lng };
      setStatus(`updated: ${name}`);
    }
  } else {
    state.places.unshift({ id: uuid(), name, country, type, addedBy, date, notes, lat, lng, trips: [] });
    setStatus(`added: ${name}`);
  }

  saveState();
  renderAll();
  closeModal('placeModal');
}

function handleDeletePlace() {
  if (!editingPlaceId) return;
  const place = state.places.find(p => p.id === editingPlaceId);
  if (!confirm(`DELETE "${place?.name}"? This cannot be undone.`)) return;
  if (markers[editingPlaceId]) { markers[editingPlaceId].remove(); delete markers[editingPlaceId]; }
  state.places = state.places.filter(p => p.id !== editingPlaceId);
  saveState();
  renderAll();
  closeModal('placeModal');
  setStatus(`deleted: ${place?.name}`);
}

// ============================================================
//  DETAIL MODAL
// ============================================================
function openDetailModal(id) {
  const place = state.places.find(p => p.id === id);
  if (!place) return;

  document.getElementById('detailTitle').textContent = place.name.toUpperCase();

  const userName = state.users[place.addedBy]?.name || place.addedBy || '';
  const trips    = place.trips || [];

  const tripsHtml = trips.length === 0
    ? `<div class="no-trips-msg">
         &#9992;&#65039; 还没有行程计划<br>
         <button class="btn btn-blue btn-sm" style="margin-top:10px" onclick="openTripPlanner('${id}',null)">+ 规划行程</button>
       </div>`
    : trips.map(trip => buildTripCardHtml(id, trip)).join('');

  document.getElementById('detailBody').innerHTML = `
    <div class="detail-name">${escHtml(place.name)}</div>
    <div class="detail-meta">
      <span class="detail-chip ${place.type}">${place.type.toUpperCase()}</span>
      ${place.country ? `<span class="detail-meta-item">&#128205; ${escHtml(place.country)}</span>` : ''}
      ${place.date    ? `<span class="detail-meta-item">&#128197; ${place.date}</span>` : ''}
      ${userName      ? `<span class="detail-meta-item">&#128100; ${escHtml(userName)}</span>` : ''}
    </div>
    ${place.notes ? `<div class="detail-notes">${escHtml(place.notes)}</div>` : ''}
    <div class="detail-actions">
      <button class="btn btn-ghost btn-sm" onclick="openEditPlaceModal('${id}')">&#9998; EDIT_PLACE</button>
      <button class="btn btn-primary btn-sm" onclick="openTripPlanner('${id}', null)">+ PLAN_TRIP</button>
    </div>
    <div class="trips-section">
      <div class="trips-header">
        <span class="trips-label">TRIP PLANS</span>
        <span style="font-size:10px;color:var(--text-muted)">${trips.length} saved</span>
      </div>
      ${tripsHtml}
    </div>
  `;

  openModal('detailModal');
  map.flyTo([place.lat, place.lng], Math.max(map.getZoom(), 6), { duration: 0.8 });
}

function buildTripCardHtml(placeId, trip) {
  const daysHtml = trip.days.map(day => {
    const itemsHtml = day.items.length === 0
      ? `<div style="color:var(--text-muted);font-size:11px;padding:2px 8px">// empty day</div>`
      : day.items.map(item => {
          const cfg = ITEM_TYPES[item.type] || ITEM_TYPES.other;
          return `
            <div class="day-item-row">
              <div class="item-dot" style="background:${cfg.color}"></div>
              <span class="item-time">${item.time || ''}</span>
              <span class="item-emoji">${cfg.emoji}</span>
              <span class="item-title">${escHtml(item.title)}</span>
              <span class="item-type-label">${cfg.label}</span>
            </div>`;
        }).join('');
    return `
      <div class="day-block">
        <div class="day-label">DAY ${day.dayNumber} &nbsp;// ${day.date} &nbsp;${getDow(day.date)}</div>
        <div class="day-items">${itemsHtml}</div>
      </div>`;
  }).join('');

  return `
    <div class="trip-card">
      <div class="trip-card-header">
        <div>
          <div class="trip-dates">${trip.startDate} &#8594; ${trip.endDate}</div>
          <div class="trip-duration">${trip.days.length} day${trip.days.length !== 1 ? 's' : ''}</div>
        </div>
        <div class="trip-card-btns">
          <button class="btn btn-ghost btn-sm" onclick="openTripPlanner('${placeId}','${trip.id}')">EDIT</button>
          <button class="btn btn-danger btn-sm" onclick="deleteTrip('${placeId}','${trip.id}')">DEL</button>
        </div>
      </div>
      ${daysHtml}
    </div>`;
}

function deleteTrip(placeId, tripId) {
  if (!confirm('Delete this trip plan?')) return;
  const place = state.places.find(p => p.id === placeId);
  if (!place) return;
  place.trips = place.trips.filter(t => t.id !== tripId);
  saveState();
  openDetailModal(placeId);
  setStatus('deleted: trip plan');
}

// ============================================================
//  TRIP PLANNER MODAL
// ============================================================

// In-memory state for the planner (not saved until SAVE is clicked)
let plannerSuggestions = [];   // [{id, type, emoji, title, note, suggestedDay}]
let plannerDays        = [];   // [{dayNumber, date, items:[{id,type,emoji,title,time}]}]
let plannerChatHistory = [];   // Anthropic message format

function openTripPlanner(placeId, existingTripId) {
  tripPlaceId = placeId;
  tripEditId  = existingTripId;
  const place = state.places.find(p => p.id === placeId);
  if (!place) return;

  document.getElementById('tripModalTitle').textContent = `PLAN: ${place.name.toUpperCase()}`;

  const trip = existingTripId
    ? (place.trips || []).find(t => t.id === existingTripId)
    : null;

  // Reset planner state
  plannerSuggestions = [];
  plannerChatHistory = [];
  plannerDays = trip
    ? trip.days.map(d => ({ ...d, items: d.items.map(i => ({ ...i })) }))
    : [];

  renderTripPlannerForm(trip);
  closeModal('detailModal');
  openModal('tripModal');
}

function renderTripPlannerForm(trip) {
  const startDate = trip?.startDate || '';
  const endDate   = trip?.endDate   || '';

  document.getElementById('tripModalBody').innerHTML = `
    <div class="planner-top-row">
      <div class="planner-date-group">
        <div class="field-row">
          <label>START DATE</label>
          <input type="date" id="tripStart" value="${startDate}">
        </div>
        <div class="field-row">
          <label>END DATE</label>
          <input type="date" id="tripEnd" value="${endDate}">
        </div>
        <button class="btn btn-ghost btn-sm" style="align-self:flex-end" onclick="initPlannerDays()">GENERATE DAYS</button>
      </div>
      <button class="btn btn-primary btn-sm" style="align-self:flex-end" onclick="aiGenerate()">✦ AI SUGGEST</button>
    </div>

    <div class="planner-columns" id="plannerColumns">
      <!-- LEFT: Suggestions -->
      <div class="suggestions-panel">
        <div class="sug-header">
          <span class="sug-label">✦ AI SUGGESTIONS</span>
          <span class="sug-count" id="sugCount">0 items</span>
        </div>
        <div class="sug-list" id="sugList">
          <div class="sug-empty">
            Set dates → click <strong>GENERATE DAYS</strong><br>
            Then click <strong>✦ AI SUGGEST</strong> to get ideas<br>
            or type a request below ↓
          </div>
        </div>
        <div class="sug-chat">
          <input id="sugChatInput" type="text" placeholder="e.g. best tapas, hidden gems, romantic dinner...">
          <button class="btn btn-ghost btn-sm" onclick="aiChat()">SEND</button>
        </div>
      </div>

      <!-- RIGHT: Day planner -->
      <div class="days-panel" id="daysPanel">
        <div class="days-empty">Generate days to start planning →</div>
      </div>
    </div>

    <div class="form-actions">
      <button class="btn btn-primary" onclick="saveTripPlan()">SAVE TRIP</button>
      <button class="btn btn-ghost" onclick="closeTripPlanner()">CANCEL</button>
    </div>
  `;

  if (plannerDays.length > 0) renderDaysPanel();
}

// ── Day management ──────────────────────────────
function initPlannerDays() {
  const startStr = document.getElementById('tripStart').value;
  const endStr   = document.getElementById('tripEnd').value;
  if (!startStr || !endStr) { setStatus('error: set both dates first', true); return; }
  const start = new Date(startStr), end = new Date(endStr);
  if (end < start) { setStatus('error: end before start', true); return; }
  if (plannerDays.length > 0 && !confirm('Regenerate days? Planned items will be lost.')) return;

  plannerDays = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    plannerDays.push({ dayNumber: plannerDays.length + 1, date: d.toISOString().slice(0, 10), items: [] });
  }
  renderDaysPanel();
  setStatus(`${plannerDays.length} days ready`);
}

function renderDaysPanel() {
  const panel = document.getElementById('daysPanel');
  if (!panel) return;
  if (!plannerDays.length) {
    panel.innerHTML = `<div class="days-empty">Generate days to start planning →</div>`;
    return;
  }

  panel.innerHTML = plannerDays.map((day, i) => `
    <div class="day-plan-block">
      <div class="day-plan-header">
        <span class="day-plan-badge">DAY ${day.dayNumber}</span>
        <span class="day-plan-date">${day.date} · ${getDow(day.date)}</span>
      </div>
      <div class="day-plan-items" id="dayItems_${i}">
        ${day.items.length === 0
          ? `<div class="day-plan-empty">// assign items from suggestions →</div>`
          : day.items.map(item => buildDayItemHtml(i, item)).join('')}
      </div>
    </div>
  `).join('');
}

function buildDayItemHtml(dayIdx, item) {
  const cfg = ITEM_TYPES[item.type] || ITEM_TYPES.other;
  return `
    <div class="day-plan-item" id="dpi_${item.id}">
      <span class="dpi-emoji">${cfg.emoji}</span>
      <span class="dpi-title">${escHtml(item.title)}</span>
      <input class="dpi-time" type="time" value="${item.time || ''}"
        onchange="updateItemTime(${dayIdx},'${item.id}',this.value)">
      <button class="dpi-remove" onclick="removeDayItem(${dayIdx},'${item.id}')">&times;</button>
    </div>`;
}

function updateItemTime(dayIdx, itemId, time) {
  const item = plannerDays[dayIdx]?.items.find(i => i.id === itemId);
  if (item) item.time = time;
}

function removeDayItem(dayIdx, itemId) {
  if (!plannerDays[dayIdx]) return;
  plannerDays[dayIdx].items = plannerDays[dayIdx].items.filter(i => i.id !== itemId);
  const container = document.getElementById(`dayItems_${dayIdx}`);
  if (container) {
    const el = document.getElementById(`dpi_${itemId}`);
    if (el) el.remove();
    if (plannerDays[dayIdx].items.length === 0) {
      container.innerHTML = `<div class="day-plan-empty">// assign items from suggestions →</div>`;
    }
  }
}

function assignToDay(sugId, dayIdx) {
  const sug = plannerSuggestions.find(s => s.id === sugId);
  if (!sug || dayIdx < 0 || dayIdx >= plannerDays.length) return;

  const item = { id: uuid(), type: sug.type, emoji: sug.emoji, title: sug.title, time: '' };
  plannerDays[dayIdx].items.push(item);

  // Remove from suggestions
  plannerSuggestions = plannerSuggestions.filter(s => s.id !== sugId);
  renderSuggestionsPanel();

  // Update day panel
  const container = document.getElementById(`dayItems_${dayIdx}`);
  if (container) {
    const empty = container.querySelector('.day-plan-empty');
    if (empty) empty.remove();
    container.insertAdjacentHTML('beforeend', buildDayItemHtml(dayIdx, item));
  }
}

// ── Suggestions panel ───────────────────────────
function renderSuggestionsPanel() {
  const list = document.getElementById('sugList');
  const count = document.getElementById('sugCount');
  if (!list) return;
  if (count) count.textContent = `${plannerSuggestions.length} items`;

  if (!plannerSuggestions.length) {
    list.innerHTML = `<div class="sug-empty">// no suggestions yet — click ✦ AI SUGGEST or type a request below</div>`;
    return;
  }

  const dayOptions = plannerDays.map((d, i) =>
    `<option value="${i}">→ Day ${d.dayNumber} (${d.date.slice(5)})</option>`
  ).join('');

  list.innerHTML = plannerSuggestions.map(s => `
    <div class="sug-item" id="sug_${s.id}">
      <div class="sug-main" onclick="toggleSugDetail('${s.id}')">
        <span class="sug-emoji">${s.emoji}</span>
        <div class="sug-info">
          <span class="sug-title">${escHtml(s.title)}</span>
          ${s.note ? `<span class="sug-note">${escHtml(s.note)}</span>` : ''}
        </div>
        <div class="sug-controls" onclick="event.stopPropagation()">
          <select class="sug-day-select" onchange="if(this.value!=='')assignToDay('${s.id}',parseInt(this.value));this.value=''">
            <option value="">+ 加入</option>
            ${dayOptions}
          </select>
          <button class="sug-del" onclick="removeSuggestion('${s.id}')">&times;</button>
        </div>
        <span class="sug-expand-icon" id="sugIcon_${s.id}">▶</span>
      </div>
      <div class="sug-detail" id="sugDetail_${s.id}">
        <div class="sug-img-wrap" id="sugImg_${s.id}">
          <div class="sug-img-loading">// 加载图片...</div>
        </div>
        <p class="sug-detail-text">${escHtml(s.detailCn || s.note || '')}</p>
      </div>
    </div>
  `).join('');
}

function removeSuggestion(id) {
  plannerSuggestions = plannerSuggestions.filter(s => s.id !== id);
  renderSuggestionsPanel();
}

function toggleSugDetail(id) {
  const detail = document.getElementById(`sugDetail_${id}`);
  const icon   = document.getElementById(`sugIcon_${id}`);
  if (!detail) return;
  const open = detail.classList.toggle('open');
  if (icon) icon.textContent = open ? '▼' : '▶';
  if (open) loadSugImage(id);
}

async function loadSugImage(id) {
  const sug  = plannerSuggestions.find(s => s.id === id);
  const wrap = document.getElementById(`sugImg_${id}`);
  if (!wrap || wrap.dataset.loaded) return;
  wrap.dataset.loaded = '1';

  if (!sug?.wikiQuery) { wrap.style.display = 'none'; return; }
  try {
    const q   = encodeURIComponent(sug.wikiQuery);
    const res = await fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=${q}&prop=pageimages&format=json&pithumbsize=500&origin=*`);
    const data = await res.json();
    const page = Object.values(data.query?.pages || {})[0];
    const src  = page?.thumbnail?.source;
    if (src) {
      wrap.innerHTML = `<img src="${src}" alt="${escHtml(sug.title)}" class="sug-img">`;
    } else {
      wrap.style.display = 'none';
    }
  } catch {
    wrap.style.display = 'none';
  }
}

// ── AI functions ────────────────────────────────
function getApiKey() {
  return localStorage.getItem('ai_api_key') || localStorage.getItem('anthropic_key') || '';
}

async function aiGenerate() {
  if (!plannerDays.length) { setStatus('generate days first, then AI suggest', true); return; }
  const key = getApiKey();
  if (!key) { setStatus('add your Claude API key in ⚙ User Settings', true); return; }

  const place = state.places.find(p => p.id === tripPlaceId);
  const start = document.getElementById('tripStart').value;
  const end   = document.getElementById('tripEnd').value;

  // Reset chat history for fresh generation
  plannerChatHistory = [];

  const list = document.getElementById('sugList');
  list.innerHTML = `<div class="ai-loading">
    <div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div>
    <span>AI is generating suggestions for ${place?.name}...</span>
  </div>`;

  const prompt = `你是一名旅行专家，帮助一对情侣规划去${place?.name || '目的地'}的${plannerDays.length}天旅行（${start} 至 ${end}）。

请生成恰好18个具体的游玩建议，涵盖：必看景点、当地特色餐厅（含真实名称）、住宿推荐、交通提示和浪漫体验。

只返回一个 JSON 数组，不要其他文字：
[{"type":"attraction","emoji":"⛪","title":"圣家堂（Sagrada Família）","note":"提前两周网上购票","detailCn":"高迪设计的传世杰作，融合了自然与宗教美学。彩色玻璃在阳光下将整个教堂染成绚丽色彩，日落时分尤为壮观。推荐购买登塔票，可俯瞰整个巴塞罗那全景。","wikiQuery":"Sagrada Familia Barcelona","suggestedDay":1}]

规则：
- type: attraction / food / hotel / transport / other
- emoji: 一个相关 emoji
- title: 具体地点中文名（括号内注原文），不要泛泛的描述
- note: 一句实用小提示（15字以内）
- detailCn: 2-3句详细介绍，包含看点、氛围和实用信息，适合情侣
- wikiQuery: 用于搜索图片的英文关键词（如 "Sagrada Familia Barcelona"）
- suggestedDay: 分散在第1天至第${plannerDays.length}天
- 以浪漫、有趣、有记忆点为核心`;

  try {
    const suggestions = await callClaude([{ role: 'user', content: prompt }], key);
    plannerChatHistory.push(
      { role: 'user', content: prompt },
      { role: 'assistant', content: JSON.stringify(suggestions) }
    );
    plannerSuggestions = suggestions.map(s => ({ ...s, id: uuid() }));
    renderSuggestionsPanel();
    setStatus(`AI generated ${suggestions.length} suggestions for ${place?.name}`);
  } catch (e) {
    list.innerHTML = `<div class="sug-empty" style="color:var(--red)">AI error: ${escHtml(e.message)}</div>`;
    setStatus('AI error: ' + e.message, true);
  }
}

async function aiChat() {
  const input = document.getElementById('sugChatInput');
  const msg   = input?.value.trim();
  if (!msg) return;
  const key = getApiKey();
  if (!key) { setStatus('add your Claude API key in ⚙ User Settings', true); return; }

  input.value = '';
  input.disabled = true;

  const place = state.places.find(p => p.id === tripPlaceId);
  const alreadyHave = [...plannerSuggestions, ...plannerDays.flatMap(d => d.items)]
    .map(i => i.title).join(', ');

  const userMsg = `用户请求："${msg}"
已有建议/计划：${alreadyHave || '暂无'}。
请为${place?.name}再添加5-8个符合该请求的建议，避免重复。
只返回 JSON 数组：[{"type":"...","emoji":"...","title":"...","note":"...","detailCn":"...","wikiQuery":"...","suggestedDay":1}]`;

  try {
    const messages = [...plannerChatHistory, { role: 'user', content: userMsg }];
    const newSuggestions = await callClaude(messages, key);
    plannerChatHistory.push(
      { role: 'user', content: userMsg },
      { role: 'assistant', content: JSON.stringify(newSuggestions) }
    );
    plannerSuggestions = [...plannerSuggestions, ...newSuggestions.map(s => ({ ...s, id: uuid() }))];
    renderSuggestionsPanel();
    setStatus(`added ${newSuggestions.length} more suggestions`);
  } catch (e) {
    setStatus('AI error: ' + e.message, true);
  } finally {
    if (input) input.disabled = false;
  }
}

async function callClaude(messages, apiKey) {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      max_tokens: 2048,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${res.status}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('no JSON array in response');
  return JSON.parse(match[0]);
}

// ── Save ─────────────────────────────────────────
function closeTripPlanner() {
  closeModal('tripModal');
  if (tripPlaceId) openDetailModal(tripPlaceId);
}

function saveTripPlan() {
  const startDate = document.getElementById('tripStart')?.value;
  const endDate   = document.getElementById('tripEnd')?.value;
  if (!startDate || !endDate) { setStatus('error: set dates', true); return; }
  if (!plannerDays.length)   { setStatus('error: generate days first', true); return; }

  const place = state.places.find(p => p.id === tripPlaceId);
  if (!place) return;
  if (!place.trips) place.trips = [];

  const tripData = { startDate, endDate, days: plannerDays };

  if (tripEditId) {
    const idx = place.trips.findIndex(t => t.id === tripEditId);
    if (idx !== -1) place.trips[idx] = { ...place.trips[idx], ...tripData };
    else place.trips.push({ id: uuid(), ...tripData });
  } else {
    place.trips.push({ id: uuid(), ...tripData });
  }

  saveState();
  closeModal('tripModal');
  openDetailModal(tripPlaceId);
  setStatus(`saved trip plan for ${place.name}`);
}

// ============================================================
//  USER MODAL
// ============================================================
function openUserModal() {
  document.getElementById('user1NameInput').value = state.users.user1.name || '';
  document.getElementById('user2NameInput').value = state.users.user2.name || '';
  document.getElementById('claudeKeyInput').value = localStorage.getItem('ai_api_key') || localStorage.getItem('anthropic_key') || '';
  openModal('userModal');
}

function saveUsers() {
  state.users.user1.name = document.getElementById('user1NameInput').value.trim() || 'USER_1';
  state.users.user2.name = document.getElementById('user2NameInput').value.trim() || 'USER_2';
  const apiKey = document.getElementById('claudeKeyInput').value.trim();
  if (apiKey) localStorage.setItem('ai_api_key', apiKey);
  else localStorage.removeItem('ai_api_key');
  saveState();
  updateUserUI();
  closeModal('userModal');
  setStatus('saved: user settings');
}

function updateUserUI() {
  const u1 = state.users.user1.name;
  const u2 = state.users.user2.name;
  document.getElementById('user1ChipName').textContent = u1.slice(0, 8).toUpperCase();
  document.getElementById('user2ChipName').textContent = u2.slice(0, 8).toUpperCase();
  document.getElementById('formUser1Name').textContent = u1;
  document.getElementById('formUser2Name').textContent = u2;
}

function switchUser(userId) {
  currentUser = userId;
  document.querySelectorAll('.user-chip').forEach(c => c.classList.remove('active'));
  document.getElementById(userId + 'Chip').classList.add('active');
  const radio = document.querySelector(`input[name="placeUser"][value="${userId}"]`);
  if (radio) radio.checked = true;
  setStatus(`switched to: ${state.users[userId].name}`);
}

// ============================================================
//  SEARCH / GEOCODE
// ============================================================
async function searchLocation() {
  const name = document.getElementById('placeName').value.trim();
  if (!name) { setStatus('error: enter a place name first', true); return; }
  setStatus(`searching: ${name}...`);

  try {
    const res  = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(name)}&limit=1`);
    const data = await res.json();
    if (!data.length) { setStatus(`not found: ${name}`, true); return; }

    const { lat, lon, display_name } = data[0];
    document.getElementById('placeLat').value = parseFloat(lat).toFixed(5);
    document.getElementById('placeLng').value = parseFloat(lon).toFixed(5);

    if (!document.getElementById('placeCountry').value) {
      const parts = display_name.split(', ');
      document.getElementById('placeCountry').value = parts[parts.length - 1];
    }

    map.flyTo([lat, lon], 8, { duration: 1 });
    setStatus(`found: ${name} @ ${parseFloat(lat).toFixed(3)}, ${parseFloat(lon).toFixed(3)}`);
  } catch {
    setStatus('error: geocoding failed', true);
  }
}

function getCurrentLocation() {
  if (!navigator.geolocation) { setStatus('error: geolocation not supported', true); return; }
  navigator.geolocation.getCurrentPosition(
    pos => {
      document.getElementById('placeLat').value = pos.coords.latitude.toFixed(5);
      document.getElementById('placeLng').value = pos.coords.longitude.toFixed(5);
      setStatus('gps: location acquired');
    },
    () => setStatus('error: geolocation denied', true)
  );
}


// ============================================================
//  UTILITIES
// ============================================================
function setStatus(msg, isError = false) {
  const el = document.getElementById('statusMsg');
  el.textContent = `> ${msg}`;
  el.style.color = isError ? 'var(--red)' : 'var(--green)';
  setTimeout(() => {
    el.textContent = '> ready';
    el.style.color = '';
  }, 3500);
}

function getDow(dateStr) {
  if (!dateStr) return '';
  return WEEKDAYS[new Date(dateStr).getDay()] || '';
}

function escHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================================
//  SUPABASE SYNC
// ============================================================
function initSync() {
  const cfg = getSyncConfig();
  if (!cfg) return;
  connectSync(cfg.url, cfg.key);
}

function getSyncConfig() {
  try { return JSON.parse(localStorage.getItem(SYNC_CONFIG_KEY)); } catch { return null; }
}

async function connectSync(url, key) {
  if (!window.supabase) return;
  try {
    supabaseClient = window.supabase.createClient(url, key);
    setSyncDot('loading');

    // Load remote data first
    const { data, error } = await supabaseClient
      .from('worldmap_data')
      .select('data')
      .eq('id', 'main')
      .maybeSingle();

    if (error) throw error;

    if (data?.data) {
      mergeRemoteState(data.data);
      saveState();
      renderAll();
    } else {
      // First time: push local data to remote
      await pushToSupabase();
    }

    // Subscribe to real-time changes
    if (syncChannel) syncChannel.unsubscribe();
    syncChannel = supabaseClient
      .channel('worldmap-sync')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'worldmap_data' },
        payload => {
          if (payload.new?.data) {
            mergeRemoteState(payload.new.data);
            saveState();
            renderAll();
            setStatus('synced from partner ♡');
          }
        }
      )
      .subscribe(status => {
        setSyncDot(status === 'SUBSCRIBED' ? 'ok' : 'loading');
      });

    setSyncDot('ok');
    setStatus('cloud sync connected ♡');
    document.getElementById('syncStatusMsg').textContent = '✓ Connected — changes sync automatically';
  } catch (e) {
    setSyncDot('err');
    setStatus('sync error: ' + (e.message || e), true);
    document.getElementById('syncStatusMsg').textContent = '✗ Error: ' + (e.message || e);
  }
}

async function pushToSupabase() {
  if (!supabaseClient) return;
  try {
    const { error } = await supabaseClient
      .from('worldmap_data')
      .upsert({ id: 'main', data: state, updated_at: new Date().toISOString() });
    if (error) throw error;
    setSyncDot('ok');
  } catch (e) {
    setSyncDot('err');
    console.error('Sync push failed:', e);
  }
}

function mergeRemoteState(remote) {
  // Remote wins for places (last-write-wins by updated_at, simple merge)
  if (remote.places) {
    const localMap  = Object.fromEntries(state.places.map(p => [p.id, p]));
    const remoteMap = Object.fromEntries(remote.places.map(p => [p.id, p]));
    const merged    = { ...localMap, ...remoteMap };
    state.places = Object.values(merged);
  }
  if (remote.users) {
    state.users = { ...state.users, ...remote.users };
  }
}

function setSyncDot(status) {
  const dot = document.getElementById('syncDot');
  if (!dot) return;
  dot.className = 'sync-dot' + (status ? ' ' + status : '');
}

function openSyncModal() {
  const cfg = getSyncConfig();
  document.getElementById('sbUrl').value = cfg?.url || '';
  document.getElementById('sbKey').value = cfg?.key || '';

  const msgEl = document.getElementById('syncStatusMsg');
  if (supabaseClient) {
    const shareCode = btoa(JSON.stringify(cfg));
    msgEl.innerHTML = `
      <div style="color:var(--green);font-weight:700;margin-bottom:8px">✓ 已连接</div>
      <div style="font-size:10px;color:var(--text-dim);margin-bottom:4px">把下面这串分享给对方，她直接粘贴就能连接同一个数据库：</div>
      <div style="display:flex;gap:6px;align-items:center">
        <input readonly value="${shareCode}"
          style="flex:1;font-size:10px;padding:5px 8px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;color:var(--text);font-family:var(--font);cursor:text"
          onclick="this.select()">
        <button class="btn btn-ghost btn-sm" onclick="navigator.clipboard.writeText('${shareCode}');this.textContent='✓ copied'">copy</button>
      </div>`;
  } else if (cfg) {
    msgEl.innerHTML = `<div style="color:var(--amber)">⚠ 有保存的配置但未连接，点 CONNECT 重试</div>`;
    // try pasting share code
  } else {
    msgEl.innerHTML = `
      <div style="color:var(--text-muted);margin-bottom:8px">○ 未连接</div>
      <div style="font-size:10px;color:var(--text-muted)">如果对方已经连接，可以粘贴她分享的 code：</div>
      <div style="display:flex;gap:6px;margin-top:6px">
        <input id="shareCodeInput" placeholder="粘贴 share code..."
          style="flex:1;font-size:10px;padding:5px 8px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;color:var(--text);font-family:var(--font)">
        <button class="btn btn-primary btn-sm" onclick="importShareCode()">导入</button>
      </div>`;
  }
  openModal('syncModal');
}

function importShareCode() {
  const code = document.getElementById('shareCodeInput')?.value.trim();
  if (!code) return;
  try {
    const cfg = JSON.parse(atob(code));
    if (!cfg.url || !cfg.key) throw new Error('invalid');
    document.getElementById('sbUrl').value = cfg.url;
    document.getElementById('sbKey').value = cfg.key;
    setStatus('share code imported — click CONNECT');
  } catch {
    setStatus('error: invalid share code', true);
  }
}

async function saveSyncConfig() {
  const url = document.getElementById('sbUrl').value.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
  const key = document.getElementById('sbKey').value.trim();
  if (!url || !key) { setStatus('error: fill in both URL and key', true); return; }
  localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify({ url, key }));
  await connectSync(url, key);
  closeModal('syncModal');
}

function clearSyncConfig() {
  if (!confirm('Disconnect cloud sync?')) return;
  localStorage.removeItem(SYNC_CONFIG_KEY);
  if (syncChannel) { syncChannel.unsubscribe(); syncChannel = null; }
  supabaseClient = null;
  setSyncDot('');
  closeModal('syncModal');
  setStatus('sync disconnected');
}

// Note: saveState is defined in DATA section and calls pushToSupabase if connected

// ============================================================
//  EVENT LISTENERS
// ============================================================
function setupEventListeners() {
  // Header controls
  document.getElementById('addPlaceBtn').addEventListener('click', openAddPlaceModal);
  document.getElementById('userSettingsBtn').addEventListener('click', openUserModal);
  document.getElementById('syncSetupBtn').addEventListener('click', openSyncModal);
  document.getElementById('syncModalClose').addEventListener('click', () => closeModal('syncModal'));
  document.getElementById('saveSyncBtn').addEventListener('click', saveSyncConfig);
  document.getElementById('cancelSyncBtn').addEventListener('click', () => closeModal('syncModal'));
  document.getElementById('clearSyncBtn').addEventListener('click', clearSyncConfig);

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderAll();
    });
  });

  // Sidebar search
  document.getElementById('sidebarSearch').addEventListener('input', e => {
    renderSidebar(e.target.value);
  });

  // Place form
  document.getElementById('placeForm').addEventListener('submit', handlePlaceSave);
  document.getElementById('placeModalClose').addEventListener('click', () => closeModal('placeModal'));
  document.getElementById('placeModalCancelBtn').addEventListener('click', () => closeModal('placeModal'));
  document.getElementById('deletePlaceBtn').addEventListener('click', handleDeletePlace);
  document.getElementById('searchBtn').addEventListener('click', searchLocation);
  document.getElementById('geoLocBtn').addEventListener('click', getCurrentLocation);

  // Detail modal
  document.getElementById('detailModalClose').addEventListener('click', () => closeModal('detailModal'));

  // Trip modal
  document.getElementById('tripModalClose').addEventListener('click', closeTripPlanner);

  // User modal
  document.getElementById('userModalClose').addEventListener('click', () => closeModal('userModal'));
  document.getElementById('saveUsersBtn').addEventListener('click', saveUsers);
  document.getElementById('cancelUsersBtn').addEventListener('click', () => closeModal('userModal'));

  // Close overlay on backdrop click
  ['placeModal', 'detailModal', 'tripModal', 'userModal', 'syncModal'].forEach(id => {
    document.getElementById(id + 'Overlay').addEventListener('click', e => {
      if (e.target === e.currentTarget) {
        if (id === 'tripModal') closeTripPlanner();
        else closeModal(id);
      }
    });
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (document.getElementById('tripModalOverlay').classList.contains('open')) {
        closeTripPlanner();
      } else {
        ['detailModal', 'placeModal', 'userModal', 'syncModal'].forEach(closeModal);
      }
    }
  });
}
