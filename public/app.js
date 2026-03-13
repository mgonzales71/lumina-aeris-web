// --- 1. GLOBALS & DEFAULT CONSTANTS ---
const DEFAULT_DAY_STR = "Generate a {style} style image of {poi_name} in {city}, {state_region}. POI description: {poi_desc}. Ensure architectural and geographical accuracy based on real-world references. Time: {time_of_day} {datetime}. Weather: {weather}, {temperature}. Sun at {sunrise} and {sunset} for realistic positioning. Adjust sun visibility based on {weather}. Include the UV index and visibility in the depiction. Account for cloud cover to influence lighting and shadows. Safe Zone Framing: keep significant elements centered and critical content within 80-90 percent of the image width and height. Atmosphere: incorporate the theme of {theme} as a subtle, realistic element. Apply a professional, natural-looking auto-enhancement: brighten shadows, recover highlights, boost midtone contrast, and enhance clarity while preserving a photorealistic look.";
const DEFAULT_NIGHT_STR = "Generate a {style} style image of {poi_name} in {city}, {state_region}. POI description: {poi_desc}. Ensure architectural and geographical accuracy based on real-world references. Time: {time_of_day} {datetime}. Weather: {weather}, {temperature}. Moon in {moon_phase} with {moon_illumination} illumination. Account for moonrise {moonrise} and moonset {moonset} for realistic positioning. Adjust moon visibility based on {weather}. Safe Zone Framing: keep significant elements centered and critical content within 80-90 percent of the image width and height. Atmosphere: incorporate the theme of {theme} as a subtle, realistic element. Apply a professional, natural-looking auto-enhancement: brighten shadows, recover highlights, boost midtone contrast, and enhance clarity while preserving a photorealistic look.";
const TOKENS_LIST = ["{style}", "{poi_name}", "{poi_desc}", "{city}", "{state_region}", "{country}", "{time_of_day}", "{datetime}", "{weather}", "{temperature}", "{theme}", "{moon_phase}", "{moon_illumination}", "{moonrise}", "{moonset}", "{sunrise}", "{sunset}", "{uv_index}", "{visibility}", "{cloud_cover}", "{wind_speed}"];

var state = {
    currentTab: 'home', isGenerating: false,
    lat: 45.52, lon: -122.67, city: "Portland", state: "Oregon", country: "USA",
    importType: '',
    settings: {
        promptDay: DEFAULT_DAY_STR, promptNight: DEFAULT_NIGHT_STR,
        quality: "medium", model: "gptimage", style: "Hyper photo realistic", resolution: "1290x2796",
        overlayLabel: false, apiKey: "", locMode: "gps", customCity: "Portland, Oregon",
        themes: [{"Begin":101, "End":103, "Theme":"New Years"}, {"Begin":1015, "End":1031, "Theme":"Halloween"}, {"Begin":1220, "End":1231, "Theme":"Holiday Season"}],
        poiCache: {}, profiles: [],
        styles: ["Hyper photo realistic", "Cinematic photography", "Oil painting", "Anime art", "Cyberpunk", "Architectural drawing"],
        transparent: false, safe: true, enhance: false, seedEnable: false, seed: 0, negativePrompt: "", negEnable: false
    }
};

// --- 2. INITIALIZATION ---
window.onload = async () => {
    const saved = localStorage.getItem('lumina_v1.10.0');
    if (saved) {
        try { 
            const parsed = JSON.parse(saved);
            Object.assign(state.settings, parsed);
        } catch(e) { console.error("Save load error", e); }
    } else {
        const old = localStorage.getItem('lumina_v1.9.9') || localStorage.getItem('lumina_v1.9.8') || localStorage.getItem('lumina_v1.9.7');
        if (old) { 
            try { 
                Object.assign(state.settings, JSON.parse(old)); 
                save(); 
            } catch(e) {} 
        }
    }
    
    if(!state.settings.styles || state.settings.styles.length === 0) state.settings.styles = ["Hyper photo realistic", "Cinematic photography", "Oil painting", "Anime art", "Cyberpunk", "Architectural drawing"];
    if(!state.settings.themes || state.settings.themes.length === 0) state.settings.themes = [{"Begin":101, "End":103, "Theme":"New Years"}, {"Begin":1015, "End":1031, "Theme":"Halloween"}, {"Begin":1220, "End":1231, "Theme":"Holiday Season"}];

    await fetchModels();
    setupUI(); renderThemes(); renderPOISelectors(); renderProfiles(); renderStyles();
    
    if (state.settings.locMode === 'gps') requestLocation();
};

function save() { localStorage.setItem('lumina_v1.10.0', JSON.stringify(state.settings)); }

// --- 3. CORE FUNCTIONS ---
function openImport(type) {
    state.importType = type;
    document.getElementById('import-title').innerText = "Import " + type.toUpperCase();
    document.getElementById('import-text').value = "";
    document.getElementById('import-modal').classList.add('active');
}
function closeImport() { document.getElementById('import-modal').classList.remove('active'); }

/**
 * MEGA-ROBUST confirmImport:
 * Automatically repairs unescaped quotes and bad characters from AI pastes.
 */
function confirmImport() {
    let raw = document.getElementById('import-text').value;
    if (!raw) return closeImport();
    try {
        // 1. Find the bounds correctly
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
        
        // 2. Initial extraction and character cleanup
        let cleaned = raw.substring(start, end + 1);
        cleaned = cleaned.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"') // Smart double quotes
                         .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'") // Smart single quotes
                         .replace(/[\u200B-\u200D\uFEFF]/g, "") // Hidden chars
                         .replace(/\r\n/g, "\n"); 

        // 3. AGGRESSIVE REPAIR for unescaped internal quotes and raw newlines
        // This looks for content inside "key": "content" and fixes the content
        cleaned = cleaned.replace(/":\s*"([\s\S]*?)"\s*([,}])/g, (match, content, suffix) => {
            // Escape any unescaped double quotes inside the content
            let repaired = content.replace(/(?<!\\)"/g, '\\"');
            // Escape raw newlines
            repaired = repaired.replace(/\n/g, "\\n");
            return '": "' + repaired + '"' + suffix;
        });

        // 4. Fix trailing commas
        cleaned = cleaned.replace(/,(\s*[\]\}])/g, '$1');
        
        const parsed = JSON.parse(cleaned);
        
        if (state.importType === 'themes') { 
            if (!Array.isArray(parsed)) throw new Error("Themes must be an array.");
            state.settings.themes = parsed; renderThemes(); 
        }
        else if (state.importType === 'pois') { 
            if (typeof parsed !== 'object') throw new Error("Landmarks must be a JSON object.");
            state.settings.poiCache = parsed; renderPOISelectors(); 
        }
        else if (state.importType === 'styles') {
            if (!Array.isArray(parsed)) throw new Error("Styles must be an array of strings.");
            state.settings.styles = parsed; renderStyles();
        }
        else if (state.importType === 'prompts') { 
            state.settings.promptDay = parsed.day || DEFAULT_DAY_STR; 
            state.settings.promptNight = parsed.night || DEFAULT_NIGHT_STR; 
            loadEditorPrompt(); 
        }
        
        save(); alert("Import successful!"); closeImport();
    } catch(e) { 
        alert("Import failed: " + e.message); 
        console.error("Failed JSON string for debugging:", raw);
    }
}

async function fetchModels() {
    try {
        const res = await fetch('https://gen.pollinations.ai/image/models');
        const models = await res.json();
        const sel = document.getElementById('set-model');
        if (!sel) return;
        sel.innerHTML = "";
        models.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.name; opt.innerText = m.name + (m.paid_only ? ' *' : '');
            sel.appendChild(opt);
        });
        sel.value = state.settings.model || "gptimage";
    } catch(e) {
        const sel = document.getElementById('set-model'); 
        if(sel) sel.innerHTML = '<option value="gptimage">GPT Image</option><option value="flux">Flux</option>';
    }
}

function setupUI() {
    loadEditorPrompt();
    document.getElementById('set-quality').value = state.settings.quality;
    document.getElementById('set-res').value = state.settings.resolution;
    document.getElementById('set-overlay').checked = state.settings.overlayLabel;
    document.getElementById('set-apikey').value = state.settings.apiKey;
    document.getElementById('set-loc-mode').value = state.settings.locMode;
    document.getElementById('set-city').value = state.settings.customCity;
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
    document.getElementById('prompt-editor').value = mode === 'day' ? state.settings.promptDay : state.settings.promptNight;
}

function saveEditorPrompt() {
    const mode = document.getElementById('prompt-mode').value;
    const val = document.getElementById('prompt-editor').value;
    if (mode === 'day') state.settings.promptDay = val;
    else state.settings.promptNight = val;
    save();
}

function syncSettings() {
    state.settings.quality = document.getElementById('set-quality').value;
    state.settings.model = document.getElementById('set-model').value;
    state.settings.resolution = document.getElementById('set-res').value;
    state.settings.overlayLabel = document.getElementById('set-overlay').checked;
    state.settings.apiKey = document.getElementById('set-apikey').value;
    state.settings.locMode = document.getElementById('set-loc-mode').value;
    state.settings.customCity = document.getElementById('set-city').value;
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
    const row = document.getElementById('row-custom-city');
    if (row) row.style.display = isCustom ? 'flex' : 'none';
}

async function validateCustomLoc() {
    const cityStr = document.getElementById('set-city').value;
    if (!cityStr || cityStr.length < 3) return;
    try {
        const res = await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent(cityStr));
        const data = await res.json();
        if (data.length > 0) {
            state.lat = parseFloat(data[0].lat); state.lon = parseFloat(data[0].lon);
            state.city = data[0].display_name.split(',')[0].trim();
            document.getElementById('coord-text').innerText = "Validated: " + state.lat.toFixed(2);
            syncSettings();
        }
    } catch(e) {}
}

function exportData(type) {
    let data = {};
    if (type === 'themes') data = state.settings.themes;
    else if (type === 'pois') data = state.settings.poiCache;
    else if (type === 'styles') data = state.settings.styles;
    else if (type === 'prompts') data = { day: state.settings.promptDay, night: state.settings.promptNight };
    
    // Show in the UI instead of just console
    document.getElementById('import-title').innerText = "Export " + type.toUpperCase();
    document.getElementById('import-text').value = JSON.stringify(data, null, 2);
    document.getElementById('import-modal').classList.add('active');
}

function clearCategory(type) {
    if (!confirm("Wipe all " + type + "?")) return;
    if (type === 'themes') state.settings.themes = [];
    else if (type === 'styles') state.settings.styles = ["Hyper photo realistic"];
    else state.settings.poiCache = {};
    save(); renderThemes(); renderPOISelectors(); renderStyles();
}

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
function addStylePrompt() { const s = prompt("New Style Name:"); if(s) { state.settings.styles.push(s); renderStyles(); save(); } }
function deleteStyle(i) { state.settings.styles.splice(i, 1); renderStyles(); save(); }

function deleteTheme(i) { state.settings.themes.splice(i, 1); renderThemes(); save(); }
function addThemePrompt() {
    const Theme = prompt("Theme Name:"); const Begin = prompt("Start MMDD:"); const End = prompt("End MMDD:");
    if (Theme && Begin && End) { state.settings.themes.push({Theme, Begin: parseInt(Begin), End: parseInt(End)}); renderThemes(); save(); }
}
function renderThemes() {
    const list = document.getElementById('theme-list'); if(!list) return;
    list.innerHTML = "";
    state.settings.themes.forEach((t, i) => {
        const row = document.createElement('div'); row.className = 'list-item';
        row.innerHTML = '<div><div class="list-item-title">' + t.Theme + '</div><div class="list-item-sub">' + t.Begin + ' - ' + t.End + '</div></div><button onclick="deleteTheme(' + i + ')" style="color:#ff3b30; background:none; border:none;">Del</button>';
        list.appendChild(row);
    });
}

function renderPOISelectors() {
    const sel = document.getElementById('poi-city-select'); if(!sel) return;
    sel.innerHTML = "";
    Object.keys(state.settings.poiCache).forEach(city => {
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
        row.innerHTML = '<div><div class="list-item-title">' + p.name + '</div><div class="list-item-sub">' + (p.description || "") + '</div></div><div><button onclick="consultPOI(\'' + city + '\', ' + i + ')" style="color:var(--accent-color); background:none; border:none; margin-right:10px;">Consult</button><button onclick="deletePOI(\'' + city + '\', ' + i + ')" style="color:#ff3b30; background:none; border:none;">Del</button></div>';
        list.appendChild(row);
    });
}
function deletePOI(city, i) { state.settings.poiCache[city].splice(i, 1); renderPOIs(); save(); }
function deleteCity() {
    const city = document.getElementById('poi-city-select').value;
    if (!city || !confirm("Delete all for " + city.toUpperCase() + "?")) return;
    delete state.settings.poiCache[city]; renderPOISelectors(); save();
}

async function consultPOI(city, i) {
    const p = state.settings.poiCache[city][i]; const btn = event.currentTarget; 
    btn.disabled = true; btn.innerText = "...";
    try {
        const res = await fetch("/api/proxy/consult?name=" + encodeURIComponent(p.name) + "&city=" + encodeURIComponent(city) + (state.settings.apiKey ? "&key="+state.settings.apiKey : ""));
        const data = await res.json(); p.description = data.description; renderPOIs(); save();
    } finally { btn.disabled = false; btn.innerText = "Consult"; }
}

async function addPOIPrompt() {
    const city = document.getElementById('poi-city-select').value || prompt("City (lowercase):").toLowerCase();
    if (!city) return;
    const name = prompt("Landmark Name:"); if (!name) return;
    const desc = confirm("Use AI description?") ? "..." : prompt("Description:");
    if (!state.settings.poiCache[city]) state.settings.poiCache[city] = [];
    const idx = state.settings.poiCache[city].push({name, description: desc}) - 1;
    renderPOISelectors(); save(); if (desc === "...") consultPOI(city, idx);
}

async function discoverPOIs() {
    const city = state.city; const btn = event.currentTarget; 
    if(btn && btn.id !== 'btn-gen-ui') { btn.disabled = true; btn.innerText = "Finding..."; }
    try {
        const res = await fetch("/api/proxy/poi?city=" + encodeURIComponent(city) + (state.settings.apiKey ? "&key="+state.settings.apiKey : ""));
        const data = await res.json(); const cityKey = city.toLowerCase().trim();
        if (!state.settings.poiCache[cityKey]) state.settings.poiCache[cityKey] = [];
        state.settings.poiCache[cityKey].push({name: data.name, description: data.description});
        renderPOISelectors(); save();
    } catch(e) {} finally { if(btn && btn.id !== 'btn-gen-ui') { btn.disabled = false; btn.innerText = "✨ AI Discover"; } }
}

function openFullRes() { const src = document.getElementById('result-image').src; if (src) window.open(src, '_blank'); }

function browserSanitize(input) {
    if (!input) return "";
    let str = input.toString();
    str = str.split("\n").join(" ");
    str = str.split("%").join(" percent");
    str = str.split("&").join(" and");
    str = str.split("#").join("");
    str = str.split("?").join("");
    str = str.split("\"").join("'");
    str = str.split("/").join(" ");
    str = str.split("\\").join(" ");
    return str.trim();
}

async function handleGenerate() {
    if (state.isGenerating) return;
    state.isGenerating = true; const btn = document.getElementById('btn-gen-ui');
    btn.disabled = true; btn.innerText = "Locating...";
    startFireflies(); document.getElementById('firefly-canvas').classList.add('active');
    try {
        const envRes = await fetch("/api/proxy/weather?lat=" + state.lat + "&lon=" + state.lon);
        const env = await envRes.json(); const cityKey = state.city.toLowerCase().trim();
        if (!state.settings.poiCache[cityKey] || state.settings.poiCache[cityKey].length === 0) { btn.innerText = "Discovering..."; await discoverPOIs(); }
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
    } catch(e) { alert("Error: " + e.message); btn.disabled = false; state.isGenerating = false; stopFireflies(); }
}

function buildPrompt(env, poi, theme) {
    const isDay = env.is_day; let p = isDay ? state.settings.promptDay : state.settings.promptNight;
    const now = new Date();
    const vars = {
        "{style}": state.settings.style, "{poi_name}": poi.name, "{poi_desc}": poi.description || "",
        "{city}": state.city, "{state_region}": state.state, "{country}": state.country,
        "{time_of_day}": isDay ? "Daytime" : "Nighttime", "{datetime}": now.toLocaleString(),
        "{weather}": env.weather_desc, "{temperature}": env.temp + "°F", "{theme}": theme,
        "{sunrise}": env.sunrise || "dawn", "{sunset}": env.sunset || "dusk",
        "{uv_index}": env.uv_index || "0", "{visibility}": env.visibility || "10mi",
        "{cloud_cover}": env.cloud_cover || "0%", "{wind_speed}": env.wind_speed || "0mph",
        "{moon_phase}": env.moon_phase || "Visible", "{moon_illumination}": (env.moon_illumination || "0") + " percent",
        "{moonrise}": env.moonrise || "N/A", "{moonset}": env.moonset || "N/A"
    };
    for (const [k, v] of Object.entries(vars)) { p = p.split(k).join(v || ""); }
    if (state.settings.quality === 'high') p += ", 8k resolution, masterpiece";
    if (state.settings.quality === 'hd') p += ", 16k resolution, cinematic lighting";
    return p;
}

let animId;
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

function switchTab(tab) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tab + '-view').classList.add('active');
    if (event && event.currentTarget) event.currentTarget.classList.add('active');
}
function switchSubTab(tab) {
    document.getElementById('sub-themes').style.display = tab === 'themes' ? 'block' : 'none';
    document.getElementById('sub-pois').style.display = tab === 'pois' ? 'block' : 'none';
    document.getElementById('sub-styles').style.display = tab === 'styles' ? 'block' : 'none';
    document.getElementById('sub-prompts-data').style.display = tab === 'prompts' ? 'block' : 'none';
    document.getElementById('tab-themes').classList.toggle('active', tab === 'themes');
    document.getElementById('tab-pois').classList.toggle('active', tab === 'pois');
    document.getElementById('tab-styles').classList.toggle('active', tab === 'styles');
    document.getElementById('tab-data-prompts').classList.toggle('active', tab === 'prompts');
}

function requestLocation() {
    if (!navigator.geolocation || (state && state.settings.locMode === 'custom')) return;
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

function renderProfiles() {
    const list = document.getElementById('profile-list'); if(!list) return;
    list.innerHTML = "";
    state.settings.profiles.forEach((p, i) => {
        const row = document.createElement('div'); row.className = 'list-item';
        row.innerHTML = '<div><div class="list-item-title">' + p.name + '</div></div><div><button onclick="loadProfile(' + i + ')" style="color:var(--accent-color); background:none; border:none; margin-right:10px;">Load</button><button onclick="deleteProfile(' + i + ')" style="color:#ff3b30; background:none; border:none;">Del</button></div>';
        list.appendChild(row);
    });
}
function saveProfile() {
    const name = document.getElementById('new-profile-name').value; if (!name) return alert("Enter a name");
    state.settings.profiles.push({ name, ...state.settings }); renderProfiles(); save(); document.getElementById('new-profile-name').value = "";
}
function loadProfile(i) { state.settings = { ...state.settings, ...JSON.parse(JSON.stringify(state.settings.profiles[i])) }; setupUI(); renderThemes(); renderPOISelectors(); renderStyles(); alert("Loaded Profile: " + state.settings.name); }
function deleteProfile(i) { state.settings.profiles.splice(i, 1); renderProfiles(); save(); }
function resetApp() { if(confirm("Wipe everything?")) { localStorage.removeItem('lumina_v1.10.0'); location.reload(); } }
function resetPrompts() { if(confirm("Reset templates?")) { state.settings.promptDay = DEFAULT_DAY_STR; state.settings.promptNight = DEFAULT_NIGHT_STR; loadEditorPrompt(); save(); } }
