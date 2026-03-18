// Lumina Aeris Web & Worker - App Logic v1.19.1
// Mandate: NO Truncation. NO Minification. NO Missing Logic.

// --- 1. GLOBALS & DEFAULT CONSTANTS ---
const STORAGE_KEY = 'lumina_v1.19.1';
const DEFAULT_DAY_STR = "Generate a {style} style image of {poi_name} in {city}, {state_region}. POI description: {poi_desc}. Ensure architectural and geographical accuracy based on real-world references. Time: {time_of_day} {datetime}. Weather: {weather}, {temperature}. Sun at {sunrise} and {sunset} for realistic positioning. Adjust sun visibility based on {weather}. Include the UV index and visibility in the depiction. Account for cloud cover to influence lighting and shadows. Safe Zone Framing: keep significant elements centered and critical content within 80-90 percent of the image width and height. Atmosphere: incorporate the theme of {theme} as a subtle, realistic element. Apply a professional, natural-looking auto-enhancement: brighten shadows, recover highlights, boost midtone contrast, and enhance clarity while preserving a photorealistic look.";
const DEFAULT_NIGHT_STR = "Generate a {style} style image of {poi_name} in {city}, {state_region}. POI description: {poi_desc}. Ensure architectural and geographical accuracy based on real-world references. Time: {time_of_day} {datetime}. Weather: {weather}, {temperature}. Moon in {moon_phase} with {moon_illumination} illumination. Account for moonrise {moonrise} and moonset {moonset} for realistic positioning. Adjust moon visibility based on {weather}. Safe Zone Framing: keep significant elements centered and critical content within 80-90 percent of the image width and height. Atmosphere: incorporate the theme of {theme} as a subtle, realistic element. Apply a professional, natural-looking auto-enhancement: brighten shadows, recover highlights, boost midtone contrast, and enhance clarity while preserving a photorealistic look.";

// Expert POI Discovery Prompt (v1.19.1)
const DEFAULT_POI_DISCOVERY_PROMPT = "You are an expert on points of interest and other unique and notable places of things views or vistas of requested locations. Do not cite sources or any additional information beyond returning one item per line with no formatting. Task: Generate a list of up to 30 visually unique points of interest, landmarks, or vistas in or nearby the city of {city} in the state of {state}. Format Rules: 1. Output ONLY a raw JSON array of objects. 2. Do NOT include markdown code blocks (no backticks). 3. Do NOT include any introductory or concluding text. 4. Each object must have exactly two keys: 'name' and 'description'. 5. 'description' must be 1-2, concise sentences that visually describes the named point of interest.";

const TOKENS_LIST = ["{style}", "{poi_name}", "{poi_desc}", "{city}", "{state_region}", "{country}", "{time_of_day}", "{datetime}", "{weather}", "{temperature}", "{theme}", "{moon_phase}", "{moon_illumination}", "{moonrise}", "{moonset}", "{sunrise}", "{sunset}", "{uv_index}", "{visibility}", "{cloud_cover}", "{wind_speed}"];
const DEFAULT_STYLES = ["Hyper photo realistic", "Cinematic photography", "Watercolor painting", "Oil painting", "Pencil sketch", "Crayon drawing", "Claymation", "3D animation render", "Pixar-style 3D illustration", "Flat vector illustration", "Paper craft collage", "Ukiyo-e woodblock print", "Impressionist painting", "Pixel art", "Neon noir", "Vintage film photograph", "Comic book art", "Stained glass illustration"];

var state = {
    currentTab: 'home', isGenerating: false,
    lat: 45.52, lon: -122.67, city: "Portland", state: "Oregon", country: "USA",
    importType: '', currentProfile: 'default', remoteProfiles: [],
    settings: {
        appearance: 'auto',
        promptDay: DEFAULT_DAY_STR, promptNight: DEFAULT_NIGHT_STR,
        promptPOIDomestic: DEFAULT_POI_DISCOVERY_PROMPT, promptPOIIntl: DEFAULT_POI_DISCOVERY_PROMPT,
        quality: "medium", model: "gptimage", textModel: "gemini-search", style: "Hyper photo realistic", resolution: "1290x2796",
        customResW: 1290, customResH: 2796,
        overlayLabel: false, apiKey: "", syncSecret: "", locMode: "gps", customCity: "Portland, Oregon",
        themes: [{"Begin":101, "End":103, "Theme":"New Years"}, {"Begin":1015, "End":1031, "Theme":"Halloween"}, {"Begin":1220, "End":1231, "Theme":"Holiday Season"}],
        poiCache: {}, profiles: [],
        styles: DEFAULT_STYLES,
        locations: [{"city": "Portland", "state": "Oregon", "country": "USA", "lat": 45.52, "lon": -122.67}],
        customLocIdx: 0,
        transparent: false, safe: true, enhance: false, seedEnable: false, seed: -1, negativePrompt: "", negEnable: false
    }
};

let animId = null;
let isDirty = false;
var currentWeatherEffect = 'stardust';
var weatherAstro = null;

// --- 2. INITIALIZATION ---
window.onload = async () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try { Object.assign(state.settings, JSON.parse(saved)); } catch(e) {}
    } else {
        // Migration logic
        const oldKeys = ['lumina_v1.19.0', 'lumina_v1.18.1', 'lumina_v1.16.4'];
        for (const k of oldKeys) {
            const old = localStorage.getItem(k);
            if (old) { try { Object.assign(state.settings, JSON.parse(old)); save(); break; } catch(e) {} }
        }
    }
    
    await applyAppearance();

    if (state.settings.syncSecret) {
        await refreshRemoteProfiles();
        await switchRemoteProfile(state.currentProfile || 'default');
    }
    
    await fetchModels();
    setupUI(); renderThemes(); renderPOISelectors(); renderProfiles(); renderStyles(); renderLocations(); updateSyncUI();
    
    if (state.settings.locMode === 'gps') requestLocation();
    else if (state.settings.locMode === 'custom') applySavedLoc(state.settings.customLocIdx || 0);
};

async function applyAppearance() {
    const body = document.body;
    let mode = state.settings.appearance || 'auto';
    
    if (mode === 'auto') {
        try {
            const res = await fetch(`/api/proxy/weather?lat=${state.lat}&lon=${state.lon}`);
            if (res.ok) {
                const data = await res.json();
                weatherAstro = data;
                mode = data.is_day ? 'light' : 'dark';
                
                const desc = (data.weather_desc || "").toLowerCase();
                if (desc.includes("rain") || desc.includes("drizzle")) currentWeatherEffect = "rain";
                else if (desc.includes("snow") || desc.includes("ice")) currentWeatherEffect = "snow";
                else if (!data.is_day) currentWeatherEffect = "moon";
                else currentWeatherEffect = "stardust";
            } else {
                const hour = new Date().getHours();
                mode = (hour >= 6 && hour < 18) ? 'light' : 'dark';
            }
        } catch(e) {
            const hour = new Date().getHours();
            mode = (hour >= 6 && hour < 18) ? 'light' : 'dark';
        }
    }
    
    body.classList.remove('theme-light', 'theme-dark');
    body.classList.add('theme-' + mode);
    startWeatherEngine();
}

function updateSyncUI() {
    const btn = document.getElementById('btn-cloud-sync');
    if (!btn) return;
    if (isDirty) {
        btn.classList.add('dirty');
        btn.innerText = "☁️ Sync Changes";
    } else {
        btn.classList.remove('dirty');
        btn.innerText = "☁️ Cloud Synced";
    }
}

async function refreshRemoteProfiles() {
    if (!state.settings.syncSecret) return;
    try {
        const res = await fetch("/api/profiles?secret=" + encodeURIComponent(state.settings.syncSecret));
        if (res.ok) {
            state.remoteProfiles = await res.json();
            renderRemoteProfileList();
        }
    } catch(e) {}
}

async function switchRemoteProfile(name) {
    if (!state.settings.syncSecret) return;
    try {
        const res = await fetch(`/api/config?profile=${encodeURIComponent(name)}&secret=${encodeURIComponent(state.settings.syncSecret)}`);
        if (res.ok) {
            const remote = await res.json();
            if (remote && (remote.promptDay || remote.settings)) {
                state.settings = remote.settings || remote;
                state.currentProfile = name;
                isDirty = false;
                setupUI(); renderThemes(); renderPOISelectors(); renderStyles(); renderLocations(); renderRemoteProfileList(); 
                await applyAppearance();
                updateSyncUI();
                localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings)); 
            }
        }
    } catch(e) { console.error("Sync Pull failed", e); }
}

async function save() { 
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings)); 
    if (state.settings.syncSecret) {
        try {
            const profile = state.currentProfile || "default";
            await fetch(`/api/config?profile=${encodeURIComponent(profile)}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-Lumina-Secret": state.settings.syncSecret },
                body: JSON.stringify(state.settings)
            });
            await refreshRemoteProfiles();
        } catch(e) {}
    }
}

async function manualCloudSync() {
    const btn = document.getElementById('btn-cloud-sync');
    if (!btn) return;
    const orig = btn.innerText; btn.disabled = true; btn.innerText = "Syncing...";
    try {
        await save();
        isDirty = false; updateSyncUI();
        btn.innerText = "✅ Synced!";
        setTimeout(() => { btn.disabled = false; updateSyncUI(); }, 2000);
    } catch(e) {
        btn.innerText = "❌ Error";
        setTimeout(() => { btn.disabled = false; updateSyncUI(); }, 2000);
    }
}

// ... PART 1 END ...

function openImport(type) { 
    state.importType = type; 
    document.getElementById('import-title').innerText = "Import " + type.toUpperCase(); 
    document.getElementById('import-text').value = ""; 
    document.getElementById('import-modal').classList.add('active'); 
}

function closeImport() { 
    document.getElementById('import-modal').classList.remove('active'); 
}

function confirmImport() {
    let raw = document.getElementById('import-text').value;
    if (!raw) return closeImport();
    
    try {
        const startBrace = raw.indexOf('{');
        const startBracket = raw.indexOf('[');
        let start = -1;
        if (startBrace !== -1 && startBracket !== -1) start = Math.min(startBrace, startBracket);
        else if (startBrace !== -1) start = startBrace;
        else if (startBracket !== -1) start = startBracket;

        const endBrace = raw.lastIndexOf('}');
        const endBracket = raw.lastIndexOf(']');
        let end = Math.max(endBrace, endBracket);

        if (start === -1 || end === -1) throw new Error("No JSON structure detected.");

        let jsonStr = raw.substring(start, end + 1);

        // --- STABLE HEALING LOGIC (v1.19.1) ---
        let cleaned = jsonStr
            .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"') 
            .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'") 
            .replace(/[\u200B-\u200D\uFEFF]/g, "") 
            .replace(/,\s*([\]}])/g, '$1') 
            .replace(/\r?\n|\r/g, ' ') 
            .trim();

        const parsed = JSON.parse(cleaned);
        
        if (state.importType === 'themes') { state.settings.themes = parsed; renderThemes(); }
        else if (state.importType === 'pois') { state.settings.poiCache = parsed; renderPOISelectors(); }
        else if (state.importType === 'styles') { state.settings.styles = parsed; renderStyles(); }
        else if (state.importType === 'locations') { state.settings.locations = parsed; renderLocations(); }
        else if (state.importType === 'full') { 
            Object.assign(state.settings, parsed); 
            setupUI(); renderThemes(); renderPOISelectors(); renderStyles(); renderLocations(); applyAppearance();
        }
        else if (state.importType === 'prompts') { 
            state.settings.promptDay = parsed.day || state.settings.promptDay; 
            state.settings.promptNight = parsed.night || state.settings.promptNight; 
            state.settings.promptPOIDomestic = parsed.poidomestic || state.settings.promptPOIDomestic;
            state.settings.promptPOIIntl = parsed.poiintl || state.settings.promptPOIIntl;
            loadEditorPrompt(); 
        }
        
        isDirty = true; updateSyncUI();
        save();
        alert("Import successful! Mode: " + state.importType.toUpperCase());
        closeImport();
    } catch(e) { 
        console.error("Heal Error:", e);
        alert("Import failed: " + e.message); 
    }
}

function exportData(type) { 
    let data; 
    if (type === 'pois') data = state.settings.poiCache; 
    else if (type === 'themes') data = state.settings.themes; 
    else if (type === 'styles') data = state.settings.styles; 
    else if (type === 'locations') data = state.settings.locations; 
    else if (type === 'prompts') data = { day: state.settings.promptDay, night: state.settings.promptNight, poidomestic: state.settings.promptPOIDomestic, poiintl: state.settings.promptPOIIntl }; 
    else data = state.settings;

    document.getElementById('import-title').innerText = "Export " + type.toUpperCase();
    document.getElementById('import-text').value = JSON.stringify(data, null, 2);
    document.getElementById('import-modal').classList.add('active');
}

function openPOIModal() { 
    const sel = document.getElementById('modal-poi-city');
    if (sel) {
        sel.innerHTML = "";
        state.settings.locations.forEach(loc => {
            const opt = document.createElement('option');
            opt.value = loc.city.toLowerCase();
            opt.innerText = loc.city;
            sel.appendChild(opt);
        });
        sel.value = state.city.toLowerCase();
    }
    document.getElementById('modal-poi-name').value = "";
    document.getElementById('modal-poi-desc').value = "";
    document.getElementById('poi-modal').classList.add('active'); 
}

function closePOIModal() { 
    document.getElementById('poi-modal').classList.remove('active'); 
}

async function savePOIModal() {
    const city = document.getElementById('modal-poi-city').value;
    const name = document.getElementById('modal-poi-name').value;
    const desc = document.getElementById('modal-poi-desc').value;
    if (!city || !name) return alert("City and Name required");
    if (!state.settings.poiCache[city]) state.settings.poiCache[city] = [];
    state.settings.poiCache[city].push({name, description: desc});
    isDirty = true; updateSyncUI();
    renderPOISelectors(); closePOIModal(); save();
}

function openLocationModal() { 
    document.getElementById('modal-loc-city').value = ""; 
    document.getElementById('modal-loc-state').value = ""; 
    document.getElementById('modal-loc-country').value = ""; 
    document.getElementById('modal-loc-lat').value = ""; 
    document.getElementById('modal-loc-lon').value = ""; 
    document.getElementById('loc-modal').classList.add('active'); 
}

function closeLocationModal() { 
    document.getElementById('loc-modal').classList.remove('active'); 
}

async function sanitizePOIModal() {
    const name = document.getElementById('modal-poi-name').value;
    const desc = document.getElementById('modal-poi-desc').value;
    const city = document.getElementById('modal-poi-city').value;
    if (!name) return alert("Enter a name first");
    const btn = document.getElementById('btn-modal-sanitize'); btn.disabled = true; btn.innerText = "Sanitizing...";
    try {
        const res = await fetch("/api/proxy/sanitize?name=" + encodeURIComponent(name) + "&description=" + encodeURIComponent(desc) + "&city=" + encodeURIComponent(city) + (state.settings.apiKey ? "&key="+state.settings.apiKey : ""));
        const data = await res.json(); 
        document.getElementById('modal-poi-name').value = data.name;
        document.getElementById('modal-poi-desc').value = data.description;
    } finally { btn.disabled = false; btn.innerText = "✨ AI Sanitize"; }
}

function saveLocationModal() {
    const city = document.getElementById('modal-loc-city').value; 
    const stateVal = document.getElementById('modal-loc-state').value;
    const countryVal = document.getElementById('modal-loc-country').value;
    const lat = parseFloat(document.getElementById('modal-loc-lat').value); 
    const lon = parseFloat(document.getElementById('modal-loc-lon').value);
    if (!city || isNaN(lat) || isNaN(lon)) return alert("City, Lat, and Lon required");
    state.settings.locations.push({ city, state: stateVal, country: countryVal, lat, lon });
    isDirty = true; updateSyncUI();
    renderLocations(); closeLocationModal(); save();
    if (confirm(`Pre-populate landmarks for ${city.toUpperCase()} with AI?`)) {
        const oldC = { c: state.city, s: state.state, la: state.lat, lo: state.lon };
        state.city = city; state.state = stateVal || ""; state.lat = lat; state.lon = lon;
        discoverPOIs(null).then(() => {
            state.city = oldC.c; state.state = oldC.s; state.lat = oldC.la; state.lon = oldC.lo;
            renderPOISelectors();
        });
    }
}

// ... PART 2 END ...

async function discoverPOIs(btn) {
    const city = state.city;
    const stateVal = state.state || "requested location";
    
    // expert prompt v1.19.1
    const promptStr = DEFAULT_POI_DISCOVERY_PROMPT
        .replace("{city}", city)
        .replace("{state}", stateVal);
    
    if(btn) { btn.disabled = true; btn.innerText = "Searching..."; }
    
    try {
        const payload = { 
            prompt: promptStr, 
            model: state.settings.textModel || "gemini-search", 
            key: state.settings.apiKey 
        };
        const res = await fetch("/api/proxy/poi", { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
        });
        
        const data = await res.json();
        const cityKey = city.toLowerCase().trim();
        if (!state.settings.poiCache[cityKey]) state.settings.poiCache[cityKey] = [];
        
        if (Array.isArray(data)) {
            state.settings.poiCache[cityKey] = [...state.settings.poiCache[cityKey], ...data];
        } else if (data.name) {
            state.settings.poiCache[cityKey].push(data);
        }
        
        isDirty = true; updateSyncUI();
        renderPOISelectors();
        save();
    } catch(e) {
        console.error("Discovery error:", e);
    } finally {
        if(btn) { btn.disabled = false; btn.innerText = "✨ AI Discover"; }
    }
}

function startWeatherEngine() {
    if (animId) cancelAnimationFrame(animId);
    const canvas = document.getElementById('firefly-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;

    const mode = document.body.classList.contains('theme-light') ? 'light' : 'dark';
    const effect = currentWeatherEffect || 'stardust';
    
    const particles = [];
    const color = mode === 'light' ? '40, 40, 40' : '200, 220, 255';
    const twinkle = mode === 'light' ? '255, 180, 0' : '255, 255, 120';

    for (let i = 0; i < 70; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            s: Math.random() * 2 + 0.5,
            v: Math.random() * 1.5 + 0.5,
            beam: Math.random() > 0.8,
            beamH: Math.random() * 100 + 50
        });
    }

    function loop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (effect === 'moon' && weatherAstro) {
            ctx.save();
            ctx.shadowBlur = 60; ctx.shadowColor = "rgba(255, 255, 255, 0.2)";
            ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
            ctx.beginPath(); ctx.arc(canvas.width/2, canvas.height * 0.25, 40, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }

        particles.forEach(p => {
            p.y -= p.v * (effect === 'rain' ? 8 : 1);
            if (p.y < -100) p.y = canvas.height + 100;
            
            const alpha = 0.2 + Math.sin(Date.now()/400 + p.x) * 0.2;
            ctx.fillStyle = `rgba(${color}, ${alpha})`;
            
            if (p.beam && (effect === 'stardust' || effect === 'moon')) {
                ctx.fillStyle = `rgba(${twinkle}, ${alpha * 0.5})`;
                ctx.fillRect(p.x, p.y, 1.5, p.beamH);
            }
            
            ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2); ctx.fill();
        });
        animId = requestAnimationFrame(loop);
    }
    loop();
}

function stopWeatherEngine() { 
    if (animId) cancelAnimationFrame(animId);
    const canvas = document.getElementById('firefly-canvas');
    if (canvas) canvas.classList.remove('active');
}

function toggleAccordion(id) { 
    const el = document.getElementById(id); 
    const chev = document.getElementById('debug-chevron'); 
    const isOpen = el.style.display === 'block'; 
    el.style.display = isOpen ? 'none' : 'block'; 
    if(chev) chev.innerText = isOpen ? '▼' : '▲'; 
}

function switchTab(tab, btn) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const target = document.getElementById(tab + '-view');
    if (target) target.classList.add('active');
    if (btn) btn.classList.add('active');
    state.currentTab = tab;
}

function switchSubTab(tab) {
    document.querySelectorAll('.sub-view').forEach(v => v.style.display = 'none');
    const target = document.getElementById(tab === 'prompts' ? 'sub-prompts-data' : 'sub-' + tab);
    if (target) target.style.display = 'block';
    document.querySelectorAll('.tabs-sub button').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById('tab-' + tab);
    if (activeBtn) activeBtn.classList.add('active');
}

function renderLocations() {
    const list = document.getElementById('location-list');
    if(list) {
        list.innerHTML = "";
        state.settings.locations.forEach((loc, i) => {
            const row = document.createElement('div');
            row.className = 'list-item';
            row.innerHTML = `<div><div class="list-item-title">${loc.city}</div><div class="list-item-sub">${loc.state || loc.country}</div></div><button onclick="deleteLocation(${i})" style="color:#ff3b30; background:none; border:none;">Del</button>`;
            list.appendChild(row);
        });
    }
    const sel = document.getElementById('set-custom-loc');
    if(sel) {
        sel.innerHTML = "";
        state.settings.locations.forEach((loc, i) => {
            const opt = document.createElement('option');
            opt.value = i; opt.innerText = loc.city + (loc.state ? ", " + loc.state : "");
            sel.appendChild(opt);
        });
        sel.value = state.settings.customLocIdx || 0;
    }
    renderPOISelectors();
}

function deleteLocation(i) { 
    state.settings.locations.splice(i, 1); 
    isDirty = true; updateSyncUI(); renderLocations(); save();
}

function renderPOISelectors() { 
    const sel = document.getElementById('poi-city-select'); 
    if(!sel) return; 
    sel.innerHTML = ""; 
    const cachedCities = Object.keys(state.settings.poiCache); 
    const savedCities = state.settings.locations.map(l => l.city.toLowerCase()); 
    const allCities = [...new Set([...cachedCities, ...savedCities])].sort(); 
    allCities.forEach(city => { 
        const opt = document.createElement('option'); opt.value = city; opt.innerText = city.toUpperCase(); 
        sel.appendChild(opt); 
    }); 
    renderPOIs(); 
}

function renderPOIs() { 
    const list = document.getElementById('poi-list'); 
    if(!list) return; 
    const city = document.getElementById('poi-city-select').value; 
    list.innerHTML = ""; 
    if (!city || !state.settings.poiCache[city]) return; 
    state.settings.poiCache[city].forEach((p, i) => { 
        const row = document.createElement('div'); 
        row.className = 'list-item'; 
        row.innerHTML = `<div><div class="list-item-title">${p.name}</div><div class="list-item-sub">${p.description || ""}</div></div><div><button onclick="consultPOI('${city}', ${i})" style="color:var(--accent-color); background:none; border:none; margin-right:10px;">Consult</button><button onclick="deletePOI('${city}', ${i})" style="color:#ff3b30; background:none; border:none;">Del</button></div>`; 
        list.appendChild(row); 
    }); 
}

function deletePOI(city, i) { 
    state.settings.poiCache[city].splice(i, 1); 
    isDirty = true; updateSyncUI(); renderPOIs(); save();
}

function deleteCity() { 
    const city = document.getElementById('poi-city-select').value; 
    if (!city || !confirm(`Delete all landmarks for ${city.toUpperCase()}?`)) return; 
    delete state.settings.poiCache[city]; 
    isDirty = true; updateSyncUI(); renderPOISelectors(); save();
}

async function consultPOI(city, i) { 
    const p = state.settings.poiCache[city][i]; 
    const btn = event ? event.currentTarget : null; 
    if(btn) { btn.disabled = true; btn.innerText = "..."; } 
    try { 
        const res = await fetch("/api/proxy/consult?name=" + encodeURIComponent(p.name) + "&city=" + encodeURIComponent(city) + (state.settings.apiKey ? "&key="+state.settings.apiKey : "")); 
        const data = await res.json(); p.description = data.description; 
        isDirty = true; updateSyncUI(); renderPOIs(); save();
    } finally { if(btn) { btn.disabled = false; btn.innerText = "Consult"; } } 
}

function renderThemes() { 
    const list = document.getElementById('theme-list'); if(!list) return; list.innerHTML = ""; 
    state.settings.themes.forEach((t, i) => { 
        const row = document.createElement('div'); row.className = 'list-item'; 
        row.innerHTML = `<div><div class="list-item-title">${t.Theme}</div><div class="list-item-sub">${t.Begin} - ${t.End}</div></div><button onclick="deleteTheme(${i})" style="color:#ff3b30; background:none; border:none;">Del</button>`; 
        list.appendChild(row); 
    }); 
}

function addThemePrompt() { 
    const Theme = prompt("Theme:"); const Begin = prompt("Start MMDD:"); const End = prompt("End MMDD:"); 
    if (Theme && Begin && End) { 
        state.settings.themes.push({Theme, Begin: parseInt(Begin), End: parseInt(End)}); 
        isDirty = true; updateSyncUI(); renderThemes(); save();
    } 
}

function deleteTheme(i) { 
    state.settings.themes.splice(i, 1); 
    isDirty = true; updateSyncUI(); renderThemes(); save();
}

function renderStyles() { 
    const list = document.getElementById('style-list'); if(!list) return; list.innerHTML = ""; 
    state.settings.styles.forEach((s, i) => { 
        const row = document.createElement('div'); row.className = 'list-item'; 
        row.innerHTML = `<div><div class="list-item-title">${s}</div></div><button onclick="deleteStyle(${i})" style="color:#ff3b30; background:none; border:none;">Del</button>`; 
        list.appendChild(row); 
    }); 
}

function addStylePrompt() { 
    const s = prompt("New Style:"); 
    if(s) { 
        state.settings.styles.push(s); 
        isDirty = true; updateSyncUI(); renderStyles(); save();
    } 
}

function deleteStyle(i) { 
    state.settings.styles.splice(i, 1); 
    isDirty = true; updateSyncUI(); renderStyles(); save();
}

async function fetchUsageStats() {
    const key = state.settings.apiKey; const container = document.getElementById('usage-stats');
    if (!key) { container.innerHTML = "No API key found."; return; }
    container.innerHTML = "Fetching...";
    try {
        const pRes = await fetch(`/api/proxy/account/profile?key=${encodeURIComponent(key)}`); const pData = await pRes.json();
        const bRes = await fetch(`/api/proxy/account/balance?key=${encodeURIComponent(key)}`); const bData = await bRes.json();
        const balance = bData.balance ?? bData.totalBalance ?? pData.balance ?? "N/A";
        container.innerHTML = `<div>Balance: <span style="color:var(--text-color); font-weight:bold;">${Number(balance).toFixed(2)} Pollen</span></div><div style="margin-top:4px;">Tier: <span style="color:var(--text-color); font-weight:bold;">${pData.tier || "Standard"}</span></div>`;
    } catch(e) { container.innerHTML = "Error fetching stats."; }
}

async function handleGenerate() {
    if (state.isGenerating) return; 
    state.isGenerating = true; 
    const btn = document.getElementById('btn-gen-ui'); 
    btn.disabled = true; btn.innerText = "Locating..."; 

    try {
        const envRes = await fetch("/api/proxy/weather?lat=" + state.lat + "&lon=" + state.lon);
        const env = await envRes.json(); 
        startWeatherEngine(); 
        
        const cityKey = state.city.toLowerCase().trim();
        if (!state.settings.poiCache[cityKey] || state.settings.poiCache[cityKey].length === 0) { 
            btn.innerText = "Discovering..."; await discoverPOIs(null); 
        }
        
        let pois = state.settings.poiCache[cityKey] || [{name: state.city, description: "A beautiful view"}];
        const poi = pois[Math.floor(Math.random() * pois.length)] || pois[0];
        const theme = getThemeForDate(); 
        btn.innerText = "Dreaming..."; 
        
        const rawP = buildPrompt(env, poi, theme); 
        const cleanP = browserSanitize(rawP) || "Wallpaper of " + poi.name;
        
        // Debugger
        document.getElementById('debug-prompt').innerText = cleanP;
        const debugVars = { "City": state.city, "Weather": env.weather_desc, "Theme": theme, "POI": poi.name };
        document.getElementById('debug-vars').innerHTML = Object.entries(debugVars).map(([k,v]) => `<div><span style="opacity:0.5">${k}:</span> ${v}</div>`).join('');

        const [w, h] = state.settings.resolution === 'custom' ? [state.settings.customResW, state.settings.customResH] : state.settings.resolution.split('x');
        const seed = (state.settings.seedEnable && state.settings.seed !== -1) ? state.settings.seed : Math.floor(Math.random()*2147483647);
        
        let url = `https://gen.pollinations.ai/image/${encodeURIComponent(cleanP)}?width=${w}&height=${h}&seed=${seed}&model=${state.settings.model}&nologo=true`;
        if (state.settings.apiKey) url += "&key=" + state.settings.apiKey;
        if (state.settings.transparent) url += "&transparent=true";
        if (state.settings.safe === false) url += "&safe=false";
        if (state.settings.enhance) url += "&enhance=true";
        if (state.settings.quality) url += "&quality=" + state.settings.quality;
        if (state.settings.negEnable && state.settings.negativePrompt) url += "&negative_prompt=" + encodeURIComponent(state.settings.negativePrompt);
        
        const img = document.getElementById('result-image'); 
        img.classList.remove('loaded'); 
        img.src = url;
        img.onload = () => {
            img.classList.add('loaded'); 
            stopWeatherEngine();
            document.getElementById('placeholder').style.display = 'none';
            
            const hasPOI = (env.is_day ? state.settings.promptDay : state.settings.promptNight).includes("{poi_name}");
            if (hasPOI) {
                if (state.settings.overlayLabel) { 
                    document.getElementById('poi-label').innerText = poi.name; 
                    document.getElementById('poi-label').style.display = 'block'; 
                    document.getElementById('info-overlay').style.display = 'none'; 
                } else { 
                    document.getElementById('poi-label').style.display = 'none'; 
                    document.getElementById('info-overlay').style.display = 'block'; 
                    document.getElementById('theme-tag').innerText = theme.toUpperCase(); 
                    document.getElementById('poi-name').innerText = poi.name; 
                    document.getElementById('poi-desc').innerText = poi.description || ""; 
                }
            } else {
                document.getElementById('poi-label').style.display = 'none';
                document.getElementById('info-overlay').style.display = 'none';
            }
            document.getElementById('btn-save-ui').style.display = 'block'; 
            btn.innerText = "Generate Wallpaper"; 
            btn.disabled = false; state.isGenerating = false;
        };
    } catch(e) { 
        alert("Error: " + e.message); 
        btn.disabled = false; btn.innerText = "Generate Wallpaper"; 
        state.isGenerating = false; stopWeatherEngine(); 
    }
}

function buildPrompt(env, poi, theme) {
    const isDay = env.is_day; let p = isDay ? state.settings.promptDay : state.settings.promptNight; const now = new Date();
    const vars = { "{style}": state.settings.style, "{poi_name}": poi.name, "{poi_desc}": poi.description || "", "{city}": state.city, "{state_region}": state.state, "{country}": state.country, "{time_of_day}": isDay ? "Daytime" : "Nighttime", "{datetime}": now.toLocaleString(), "{weather}": env.weather_desc, "{temperature}": env.temp + "°F", "{theme}": theme, "{sunrise}": env.sunrise, "{sunset}": env.sunset, "{uv_index}": env.uv_index, "{visibility}": env.visibility, "{cloud_cover}": env.cloud_cover, "{wind_speed}": env.wind_speed, "{moon_phase}": env.moon_phase, "{moon_illumination}": env.moon_illumination + " percent", "{moonrise}": env.moonrise, "{moonset}": env.moonset };
    for (const [k, v] of Object.entries(vars)) { p = p.split(k).join(v || ""); }
    if (state.settings.quality === 'high') p += ", 8k resolution, masterpiece"; if (state.settings.quality === 'hd') p += ", 16k resolution, cinematic lighting"; return p;
}

function browserSanitize(input) { return input.toString().replace(/[\n\r]/g, " ").replace(/%/g, " percent").replace(/[&#?\/\\"]/g, "").trim(); }

window.switchTab = switchTab; window.switchSubTab = switchSubTab; window.handleGenerate = handleGenerate; window.openFullRes = openFullRes; window.resetApp = resetApp; window.resetPrompts = resetPrompts; window.syncSettings = syncSettings; window.loadEditorPrompt = loadEditorPrompt; window.saveEditorPrompt = saveEditorPrompt; window.openImport = openImport; window.confirmImport = confirmImport; window.closeImport = closeImport; window.exportData = exportData; window.clearCategory = (t) => { state.settings[t] = []; isDirty = true; updateSyncUI(); save(); location.reload(); }; window.openPOIModal = openPOIModal; window.closePOIModal = closePOIModal; window.savePOIModal = savePOIModal; window.sanitizePOIModal = sanitizePOIModal; window.deletePOI = deletePOI; window.discoverPOIs = discoverPOIs; window.deleteCity = deleteCity; window.openLocationModal = openLocationModal; window.closeLocationModal = closeLocationModal; window.saveLocationModal = saveLocationModal; window.autofillLocation = autofillLocation; window.deleteLocation = deleteLocation; window.applySavedLoc = applySavedLoc; window.toggleCustomLoc = toggleCustomLoc; window.addStylePrompt = addStylePrompt; window.deleteStyle = deleteStyle; window.addThemePrompt = addThemePrompt; window.deleteTheme = deleteTheme; window.saveProfile = saveProfile; window.loadProfile = loadProfile; window.deleteProfile = deleteProfile; window.createRemoteProfile = createRemoteProfile; window.switchRemoteProfile = switchRemoteProfile; window.deleteRemoteProfile = deleteRemoteProfile; window.purgeCloudData = purgeCloudData; window.refreshRemoteProfiles = refreshRemoteProfiles; window.manualCloudSync = manualCloudSync; window.fetchUsageStats = fetchUsageStats; window.applyAppearance = applyAppearance; window.toggleCustomRes = toggleCustomRes; window.toggleAccordion = toggleAccordion; window.startWeatherEngine = startWeatherEngine; window.stopWeatherEngine = stopWeatherEngine;
