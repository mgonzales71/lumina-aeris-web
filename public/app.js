// Lumina Aeris Web & Worker - App Logic v1.12.0
// Mandate: NO Truncation. NO Minification. NO Missing Logic.

// --- 1. GLOBALS & DEFAULT CONSTANTS ---
const DEFAULT_DAY_STR = "Generate a {style} style image of {poi_name} in {city}, {state_region}. POI description: {poi_desc}. Ensure architectural and geographical accuracy based on real-world references. Time: {time_of_day} {datetime}. Weather: {weather}, {temperature}. Sun at {sunrise} and {sunset} for realistic positioning. Adjust sun visibility based on {weather}. Include the UV index and visibility in the depiction. Account for cloud cover to influence lighting and shadows. Safe Zone Framing: keep significant elements centered and critical content within 80-90 percent of the image width and height. Atmosphere: incorporate the theme of {theme} as a subtle, realistic element. Apply a professional, natural-looking auto-enhancement: brighten shadows, recover highlights, boost midtone contrast, and enhance clarity while preserving a photorealistic look.";
const DEFAULT_NIGHT_STR = "Generate a {style} style image of {poi_name} in {city}, {state_region}. POI description: {poi_desc}. Ensure architectural and geographical accuracy based on real-world references. Time: {time_of_day} {datetime}. Weather: {weather}, {temperature}. Moon in {moon_phase} with {moon_illumination} illumination. Account for moonrise {moonrise} and moonset {moonset} for realistic positioning. Adjust moon visibility based on {weather}. Safe Zone Framing: keep significant elements centered and critical content within 80-90 percent of the image width and height. Atmosphere: incorporate the theme of {theme} as a subtle, realistic element. Apply a professional, natural-looking auto-enhancement: brighten shadows, recover highlights, boost midtone contrast, and enhance clarity while preserving a photorealistic look.";
const DEFAULT_POI_DOMESTIC_STR = "You are an expert in identifying unique and notable points of interest, views, and vistas of the requested locations. Please provide one item per line without any formatting or citations. Generate a list of up to 30 visually distinct points of interest, landmarks, or vistas in or near {city}, {state_region}. Take your time to conduct a comprehensive search. Formatting Guidelines: 1. Provide only a raw JSON array of objects. 2. Exclude markdown code blocks (no backticks). 3. Omit any introductory or concluding text. 4. Each object must have precisely two keys: \"name\" and \"description\". 5. The \"description\" should consist of one to two concise sentences that visually describe the named point of interest.";
const DEFAULT_POI_INTL_STR = "You are an expert in identifying unique and notable points of interest, views, and vistas of the requested locations. Please provide one item per line without any formatting or citations. Generate a list of up to 30 visually distinct points of interest, landmarks, or vistas in or near {city}, {country}. Take your time to conduct a comprehensive search. Formatting Guidelines: 1. Provide only a raw JSON array of objects. 2. Exclude markdown code blocks (no backticks). 3. Omit any introductory or concluding text. 4. Each object must have precisely two keys: \"name\" and \"description\". 5. The \"description\" should consist of one to two concise sentences that visually describe the named point of interest.";
const TOKENS_LIST = ["{style}", "{poi_name}", "{poi_desc}", "{city}", "{state_region}", "{country}", "{time_of_day}", "{datetime}", "{weather}", "{temperature}", "{theme}", "{moon_phase}", "{moon_illumination}", "{moonrise}", "{moonset}", "{sunrise}", "{sunset}", "{uv_index}", "{visibility}", "{cloud_cover}", "{wind_speed}"];
const DEFAULT_STYLES = ["Hyper photo realistic", "Cinematic photography", "Watercolor painting", "Oil painting", "Pencil sketch", "Crayon drawing", "Claymation", "3D animation render", "Pixar-style 3D illustration", "Flat vector illustration", "Paper craft collage", "Ukiyo-e woodblock print", "Impressionist painting", "Pixel art", "Neon noir", "Vintage film photograph", "Comic book art", "Stained glass illustration"];

var state = {
    currentTab: 'home', isGenerating: false,
    lat: 45.52, lon: -122.67, city: "Portland", state: "Oregon", country: "USA",
    importType: '', currentProfile: 'default', remoteProfiles: [],
    settings: {
        promptDay: DEFAULT_DAY_STR, promptNight: DEFAULT_NIGHT_STR,
        promptPOIDomestic: DEFAULT_POI_DOMESTIC_STR, promptPOIIntl: DEFAULT_POI_INTL_STR,
        quality: "medium", model: "gptimage", textModel: "gemini-search", style: "Hyper photo realistic", resolution: "1290x2796",
        overlayLabel: false, apiKey: "", syncSecret: "", locMode: "gps", customCity: "Portland, Oregon",
        themes: [{"Begin":101, "End":103, "Theme":"New Years"}, {"Begin":1015, "End":1031, "Theme":"Halloween"}, {"Begin":1220, "End":1231, "Theme":"Holiday Season"}],
        poiCache: {}, profiles: [],
        styles: DEFAULT_STYLES,
        locations: [{"city": "Portland", "state": "Oregon", "country": "USA", "lat": 45.52, "lon": -122.67}],
        customLocIdx: 0,
        transparent: false, safe: true, enhance: false, seedEnable: false, seed: 0, negativePrompt: "", negEnable: false
    }
};

// --- 2. INITIALIZATION ---
window.onload = async () => {
    const saved = localStorage.getItem('lumina_v1.12.1');
    if (saved) {
        try { 
            const parsed = JSON.parse(saved);
            Object.assign(state.settings, parsed);
        } catch(e) { console.error("Save load error", e); }
    }
    
    // Remote Sync (Pull Profiles)
    if (state.settings.syncSecret) {
        await refreshRemoteProfiles();
        await switchRemoteProfile(state.currentProfile || 'default');
    }
    
    if(!state.settings.styles || state.settings.styles.length === 0) state.settings.styles = DEFAULT_STYLES;
    if(!state.settings.themes || state.settings.themes.length === 0) state.settings.themes = [{"Begin":101, "End":103, "Theme":"New Years"}, {"Begin":1015, "End":1031, "Theme":"Halloween"}, {"Begin":1220, "End":1231, "Theme":"Holiday Season"}];
    if(!state.settings.locations) state.settings.locations = [{"city": "Portland", "state": "Oregon", "country": "USA", "lat": 45.52, "lon": -122.67}];

    await fetchModels();
    setupUI(); renderThemes(); renderPOISelectors(); renderProfiles(); renderStyles(); renderLocations();
    
    if (state.settings.locMode === 'gps') requestLocation();
    else if (state.settings.locMode === 'custom') applySavedLoc(state.settings.customLocIdx !== undefined ? state.settings.customLocIdx : 0);
};

async function refreshRemoteProfiles() {
    if (!state.settings.syncSecret) return;
    try {
        const res = await fetch("/api/profiles?secret=" + encodeURIComponent(state.settings.syncSecret));
        if (res.ok) {
            state.remoteProfiles = await res.json();
            renderRemoteProfileList();
        }
    } catch(e) { console.error("Profile list fetch failed", e); }
}

async function switchRemoteProfile(name) {
    if (!state.settings.syncSecret) return;
    try {
        const res = await fetch(`/api/config?profile=${encodeURIComponent(name)}&secret=${encodeURIComponent(state.settings.syncSecret)}`);
        if (res.ok) {
            const remote = await res.json();
            if (remote && remote.promptDay) {
                state.settings = remote;
                state.currentProfile = name;
                setupUI(); renderThemes(); renderPOISelectors(); renderStyles(); renderLocations();
                localStorage.setItem('lumina_v1.12.1', JSON.stringify(state.settings)); 
            }
        }
    } catch(e) { console.error("KV Pull failed", e); }
}

async function save() { 
    localStorage.setItem('lumina_v1.12.1', JSON.stringify(state.settings)); 
    if (state.settings.syncSecret) {
        try {
            const profile = state.currentProfile || "default";
            await fetch(`/api/config?profile=${encodeURIComponent(profile)}`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "X-Lumina-Secret": state.settings.syncSecret 
                },
                body: JSON.stringify(state.settings)
            });
            await refreshRemoteProfiles();
        } catch(e) { console.error("KV Sync failed", e); }
    }
}

// --- 3. UI HANDLERS ---
function openImport(type) {
    state.importType = type;
    document.getElementById('import-title').innerText = "Import " + type.toUpperCase();
    document.getElementById('import-text').value = "";
    document.getElementById('import-modal').classList.add('active');
}
function closeImport() { document.getElementById('import-modal').classList.remove('active'); }

function confirmImport() {
    let raw = document.getElementById('import-text').value;
    if (!raw) return closeImport();
    try {
        const startBrace = raw.indexOf('{');
        const startBracket = raw.indexOf('[');
        let start = -1;
        if (startBrace !== -1 && (startBracket === -1 || startBrace < startBracket)) start = startBrace;
        else start = startBracket;

        const endBrace = raw.lastIndexOf('}');
        const endBracket = raw.lastIndexOf(']');
        let end = -1;
        if (endBrace !== -1 && (endBracket === -1 || endBrace > endBracket)) end = endBrace;
        else end = endBracket;
        
        if (start === -1 || end === -1) throw new Error("Could not find JSON structure in your paste.");
        
        let cleaned = raw.substring(start, end + 1);
        cleaned = cleaned.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
                         .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
                         .replace(/[\u200B-\u200D\uFEFF]/g, "");

        const parsed = JSON.parse(cleaned);
        
        if (state.importType === 'themes') { state.settings.themes = parsed; renderThemes(); }
        else if (state.importType === 'pois') { state.settings.poiCache = parsed; renderPOISelectors(); }
        else if (state.importType === 'styles') { state.settings.styles = parsed; renderStyles(); }
        else if (state.importType === 'locations') { state.settings.locations = parsed; renderLocations(); }
        else if (state.importType === 'prompts') { 
            state.settings.promptDay = parsed.day || DEFAULT_DAY_STR; 
            state.settings.promptNight = parsed.night || DEFAULT_NIGHT_STR; 
            loadEditorPrompt(); 
        }
        
        save(); alert("Import successful!"); closeImport();
    } catch(e) { alert("Import failed: " + e.message); }
}

async function fetchModels() {
    try {
        const res = await fetch('https://gen.pollinations.ai/image/models');
        const models = await res.json();
        const sel = document.getElementById('set-model');
        if (sel) {
            sel.innerHTML = "";
            models.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.name; opt.innerText = m.name + (m.paid_only ? ' *' : '');
                sel.appendChild(opt);
            });
            sel.value = state.settings.model || "gptimage";
        }
    } catch(e) {}

    try {
        const txtRes = await fetch('https://gen.pollinations.ai/text/models');
        const txtModels = await txtRes.json();
        const tsel = document.getElementById('set-text-model');
        if (tsel) {
            tsel.innerHTML = "";
            txtModels.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.name; opt.innerText = m.name + (m.paid_only ? ' *' : '');
                tsel.appendChild(opt);
            });
            tsel.value = state.settings.textModel || "gemini-search";
        }
    } catch(e) {}
}

function setupUI() {
    loadEditorPrompt();
    const badge = document.getElementById('profile-badge');
    if (badge) badge.innerText = "PROFILE: " + (state.currentProfile || "DEFAULT");
    
    document.getElementById('set-quality').value = state.settings.quality;
    if (document.getElementById('set-text-model')) document.getElementById('set-text-model').value = state.settings.textModel || "gemini-search";
    document.getElementById('set-res').value = state.settings.resolution;
    document.getElementById('set-overlay').checked = state.settings.overlayLabel;
    document.getElementById('set-apikey').value = state.settings.apiKey;
    if (document.getElementById('set-sync-secret')) document.getElementById('set-sync-secret').value = state.settings.syncSecret || "";
    document.getElementById('set-loc-mode').value = state.settings.locMode;
    document.getElementById('set-transparent').checked = state.settings.transparent;
    document.getElementById('set-safe').checked = state.settings.safe;
    document.getElementById('set-enhance').checked = state.settings.enhance;
    document.getElementById('set-seed-enable').checked = state.settings.seedEnable;
    document.getElementById('set-seed').value = state.settings.seed;
    document.getElementById('set-neg-enable').checked = state.settings.negEnable;
    document.getElementById('set-neg').value = state.settings.negativePrompt;
    toggleCustomLoc(); renderTokens();
}

function renderTokens() {
    const chipContainer = document.getElementById('token-chips');
    if(!chipContainer) return;
    chipContainer.innerHTML = "";
    TOKENS_LIST.forEach(t => {
        const c = document.createElement('div');
        c.className = 'chip'; c.innerText = t;
        c.onclick = () => {
            const area = document.getElementById('prompt-editor');
            const start = area.selectionStart; const end = area.selectionEnd;
            area.setRangeText(t, start, end, 'end'); saveEditorPrompt();
        };
        chipContainer.appendChild(c);
    });
}

function loadEditorPrompt() {
    const mode = document.getElementById('prompt-mode').value;
    if (mode === 'day') document.getElementById('prompt-editor').value = state.settings.promptDay;
    else if (mode === 'night') document.getElementById('prompt-editor').value = state.settings.promptNight;
    else if (mode === 'poidomestic') document.getElementById('prompt-editor').value = state.settings.promptPOIDomestic || DEFAULT_POI_DOMESTIC_STR;
    else if (mode === 'poiintl') document.getElementById('prompt-editor').value = state.settings.promptPOIIntl || DEFAULT_POI_INTL_STR;
}

function saveEditorPrompt() {
    const mode = document.getElementById('prompt-mode').value;
    const val = document.getElementById('prompt-editor').value;
    if (mode === 'day') state.settings.promptDay = val;
    else if (mode === 'night') state.settings.promptNight = val;
    else if (mode === 'poidomestic') state.settings.promptPOIDomestic = val;
    else if (mode === 'poiintl') state.settings.promptPOIIntl = val;
    save();
}

function syncSettings() {
    state.settings.quality = document.getElementById('set-quality').value;
    state.settings.model = document.getElementById('set-model').value;
    if (document.getElementById('set-text-model')) state.settings.textModel = document.getElementById('set-text-model').value;
    state.settings.resolution = document.getElementById('set-res').value;
    state.settings.style = document.getElementById('set-style').value;
    state.settings.overlayLabel = document.getElementById('set-overlay').checked;
    state.settings.apiKey = document.getElementById('set-apikey').value;
    if (document.getElementById('set-sync-secret')) state.settings.syncSecret = document.getElementById('set-sync-secret').value;
    state.settings.locMode = document.getElementById('set-loc-mode').value;
    state.settings.transparent = document.getElementById('set-transparent').checked;
    state.settings.safe = document.getElementById('set-safe').checked;
    state.settings.enhance = document.getElementById('set-enhance').checked;
    state.settings.seedEnable = document.getElementById('set-seed-enable').checked;
    state.settings.seed = parseInt(document.getElementById('set-seed').value);
    state.settings.negEnable = document.getElementById('set-neg-enable').checked;
    state.settings.negativePrompt = document.getElementById('set-neg').value;
    save();
}

function toggleCustomLoc() {
    const isCustom = document.getElementById('set-loc-mode').value === 'custom';
    const row = document.getElementById('row-custom-list');
    if (row) row.style.display = isCustom ? 'flex' : 'none';
    if (isCustom) renderCustomLocList();
}

function renderCustomLocList() {
    const sel = document.getElementById('set-custom-loc');
    if (!sel) return;
    sel.innerHTML = '<option value="">Choose...</option>';
    state.settings.locations.forEach((loc, i) => {
        const opt = document.createElement('option');
        opt.value = i; opt.innerText = loc.city + (loc.state ? ", " + loc.state : "");
        sel.appendChild(opt);
    });
    if (state.settings.customLocIdx !== undefined) sel.value = state.settings.customLocIdx;
}

function applySavedLoc(forceIdx) {
    const sel = document.getElementById('set-custom-loc');
    let idx = forceIdx !== undefined ? forceIdx : (sel ? sel.value : "");
    if (idx === "" || idx === null) return;
    
    state.settings.customLocIdx = parseInt(idx);
    if (sel && sel.value !== idx) sel.value = idx;
    
    const loc = state.settings.locations[idx];
    if (!loc) return;
    
    state.lat = loc.lat; state.lon = loc.lon;
    state.city = loc.city; state.state = loc.state || ""; state.country = loc.country || "";
    document.getElementById('coord-text').innerText = "SAVED: " + state.lat.toFixed(2);
    save();
}

// --- LOCATION MODAL ---
function openLocationModal() {
    document.getElementById('modal-loc-city').value = "";
    document.getElementById('modal-loc-state').value = "";
    document.getElementById('modal-loc-country').value = "";
    document.getElementById('modal-loc-lat').value = "";
    document.getElementById('modal-loc-lon').value = "";
    document.getElementById('loc-modal').style.display = 'flex';
}
function closeLocationModal() { document.getElementById('loc-modal').style.display = 'none'; }

async function autofillLocation() {
    const city = document.getElementById('modal-loc-city').value;
    const stateVal = document.getElementById('modal-loc-state').value;
    const country = document.getElementById('modal-loc-country').value;
    if (!city) return alert("Enter at least a city name");
    
    const btn = document.getElementById('btn-loc-autofill');
    btn.disabled = true; btn.innerText = "Finding...";
    
    try {
        let q = city;
        if (stateVal) q += ", " + stateVal;
        if (country) q += ", " + country;
        const res = await fetch("/api/proxy/nominatim?q=" + encodeURIComponent(q));
        const data = await res.json();
        if (data && data.length > 0) {
            const top = data[0];
            document.getElementById('modal-loc-lat').value = parseFloat(top.lat).toFixed(4);
            document.getElementById('modal-loc-lon').value = parseFloat(top.lon).toFixed(4);
            if (top.address) {
                document.getElementById('modal-loc-city').value = top.address.city || top.address.town || top.address.village || city;
                document.getElementById('modal-loc-state').value = top.address.state || stateVal || "";
                document.getElementById('modal-loc-country').value = top.address.country || country || "";
            }
        } else { alert("No results found for " + q); }
    } catch(e) { alert("Autofill error: " + e.message); } finally { btn.disabled = false; btn.innerText = "✨ AI Autofill"; }
}

function saveLocationModal() {
    const city = document.getElementById('modal-loc-city').value;
    const lat = parseFloat(document.getElementById('modal-loc-lat').value);
    const lon = parseFloat(document.getElementById('modal-loc-lon').value);
    if (!city || isNaN(lat) || isNaN(lon)) return alert("City, Lat, and Lon are required");
    state.settings.locations.push({ city, state: document.getElementById('modal-loc-state').value, country: document.getElementById('modal-loc-country').value, lat, lon });
    renderLocations(); save(); closeLocationModal();
}

function renderLocations() {
    const list = document.getElementById('location-list'); if(!list) return;
    list.innerHTML = "";
    state.settings.locations.forEach((loc, i) => {
        const row = document.createElement('div'); row.className = 'list-item';
        row.innerHTML = '<div><div class="list-item-title">' + loc.city + '</div><div class="list-item-sub">' + (loc.state || loc.country) + ' (' + loc.lat.toFixed(2) + ', ' + loc.lon.toFixed(2) + ')</div></div><button onclick="deleteLocation(' + i + ')" style="color:#ff3b30; background:none; border:none;">Del</button>';
        list.appendChild(row);
    });
    renderPOISelectors(); 
}
function deleteLocation(i) { state.settings.locations.splice(i, 1); renderLocations(); save(); }

// --- POI MODAL ---
function openPOIModal() {
    const sel = document.getElementById('modal-poi-city'); sel.innerHTML = "";
    state.settings.locations.forEach(loc => {
        const opt = document.createElement('option'); opt.value = loc.city.toLowerCase(); opt.innerText = loc.city; sel.appendChild(opt);
    });
    document.getElementById('poi-modal').style.display = 'flex';
}
function closePOIModal() { document.getElementById('poi-modal').style.display = 'none'; }

async function sanitizePOIModal() {
    const name = document.getElementById('modal-poi-name').value;
    const desc = document.getElementById('modal-poi-desc').value;
    const city = document.getElementById('modal-poi-city').value;
    if (!name) return alert("Enter a name first");
    const btn = document.getElementById('btn-modal-sanitize');
    btn.disabled = true; btn.innerText = "Sanitizing...";
    try {
        const res = await fetch("/api/proxy/sanitize?name=" + encodeURIComponent(name) + "&description=" + encodeURIComponent(desc) + "&city=" + encodeURIComponent(city) + (state.settings.apiKey ? "&key="+state.settings.apiKey : ""));
        const data = await res.json();
        document.getElementById('modal-poi-name').value = data.name;
        document.getElementById('modal-poi-desc').value = data.description;
    } finally { btn.disabled = false; btn.innerText = "✨ AI Sanitize"; }
}

function savePOIModal() {
    const city = document.getElementById('modal-poi-city').value;
    const name = document.getElementById('modal-poi-name').value;
    const description = document.getElementById('modal-poi-desc').value;
    if (!city || !name) return alert("City and Name required");
    if (!state.settings.poiCache[city]) state.settings.poiCache[city] = [];
    state.settings.poiCache[city].push({name, description});
    renderPOISelectors(); save(); closePOIModal();
}

async function discoverPOIs(btn) {
    const city = state.city;
    const isUS = state.country.toLowerCase().includes("usa") || state.country.toLowerCase().includes("united states");
    let rawPrompt = isUS ? (state.settings.promptPOIDomestic || DEFAULT_POI_DOMESTIC_STR) : (state.settings.promptPOIIntl || DEFAULT_POI_INTL_STR);
    rawPrompt = rawPrompt.split('{city}').join(state.city).split('{state_region}').join(state.state).split('{country}').join(state.country);
    
    if(btn) { btn.disabled = true; btn.innerText = "Finding..."; }
    try {
        const payload = { prompt: rawPrompt, model: state.settings.textModel || "gemini-search", key: state.settings.apiKey };
        const res = await fetch("/api/proxy/poi", { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await res.json();
        const cityKey = city.toLowerCase().trim();
        if (!state.settings.poiCache[cityKey]) state.settings.poiCache[cityKey] = [];
        if (Array.isArray(data)) state.settings.poiCache[cityKey] = [...state.settings.poiCache[cityKey], ...data];
        else if (data.name) state.settings.poiCache[cityKey].push({name: data.name, description: data.description});
        renderPOISelectors(); save();
    } catch(e) { console.error("Discovery error:", e); } finally { if(btn) { btn.disabled = false; btn.innerText = "✨ AI Discover"; } }
}

function renderPOISelectors() {
    const sel = document.getElementById('poi-city-select'); if(!sel) return;
    sel.innerHTML = "";
    const cachedCities = Object.keys(state.settings.poiCache);
    const savedCities = state.settings.locations.map(l => l.city.toLowerCase());
    const allCities = [...new Set([...cachedCities, ...savedCities])].sort();
    allCities.forEach(city => {
        const opt = document.createElement('option'); opt.value = city; opt.innerText = city.toUpperCase(); sel.appendChild(opt);
    });
    renderPOIs();
}
function renderPOIs() {
    const list = document.getElementById('poi-list'); if(!list) return;
    const city = document.getElementById('poi-city-select').value;
    list.innerHTML = ""; if (!city || !state.settings.poiCache[city]) return;
    state.settings.poiCache[city].forEach((p, i) => {
        const row = document.createElement('div'); row.className = 'list-item';
        row.innerHTML = `<div><div class="list-item-title">${p.name}</div><div class="list-item-sub">${p.description || ""}</div></div>
                         <div>
                            <button onclick="consultPOI('${city}', ${i})" style="color:var(--accent-color); background:none; border:none; margin-right:10px;">Consult</button>
                            <button onclick="deletePOI('${city}', ${i})" style="color:#ff3b30; background:none; border:none;">Del</button>
                         </div>`;
        list.appendChild(row);
    });
}
function deletePOI(city, i) { state.settings.poiCache[city].splice(i, 1); renderPOIs(); save(); }
function deleteCity() {
    const city = document.getElementById('poi-city-select').value;
    if (!city || !confirm(`Delete all landmarks for ${city.toUpperCase()}?`)) return;
    delete state.settings.poiCache[city]; renderPOISelectors(); save();
}

async function consultPOI(city, i) {
    const p = state.settings.poiCache[city][i]; 
    const btn = event ? event.currentTarget : null;
    if(btn) { btn.disabled = true; btn.innerText = "..."; }
    try {
        const res = await fetch("/api/proxy/consult?name=" + encodeURIComponent(p.name) + "&city=" + encodeURIComponent(city) + (state.settings.apiKey ? "&key="+state.settings.apiKey : ""));
        const data = await res.json(); p.description = data.description; renderPOIs(); save();
    } finally { if(btn) { btn.disabled = false; btn.innerText = "Consult"; } }
}

async function handleGenerate() {
    if (state.isGenerating) return;
    state.isGenerating = true; const btn = document.getElementById('btn-gen-ui');
    btn.disabled = true; btn.innerText = "Locating...";
    startFireflies(); document.getElementById('firefly-canvas').classList.add('active');
    try {
        const envRes = await fetch("/api/proxy/weather?lat=" + state.lat + "&lon=" + state.lon);
        const env = await envRes.json(); const cityKey = state.city.toLowerCase().trim();
        if (!state.settings.poiCache[cityKey] || state.settings.poiCache[cityKey].length === 0) { btn.innerText = "Discovering..."; await discoverPOIs(null); }
        const pois = state.settings.poiCache[cityKey] || [{name: state.city, description: "A beautiful view"}];
        const poi = pois[Math.floor(Math.random() * pois.length)]; const theme = getThemeForDate();
        btn.innerText = "Dreaming..."; const rawP = buildPrompt(env, poi, theme);
        const cleanP = browserSanitize(rawP) || "Wallpaper of " + poi.name;
        
        const [w, h] = state.settings.resolution.split('x'); const seed = state.settings.seedEnable ? state.settings.seed : Math.floor(Math.random()*999999);
        let url = "https://gen.pollinations.ai/image/" + encodeURIComponent(cleanP) + "?width=" + w + "&height=" + h + "&seed=" + seed + "&model=" + state.settings.model + "&nologo=true";
        if (state.settings.apiKey) url += "&key=" + state.settings.apiKey;
        if (state.settings.transparent) url += "&transparent=true";
        if (state.settings.safe === false) url += "&safe=false";
        if (state.settings.enhance) url += "&enhance=true";
        if (state.settings.negEnable && state.settings.negativePrompt) url += "&negative_prompt=" + encodeURIComponent(state.settings.negativePrompt);
        
        const img = document.getElementById('result-image'); img.classList.remove('loaded'); img.src = url;
        img.onload = () => {
            img.classList.add('loaded'); stopFireflies(); document.getElementById('firefly-canvas').classList.remove('active');
            document.getElementById('placeholder').style.display = 'none';
            if (state.settings.overlayLabel) { document.getElementById('poi-label').innerText = poi.name; document.getElementById('poi-label').style.display = 'block'; document.getElementById('info-overlay').style.display = 'none'; }
            else { document.getElementById('poi-label').style.display = 'none'; document.getElementById('info-overlay').style.display = 'block'; document.getElementById('theme-tag').innerText = theme.toUpperCase(); document.getElementById('poi-name').innerText = poi.name; document.getElementById('poi-desc').innerText = poi.description || ""; }
            document.getElementById('btn-save-ui').style.display = 'block'; btn.innerText = "Generate Wallpaper"; btn.disabled = false; state.isGenerating = false;
        };
    } catch(e) { alert("Error: " + e.message); btn.disabled = false; btn.innerText = "Generate Wallpaper"; state.isGenerating = false; stopFireflies(); }
}

function buildPrompt(env, poi, theme) {
    const isDay = env.is_day; let p = isDay ? state.settings.promptDay : state.settings.promptNight;
    const now = new Date();
    const vars = { "{style}": state.settings.style, "{poi_name}": poi.name, "{poi_desc}": poi.description || "", "{city}": state.city, "{state_region}": state.state, "{country}": state.country, "{time_of_day}": isDay ? "Daytime" : "Nighttime", "{datetime}": now.toLocaleString(), "{weather}": env.weather_desc, "{temperature}": env.temp + "°F", "{theme}": theme, "{sunrise}": env.sunrise, "{sunset}": env.sunset, "{uv_index}": env.uv_index, "{visibility}": env.visibility, "{cloud_cover}": env.cloud_cover, "{wind_speed}": env.wind_speed, "{moon_phase}": env.moon_phase, "{moon_illumination}": env.moon_illumination + " percent", "{moonrise}": env.moonrise, "{moonset}": env.moonset };
    for (const [k, v] of Object.entries(vars)) { p = p.split(k).join(v || ""); }
    if (state.settings.quality === 'high') p += ", 8k resolution, masterpiece";
    if (state.settings.quality === 'hd') p += ", 16k resolution, cinematic lighting";
    return p;
}

function browserSanitize(input) { return input.toString().replace(/[\n\r]/g, " ").replace(/%/g, " percent").replace(/[&#?\/\\"]/g, "").trim(); }

function switchTab(tab, btn) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tab + '-view').classList.add('active'); if (btn) btn.classList.add('active');
}
function switchSubTab(tab) {
    document.querySelectorAll('.sub-view').forEach(v => v.style.display = 'none');
    const target = document.getElementById(tab === 'prompts' ? 'sub-prompts-data' : 'sub-' + tab);
    if (target) target.style.display = 'block';
    ['themes', 'pois', 'locations', 'styles', 'prompts'].forEach(t => {
        const btn = document.getElementById('tab-' + (t === 'prompts' ? 'data-prompts' : t));
        if(btn) btn.classList.toggle('active', tab === t);
    });
}

function requestLocation() {
    if (!navigator.geolocation || state.settings.locMode === 'custom') return;
    navigator.geolocation.getCurrentPosition(pos => {
        state.lat = pos.coords.latitude; state.lon = pos.coords.longitude;
        document.getElementById('coord-text').innerText = "GPS: " + state.lat.toFixed(2);
        fetch("/api/proxy/nominatim?lat=" + state.lat + "&lon=" + state.lon).then(r => r.json()).then(data => {
            state.city = data.address.city || data.address.town || data.address.village || "Unknown";
            state.state = data.address.state || ""; state.country = data.address.country || "";
            renderPOISelectors();
        });
    });
}

function getThemeForDate() {
    const now = new Date(); const ord = (now.getMonth() + 1) * 100 + now.getDate();
    const match = state.settings.themes.find(t => ord >= t.Begin && ord <= t.End);
    return match ? match.Theme : "General";
}

function startFireflies() {
    const canvas = document.getElementById('firefly-canvas'); if(!canvas) return;
    const ctx = canvas.getContext('2d'); canvas.width = canvas.parentElement.clientWidth; canvas.height = canvas.parentElement.clientHeight;
    const particles = Array.from({length: 40}, () => ({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, size: Math.random() * 2 + 1, speed: Math.random() * 0.8 + 0.2, phase: Math.random() * 10 }));
    function loop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => { p.y -= p.speed; if (p.y < 0) p.y = canvas.height; ctx.globalAlpha = Math.pow((Math.sin(Date.now()/300 + p.phase) + 1)/2, 8); ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill(); });
        animId = requestAnimationFrame(loop);
    }
    loop();
}
function stopFireflies() { cancelAnimationFrame(animId); }
function resetApp() { if(confirm("Wipe everything?")) { localStorage.clear(); location.reload(); } }
function resetPrompts() { if(confirm("Reset templates?")) { state.settings.promptDay = DEFAULT_DAY_STR; state.settings.promptNight = DEFAULT_NIGHT_STR; loadEditorPrompt(); save(); } }
function openFullRes() { const src = document.getElementById('result-image').src; if (src) window.open(src, '_blank'); }

function renderStyles() {
    const list = document.getElementById('style-list'); const sel = document.getElementById('set-style');
    if(!list || !sel) return;
    list.innerHTML = ""; sel.innerHTML = "";
    state.settings.styles.forEach((s, i) => {
        const row = document.createElement('div'); row.className = 'list-item';
        row.innerHTML = '<div><div class="list-item-title">' + s + '</div></div><button onclick="deleteStyle(' + i + ')" style="color:#ff3b30; background:none; border:none;">Del</button>';
        list.appendChild(row);
        const opt = document.createElement('option'); opt.value = s; opt.innerText = s; sel.appendChild(opt);
    });
    sel.value = state.settings.style || state.settings.styles[0];
}
function addStylePrompt() { const s = prompt("New Style:"); if(s) { state.settings.styles.push(s); renderStyles(); save(); } }
function deleteStyle(i) { state.settings.styles.splice(i, 1); renderStyles(); save(); }

function renderThemes() {
    const list = document.getElementById('theme-list'); if(!list) return;
    list.innerHTML = "";
    state.settings.themes.forEach((t, i) => {
        const row = document.createElement('div'); row.className = 'list-item';
        row.innerHTML = '<div><div class="list-item-title">' + t.Theme + '</div><div class="list-item-sub">' + t.Begin + ' - ' + t.End + '</div></div><button onclick="deleteTheme(' + i + ')" style="color:#ff3b30; background:none; border:none;">Del</button>';
        list.appendChild(row);
    });
}
function addThemePrompt() { const Theme = prompt("Theme:"); const Begin = prompt("Start MMDD:"); const End = prompt("End MMDD:"); if (Theme && Begin && End) { state.settings.themes.push({Theme, Begin: parseInt(Begin), End: parseInt(End)}); renderThemes(); save(); } }
function deleteTheme(i) { state.settings.themes.splice(i, 1); renderThemes(); save(); }

function renderProfiles() {
    const list = document.getElementById('profile-list'); if(!list) return;
    list.innerHTML = "";
    state.settings.profiles.forEach((p, i) => {
        const row = document.createElement('div'); row.className = 'list-item';
        row.innerHTML = `<div><div class="list-item-title">${p.name}</div><div class="list-item-sub">Local</div></div>
                         <div><button onclick="loadProfile(${i})" style="color:var(--accent-color); background:none; border:none; margin-right:10px;">Load</button><button onclick="deleteProfile(${i})" style="color:#ff3b30; background:none; border:none;">Del</button></div>`;
        list.appendChild(row);
    });
}

function renderRemoteProfileList() {
    const list = document.getElementById('remote-profile-list'); if(!list) return;
    list.innerHTML = "";
    state.remoteProfiles.forEach(name => {
        const row = document.createElement('div'); row.className = 'list-item';
        const active = (name === state.currentProfile) ? " (Active)" : "";
        row.innerHTML = `<div><div class="list-item-title">${name}${active}</div><div class="list-item-sub">Cloud</div></div>
                         <div>
                            <button onclick="switchRemoteProfile('${name}')" style="color:var(--accent-color); background:none; border:none; margin-right:10px;">Switch</button>
                            <button onclick="deleteRemoteProfile('${name}')" style="color:#ff3b30; background:none; border:none;">Del</button>
                         </div>`;
        list.appendChild(row);
    });
}

async function deleteRemoteProfile(name) {
    if (name === 'default') return alert("Cannot delete default profile");
    if (!confirm(`Delete cloud profile '${name}'?`)) return;
    try {
        await fetch(`/api/config?profile=${encodeURIComponent(name)}&secret=${encodeURIComponent(state.settings.syncSecret)}`, { method: 'DELETE' });
        await refreshRemoteProfiles();
    } catch(e) {}
}

async function createRemoteProfile() {
    const name = prompt("New Cloud Profile Name:");
    if (!name) return;
    state.currentProfile = name;
    await save(); // This pushes current settings to the new profile key
}
function saveProfile() { const name = document.getElementById('new-profile-name').value; if (!name) return alert("Enter name"); state.settings.profiles.push({ name, ...state.settings }); renderProfiles(); save(); document.getElementById('new-profile-name').value = ""; }
function loadProfile(i) { state.settings = { ...state.settings, ...JSON.parse(JSON.stringify(state.settings.profiles[i])) }; setupUI(); renderThemes(); renderPOISelectors(); renderStyles(); renderLocations(); alert("Loaded: " + state.settings.name); }
function deleteProfile(i) { state.settings.profiles.splice(i, 1); renderProfiles(); save(); }

function exportData(type) {
    let data = state.settings[type] || state.settings;
    if (type === 'prompts') data = { day: state.settings.promptDay, night: state.settings.promptNight };
    document.getElementById('import-title').innerText = "Export " + type.toUpperCase();
    document.getElementById('import-text').value = JSON.stringify(data, null, 2);
    document.getElementById('import-modal').classList.add('active');
}
function clearCategory(type) { if (confirm("Wipe " + type + "?")) { if(type === 'themes') state.settings.themes = []; else if(type === 'styles') state.settings.styles = DEFAULT_STYLES; else if(type === 'locations') state.settings.locations = []; else state.settings.poiCache = {}; save(); location.reload(); } }
