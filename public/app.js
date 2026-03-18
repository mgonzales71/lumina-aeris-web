// Lumina Aeris Web & Worker - App Logic v1.19.0
// Mandate: NO Truncation. NO Minification. NO Missing Logic.
// Self-Healing Import & Solar-Aware Transporter Restoration.
// (c) 2024 Lumina Aeris Development Team.

// --- 1. GLOBALS & DEFAULT CONSTANTS ---
const STORAGE_KEY = 'lumina_v1.19.0';
const DEFAULT_DAY_STR = "Generate a {style} style image of {poi_name} in {city}, {state_region}. POI description: {poi_desc}. Ensure architectural and geographical accuracy based on real-world references. Time: {time_of_day} {datetime}. Weather: {weather}, {temperature}. Sun at {sunrise} and {sunset} for realistic positioning. Adjust sun visibility based on {weather}. Include the UV index and visibility in the depiction. Account for cloud cover to influence lighting and shadows. Safe Zone Framing: keep significant elements centered and critical content within 80-90 percent of the image width and height. Atmosphere: incorporate the theme of {theme} as a subtle, realistic element. Apply a professional, natural-looking auto-enhancement: brighten shadows, recover highlights, boost midtone contrast, and enhance clarity while preserving a photorealistic look.";
const DEFAULT_NIGHT_STR = "Generate a {style} style image of {poi_name} in {city}, {state_region}. POI description: {poi_desc}. Ensure architectural and geographical accuracy based on real-world references. Time: {time_of_day} {datetime}. Weather: {weather}, {temperature}. Moon in {moon_phase} with {moon_illumination} illumination. Account for moonrise {moonrise} and moonset {moonset} for realistic positioning. Adjust moon visibility based on {weather}. Safe Zone Framing: keep significant elements centered and critical content within 80-90 percent of the image width and height. Atmosphere: incorporate the theme of {theme} as a subtle, realistic element. Apply a professional, natural-looking auto-enhancement: brighten shadows, recover highlights, boost midtone contrast, and enhance clarity while preserving a photorealistic look.";
const DEFAULT_POI_DOMESTIC_STR = "You are an expert in identifying unique and notable points of interest, views, and vistas of the requested locations. Please provide one item per line without any formatting or citations. Generate a list of up to 30 visually distinct points of interest, landmarks, or vistas in or near {city}, {state_region}. Take your time to conduct a comprehensive search. Formatting Guidelines: 1. Provide only a raw JSON array of objects. 2. Exclude markdown code blocks (no backticks). 3. Omit any introductory or concluding text. 4. Each object must have precisely two keys: \"name\" and \"description\". 5. The \"description\" should consist of one to two concise sentences that visually describe the named point of interest.";
const DEFAULT_POI_INTL_STR = "You are an expert in identifying unique and notable points of interest, views, and vistas of the requested locations. Please provide one item per line without any formatting or citations. Generate a list of up to 30 visually distinct points of interest, landmarks, or vistas in or near {city}, {country}. Take your time to conduct a comprehensive search. Formatting Guidelines: 1. Provide only a raw JSON array of objects. 2. Exclude markdown code blocks (no backticks). 3. Omit any introductory or concluding text. 4. Each object must have precisely two keys: \"name\" and \"description\". 5. The \"description\" should consist of one to two concise sentences that visually describe the named point of interest.";
const TOKENS_LIST = ["{style}", "{poi_name}", "{poi_desc}", "{city}", "{state_region}", "{country}", "{time_of_day}", "{datetime}", "{weather}", "{temperature}", "{theme}", "{moon_phase}", "{moon_illumination}", "{moonrise}", "{moonset}", "{sunrise}", "{sunset}", "{uv_index}", "{visibility}", "{cloud_cover}", "{wind_speed}"];
const DEFAULT_STYLES = ["Hyper photo realistic", "Cinematic photography", "Watercolor painting", "Oil painting", "Pencil sketch", "Crayon drawing", "Claymation", "3D animation render", "Pixar-style 3D illustration", "Flat vector illustration", "Paper craft collage", "Ukiyo-e woodblock print", "Impressionist painting", "Pixel art", "Neon noir", "Vintage film photograph", "Comic book art", "Stained glass illustration"];

/**
 * Main Application State
 * Persisted in localStorage under STORAGE_KEY
 */
var state = {
    currentTab: 'home', 
    isGenerating: false,
    lat: 45.52, 
    lon: -122.67, 
    city: "Portland", 
    state: "Oregon", 
    country: "USA",
    importType: '', 
    currentProfile: 'default', 
    remoteProfiles: [],
    settings: {
        appearance: 'auto', // options: auto, light, dark, smoky
        promptDay: DEFAULT_DAY_STR, 
        promptNight: DEFAULT_NIGHT_STR,
        promptPOIDomestic: DEFAULT_POI_DOMESTIC_STR, 
        promptPOIIntl: DEFAULT_POI_INTL_STR,
        quality: "medium", 
        model: "gptimage", 
        textModel: "gemini-search", 
        style: "Hyper photo realistic", 
        resolution: "1290x2796",
        customResW: 1290, 
        customResH: 2796,
        overlayLabel: false, 
        apiKey: "", 
        syncSecret: "", 
        locMode: "gps", 
        customCity: "Portland, Oregon",
        themes: [
            {"Begin":101, "End":103, "Theme":"New Years"}, 
            {"Begin":1015, "End":1031, "Theme":"Halloween"}, 
            {"Begin":1220, "End":1231, "Theme":"Holiday Season"}
        ],
        poiCache: {}, 
        profiles: [],
        styles: DEFAULT_STYLES,
        locations: [
            {"city": "Portland", "state": "Oregon", "country": "USA", "lat": 45.52, "lon": -122.67}
        ],
        customLocIdx: 0,
        transparent: false, 
        safe: true, 
        enhance: false, 
        seedEnable: false, 
        seed: -1, 
        negativePrompt: "", 
        negEnable: false
    }
};

let animId = null;
let isDirty = false;

// --- 2. INITIALIZATION ---

/**
 * Entry point. Hydrates state from localStorage and initializes UI.
 */
window.onload = async () => {
    console.log("Initializing Lumina Aeris v1.19.0...");
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try { 
            const parsed = JSON.parse(saved);
            Object.assign(state.settings, parsed); 
        } catch(e) {
            console.error("Failed to parse saved state", e);
        }
    } else {
        // Migration logic for older versions
        const oldKeys = ['lumina_v1.18.1', 'lumina_v1.18.0', 'lumina_v1.16.4', 'lumina_v1.16.3'];
        for (const key of oldKeys) {
            const oldData = localStorage.getItem(key);
            if (oldData) {
                try { 
                    Object.assign(state.settings, JSON.parse(oldData)); 
                    save(); 
                    console.log(`Migrated data from ${key}`);
                    break; 
                } catch(e) {}
            }
        }
    }
    
    // Inject Smoky Glass CSS if needed
    applySmokyGlassCSS();
    
    await applyAppearance();

    if (state.settings.syncSecret) {
        await refreshRemoteProfiles();
        await switchRemoteProfile(state.currentProfile || 'default');
    }
    
    await fetchModels();
    
    // Core UI Renderers
    setupUI(); 
    renderThemes(); 
    renderPOISelectors(); 
    renderProfiles(); 
    renderStyles(); 
    renderLocations(); 
    updateSyncUI();
    
    // Initial Location Lock
    if (state.settings.locMode === 'gps') {
        requestLocation();
    } else if (state.settings.locMode === 'custom') {
        applySavedLoc(state.settings.customLocIdx || 0);
    }

    // Restore Prompt Debugger if open
    const debugPanel = document.getElementById('debug-panel');
    if (debugPanel && localStorage.getItem('debug_open') === 'true') {
        debugPanel.style.display = 'block';
        const chev = document.getElementById('debug-chevron');
        if (chev) chev.innerText = '▲';
    }
};

/**
 * Updates the visual state of the Cloud Sync button based on local changes.
 */
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

/**
 * Injects CSS for the Smoky Glass theme if it's missing from the stylesheet.
 */
function applySmokyGlassCSS() {
    if (!document.getElementById('smoky-glass-css')) {
        const style = document.createElement('style');
        style.id = 'smoky-glass-css';
        style.innerHTML = `
            body.theme-smoky {
                --bg-color: #1a1a1c;
                --text-color: #e2e2e7;
                --sub-text: #9a9a9f;
                --card-bg: rgba(25, 25, 25, 0.45);
                --glass-border: rgba(255, 255, 255, 0.08);
                --glass-blur: blur(40px);
                --nav-bg: rgba(15, 15, 15, 0.92);
                --input-bg: rgba(255, 255, 255, 0.05);
                --accent-color: #5e5ce6;
            }
            body.theme-smoky .preview-card {
                background: linear-gradient(135deg, #121214, #1c1c1e);
                box-shadow: 0 40px 100px -20px rgba(0,0,0,0.8);
                border-color: rgba(255,255,255,0.05);
            }
            body.theme-smoky .glass {
                background: rgba(30, 30, 32, 0.7);
                backdrop-filter: blur(30px);
                -webkit-backdrop-filter: blur(30px);
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Calculates and applies the visual appearance mode (Light, Dark, Smoky, or Auto).
 */
async function applyAppearance() {
    const body = document.body;
    const mode = state.settings.appearance || 'auto';
    body.classList.remove('theme-light', 'theme-dark', 'theme-smoky');
    
    if (mode === 'light' || mode === 'dark' || mode === 'smoky') {
        body.classList.add('theme-' + mode);
        return;
    }

    // Auto Mode: Deterministic Day/Night based on local weather or time
    let isDay = true;
    try {
        const res = await fetch(`/api/proxy/weather?lat=${state.lat}&lon=${state.lon}`);
        if (res.ok) {
            const env = await res.json();
            isDay = env.is_day;
        } else {
            throw new Error("Weather fetch failed");
        }
    } catch (e) {
        const hour = new Date().getHours();
        isDay = (hour >= 6 && hour < 18);
    }
    
    body.classList.add(isDay ? 'theme-light' : 'theme-dark');
}

/**
 * Fetches the list of available cloud profiles from the worker.
 */
async function refreshRemoteProfiles() {
    if (!state.settings.syncSecret) return;
    try {
        const res = await fetch("/api/profiles?secret=" + encodeURIComponent(state.settings.syncSecret));
        if (res.ok) {
            state.remoteProfiles = await res.json();
            renderRemoteProfileList();
        }
    } catch(e) {
        console.error("Failed to refresh remote profiles", e);
    }
}

/**
 * Switches the active profile to a cloud-stored one.
 */
async function switchRemoteProfile(name) {
    if (!state.settings.syncSecret) return;
    try {
        const res = await fetch(`/api/config?profile=${encodeURIComponent(name)}&secret=${encodeURIComponent(state.settings.syncSecret)}`);
        if (res.ok) {
            const remote = await res.json();
            if (remote && remote.promptDay) {
                state.settings = remote;
                state.currentProfile = name;
                isDirty = false;
                
                // Full UI Refresh
                setupUI(); 
                renderThemes(); 
                renderPOISelectors(); 
                renderStyles(); 
                renderLocations(); 
                renderRemoteProfileList(); 
                await applyAppearance(); 
                updateSyncUI();
                
                localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings)); 
            }
        }
    } catch(e) {
        console.error("Profile switch failed", e);
    }
}

/**
 * Saves current settings to local storage and syncs to cloud if secret is present.
 */
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
        } catch(e) {
            console.error("Cloud save failed", e);
        }
    }
}

/**
 * Triggered by the "Sync Changes" button.
 */
async function manualCloudSync() {
    const btn = document.getElementById('btn-cloud-sync');
    if (!btn) return;
    const orig = btn.innerText; 
    btn.disabled = true; 
    btn.innerText = "Syncing...";
    try { 
        await save(); 
        isDirty = false;
        updateSyncUI();
        btn.innerText = "✅ Synced!"; 
        setTimeout(() => { 
            btn.innerText = "☁️ Cloud Synced"; 
            btn.disabled = false; 
            updateSyncUI(); 
        }, 2000); 
    }
    catch(e) { 
        btn.innerText = "❌ Error"; 
        setTimeout(() => { 
            btn.disabled = false; 
            updateSyncUI(); 
        }, 2000); 
    }
}

/**
 * Populates model dropdowns from the Pollinations API.
 */
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

/**
 * Synchronizes DOM elements with the current state.
 */
function setupUI() {
    loadEditorPrompt();
    const badge = document.getElementById('profile-badge');
    if (badge) {
        badge.innerText = "PROFILE: " + (state.currentProfile || "DEFAULT").toUpperCase();
        badge.style.color = (state.currentProfile && state.currentProfile !== 'default') ? "var(--accent-color)" : "#888";
    }

    const appSel = document.getElementById('set-appearance');
    if (appSel) {
        // Ensure Smoky option exists
        if (!appSel.querySelector('option[value="smoky"]')) {
            const opt = document.createElement('option');
            opt.value = "smoky"; opt.innerText = "Smoky Glass";
            appSel.appendChild(opt);
        }
        appSel.value = state.settings.appearance || 'auto';
    }

    document.getElementById('set-quality').value = state.settings.quality;
    if (document.getElementById('set-text-model')) document.getElementById('set-text-model').value = state.settings.textModel || "gemini-search";
    document.getElementById('set-res').value = state.settings.resolution;
    document.getElementById('set-res-w').value = state.settings.customResW || 1290;
    document.getElementById('set-res-h').value = state.settings.customResH || 2796;
    document.getElementById('set-overlay').checked = state.settings.overlayLabel;
    document.getElementById('set-apikey').value = state.settings.apiKey || "";
    document.getElementById('set-sync-secret').value = state.settings.syncSecret || "";
    document.getElementById('set-loc-mode').value = state.settings.locMode;
    document.getElementById('set-transparent').checked = state.settings.transparent;
    document.getElementById('set-safe').checked = state.settings.safe;
    document.getElementById('set-enhance').checked = state.settings.enhance;
    document.getElementById('set-seed-enable').checked = state.settings.seedEnable;
    document.getElementById('set-seed').value = state.settings.seed;
    document.getElementById('set-neg-enable').checked = state.settings.negEnable;
    document.getElementById('set-neg').value = state.settings.negativePrompt || "";
    
    const styleSel = document.getElementById('set-style');
    if (styleSel) {
        styleSel.innerHTML = "";
        state.settings.styles.forEach(s => {
            const opt = document.createElement('option'); opt.value = s; opt.innerText = s;
            styleSel.appendChild(opt);
        });
        styleSel.value = state.settings.style || "Hyper photo realistic";
    }
    
    toggleCustomLoc(); 
    toggleCustomRes(); 
    renderTokens();
    
    // Usage Stats Auto-Fetch if key is present
    if (state.settings.apiKey) fetchUsageStats();
}

/**
 * Renders token chips for the prompt editor.
 */
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
            area.setRangeText(t, start, end, 'end'); 
            saveEditorPrompt();
        };
        chipContainer.appendChild(c);
    });
}

/**
 * Loads the selected prompt template into the editor textarea.
 */
function loadEditorPrompt() {
    const mode = document.getElementById('prompt-mode').value;
    const area = document.getElementById('prompt-editor');
    if (!area) return;
    
    if (mode === 'day') area.value = state.settings.promptDay;
    else if (mode === 'night') area.value = state.settings.promptNight;
    else if (mode === 'poidomestic') area.value = state.settings.promptPOIDomestic || DEFAULT_POI_DOMESTIC_STR;
    else if (mode === 'poiintl') area.value = state.settings.promptPOIIntl || DEFAULT_POI_INTL_STR;
}

/**
 * Saves the editor textarea content back to the state.
 */
function saveEditorPrompt() {
    const mode = document.getElementById('prompt-mode').value;
    const val = document.getElementById('prompt-editor').value;
    if (mode === 'day') state.settings.promptDay = val;
    else if (mode === 'night') state.settings.promptNight = val;
    else if (mode === 'poidomestic') state.settings.promptPOIDomestic = val;
    else if (mode === 'poiintl') state.settings.promptPOIIntl = val;
    
    isDirty = true; 
    updateSyncUI();
    save();
}

/**
 * Collects values from all settings inputs and saves them.
 */
async function syncSettings() {
    state.settings.appearance = document.getElementById('set-appearance').value;
    state.settings.quality = document.getElementById('set-quality').value;
    state.settings.model = document.getElementById('set-model').value;
    if (document.getElementById('set-text-model')) state.settings.textModel = document.getElementById('set-text-model').value;
    state.settings.resolution = document.getElementById('set-res').value;
    state.settings.customResW = parseInt(document.getElementById('set-res-w').value);
    state.settings.customResH = parseInt(document.getElementById('set-res-h').value);
    state.settings.style = document.getElementById('set-style').value;
    state.settings.overlayLabel = document.getElementById('set-overlay').checked;
    state.settings.apiKey = document.getElementById('set-apikey').value;
    state.settings.syncSecret = document.getElementById('set-sync-secret').value;
    state.settings.locMode = document.getElementById('set-loc-mode').value;
    state.settings.transparent = document.getElementById('set-transparent').checked;
    state.settings.safe = document.getElementById('set-safe').checked;
    state.settings.enhance = document.getElementById('set-enhance').checked;
    state.settings.seedEnable = document.getElementById('set-seed-enable').checked;
    state.settings.seed = parseInt(document.getElementById('set-seed').value);
    state.settings.negEnable = document.getElementById('set-neg-enable').checked;
    state.settings.negativePrompt = document.getElementById('set-neg').value;
    
    isDirty = true; 
    updateSyncUI();
    await applyAppearance();
    save();
}

/**
 * Shows/hides custom resolution inputs.
 */
function toggleCustomRes() {
    const isCustom = document.getElementById('set-res').value === 'custom';
    const row = document.getElementById('row-custom-res');
    if (row) row.style.display = isCustom ? 'flex' : 'none';
}

/**
 * Main generation flow. Coordinates weather engine, POI selection, and API call.
 */
async function handleGenerate() {
    if (state.isGenerating) return;
    state.isGenerating = true;
    
    const btn = document.getElementById('btn-gen-ui');
    if (!btn) return;
    btn.disabled = true;
    btn.innerText = "Initializing...";

    try {
        const envRes = await fetch(`/api/proxy/weather?lat=${state.lat}&lon=${state.lon}`);
        const env = await envRes.json();
        
        let engineType = 'stardust';
        const wDesc = (env.weather_desc || "").toLowerCase();
        if (wDesc.includes('rain')) engineType = 'rain';
        else if (wDesc.includes('snow')) engineType = 'snow';
        else if (!env.is_day) engineType = 'moon';
        
        startWeatherEngine(engineType);
        
        btn.innerText = "Transporting...";

        const cityKey = state.city.toLowerCase().trim();
        if (!state.settings.poiCache[cityKey] || state.settings.poiCache[cityKey].length === 0) {
            btn.innerText = "Discovering...";
            await discoverPOIs(null);
        }
        
        let pois = state.settings.poiCache[cityKey];
        if (!pois || !Array.isArray(pois) || pois.length === 0) {
            pois = [{name: state.city, description: "A beautiful view"}];
        }
        const poi = pois[Math.floor(Math.random() * pois.length)] || pois[0];
        
        const theme = getThemeForDate();
        const rawP = buildPrompt(env, poi, theme);
        const cleanP = browserSanitize(rawP) || "Wallpaper of " + poi.name;
        
        // Update Prompt Debugger
        if (document.getElementById('debug-prompt')) document.getElementById('debug-prompt').innerText = cleanP;
        if (document.getElementById('debug-vars')) {
            document.getElementById('debug-vars').innerHTML = `
                <div><span style="opacity:0.5">City:</span> ${state.city}</div>
                <div><span style="opacity:0.5">Weather:</span> ${env.weather_desc}</div>
                <div><span style="opacity:0.5">Theme:</span> ${theme}</div>
                <div><span style="opacity:0.5">POI:</span> ${poi.name}</div>
                <div><span style="opacity:0.5">Lat/Lon:</span> ${state.lat.toFixed(2)}, ${state.lon.toFixed(2)}</div>
                <div><span style="opacity:0.5">Is Day:</span> ${env.is_day}</div>
            `;
        }

        let w, h;
        if (state.settings.resolution === 'custom') {
            w = state.settings.customResW; h = state.settings.customResH;
        } else {
            const parts = state.settings.resolution.split('x');
            w = parts[0]; h = parts[1];
        }
        
        const seed = (state.settings.seedEnable && state.settings.seed !== -1) ? state.settings.seed : Math.floor(Math.random() * 2147483647);
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
            
            const activeTemplate = env.is_day ? state.settings.promptDay : state.settings.promptNight;
            if (activeTemplate.includes("{poi_name}")) {
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
            btn.disabled = false;
            state.isGenerating = false;
        };
        
        img.onerror = () => {
            throw new Error("Failed to load image");
        };

    } catch (e) {
        console.error("Generation Error:", e);
        btn.disabled = false;
        btn.innerText = "Generate Wallpaper";
        state.isGenerating = false;
        stopWeatherEngine();
        alert("Transport failed. Check network or API key.");
    }
}

/**
 * Injects environment variables into the prompt template.
 */
function buildPrompt(env, poi, theme) {
    const isDay = env.is_day; 
    let p = isDay ? state.settings.promptDay : state.settings.promptNight; 
    const now = new Date();
    
    const vars = { 
        "{style}": state.settings.style, 
        "{poi_name}": poi.name, 
        "{poi_desc}": poi.description || "", 
        "{city}": state.city, 
        "{state_region}": state.state, 
        "{country}": state.country, 
        "{time_of_day}": isDay ? "Daytime" : "Nighttime", 
        "{datetime}": now.toLocaleString(), 
        "{weather}": env.weather_desc, 
        "{temperature}": env.temp + "°F", 
        "{theme}": theme, 
        "{sunrise}": env.sunrise, 
        "{sunset}": env.sunset, 
        "{uv_index}": env.uv_index, 
        "{visibility}": env.visibility, 
        "{cloud_cover}": env.cloud_cover, 
        "{wind_speed}": env.wind_speed, 
        "{moon_phase}": env.moon_phase, 
        "{moon_illumination}": env.moon_illumination + " percent", 
        "{moonrise}": env.moonrise, 
        "{moonset}": env.moonset 
    };
    
    for (const [k, v] of Object.entries(vars)) { 
        p = p.split(k).join(v || ""); 
    }
    
    if (state.settings.quality === 'high') p += ", 8k resolution, masterpiece"; 
    if (state.settings.quality === 'hd') p += ", 16k resolution, cinematic lighting"; 
    
    return p;
}

/**
 * Sanitizes the prompt for URL safety.
 */
function browserSanitize(input) { 
    return input.toString()
        .replace(/[\n\r]/g, " ")
        .replace(/%/g, " percent")
        .replace(/[&#?\/"]/g, "")
        .trim(); 
}

/**
 * High-Contrast Weather Engine v1.19.0
 * Overhauled with dual-tone shimmering beams and boosted particles.
 */
function startWeatherEngine(type = 'stardust') {
    const canvas = document.getElementById('firefly-canvas');
    if (!canvas) return;
    if (animId) cancelAnimationFrame(animId);
    
    canvas.classList.add('active');
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    
    const bodyClass = document.body.classList;
    const isDark = bodyClass.contains('theme-dark');
    const isSmoky = bodyClass.contains('theme-smoky');
    const isEffectivelyDark = isDark || isSmoky;
    
    // Core Colors
    const pMain = isEffectivelyDark ? "255, 255, 255" : "0, 0, 0"; 
    const pAlt = isEffectivelyDark ? "0, 200, 255" : "60, 60, 60"; 
    const twinkleColor = isEffectivelyDark ? "255, 255, 0" : "255, 180, 0"; 

    // Dual-Tone Shimmering Beams
    let beam1, beam2;
    if (isEffectivelyDark) {
        beam1 = "rgba(0, 122, 255, 0.15)"; // Electric Blue
        beam2 = "rgba(255, 149, 0, 0.15)"; // Amber
    } else {
        beam1 = "rgba(40, 40, 40, 0.15)";  // Charcoal
        beam2 = "rgba(212, 175, 55, 0.15)"; // Gold
    }

    // Boosted Particle Count
    const count = type === 'rain' ? 200 : 150;
    let particles = Array.from({length: count}, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * (type === 'snow' ? 4 : 2) + 0.5,
        speed: (Math.random() * 3 + 1) * 1.5, // Boosted Speed
        opacity: Math.random(),
        angle: Math.random() * Math.PI * 2,
        twinkle: Math.random() > 0.7,
        twinkleSpeed: Math.random() * 0.1 + 0.05
    }));

    // Beams configuration
    let beamPoints = Array.from({length: 5}, () => ({
        x: Math.random() * canvas.width,
        width: Math.random() * 80 + 40,
        speed: Math.random() * 0.02 + 0.01,
        color: Math.random() > 0.5 ? beam1 : beam2,
        phase: Math.random() * Math.PI * 2
    }));

    function loop() {
        if (!canvas.classList.contains('active')) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 1. Draw Shimmering Beams
        beamPoints.forEach(b => {
            b.phase += b.speed;
            const drift = Math.sin(b.phase) * 40;
            const currentX = b.x + drift;
            
            const grad = ctx.createLinearGradient(currentX, 0, currentX + b.width, 0);
            grad.addColorStop(0, "rgba(0,0,0,0)");
            grad.addColorStop(0.5, b.color);
            grad.addColorStop(1, "rgba(0,0,0,0)");
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(currentX, 0);
            ctx.lineTo(currentX + b.width, 0);
            ctx.lineTo(currentX + b.width - 100, canvas.height);
            ctx.lineTo(currentX - 100, canvas.height);
            ctx.fill();
        });
        
        // 2. Draw Moon (if applicable)
        if (type === 'moon') {
            const cx = canvas.width * 0.8;
            const cy = canvas.height * 0.2;
            const radius = 35;
            const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 2.5);
            glow.addColorStop(0, `rgba(${twinkleColor}, 0.3)`);
            glow.addColorStop(1, `rgba(${twinkleColor}, 0)`);
            ctx.fillStyle = glow;
            ctx.beginPath(); ctx.arc(cx, cy, radius * 2.5, 0, Math.PI * 2); ctx.fill();
            
            ctx.fillStyle = isEffectivelyDark ? "#EEE" : "#444";
            ctx.shadowBlur = 15;
            ctx.shadowColor = `rgba(${twinkleColor}, 0.5)`;
            ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
        }

        // 3. Draw Particles
        particles.forEach(p => {
            // Twinkle Logic
            if (p.twinkle) {
                p.opacity += Math.sin(Date.now() * p.twinkleSpeed) * 0.15;
                if (p.opacity < 0.2) p.opacity = 0.2;
                if (p.opacity > 1) p.opacity = 1;
            }

            if (type === 'stardust' || type === 'moon') {
                p.y -= p.speed;
                if (p.y < -10) p.y = canvas.height + 10;
                ctx.fillStyle = p.twinkle ? `rgba(${twinkleColor}, ${p.opacity})` : `rgba(${pMain}, ${p.opacity})`;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
            } else if (type === 'rain') {
                p.y += p.speed * 6;
                if (p.y > canvas.height) {
                    // Splash effect
                    ctx.beginPath();
                    ctx.ellipse(p.x, canvas.height - 2, p.size * 4, p.size * 1.5, 0, 0, Math.PI * 2);
                    ctx.strokeStyle = `rgba(${pAlt}, 0.2)`;
                    ctx.stroke();
                    p.y = -30;
                    p.x = Math.random() * canvas.width;
                }
                ctx.strokeStyle = `rgba(${pAlt}, 0.6)`;
                ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y + 15); ctx.stroke();
            } else if (type === 'snow') {
                p.y += p.speed * 0.8;
                p.x += Math.sin(p.angle) * 1.5;
                p.angle += 0.04;
                if (p.y > canvas.height) p.y = -10;
                ctx.fillStyle = `rgba(${pMain}, ${p.opacity})`;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
            }
        });
        
        animId = requestAnimationFrame(loop);
    }
    loop();
}

/**
 * Stops the weather engine animation.
 */
function stopWeatherEngine() { 
    if (animId) cancelAnimationFrame(animId); 
    const canvas = document.getElementById('firefly-canvas');
    if (canvas) canvas.classList.remove('active'); 
}

/**
 * Accordion toggle for Prompt Debugger and other panels.
 */
function toggleAccordion(id) { 
    const el = document.getElementById(id); 
    if (!el) return;
    const chev = document.getElementById('debug-chevron'); 
    const isOpen = el.style.display === 'block'; 
    el.style.display = isOpen ? 'none' : 'block'; 
    if(chev) chev.innerText = isOpen ? '▼' : '▲'; 
    
    if (id === 'debug-panel') {
        localStorage.setItem('debug_open', !isOpen);
    }
}

/**
 * Switch main navigation tabs.
 */
function switchTab(tab, btn) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    const target = document.getElementById(tab + '-view');
    if (target) target.classList.add('active');
    
    if (btn) btn.classList.add('active');
    state.currentTab = tab;
}

/**
 * Switch sub-tabs (e.g., in Settings or Landmarks).
 */
function switchSubTab(tab) {
    document.querySelectorAll('.sub-view').forEach(v => v.style.display = 'none');
    const target = document.getElementById(tab === 'prompts' ? 'sub-prompts-data' : 'sub-' + tab);
    if (target) target.style.display = 'block';
    
    document.querySelectorAll('.tabs-sub button').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById('tab-' + tab);
    if (activeBtn) activeBtn.classList.add('active');
}

/**
 * Requests GPS location and reverse geocodes it.
 */
function requestLocation() { 
    if (!navigator.geolocation || state.settings.locMode === 'custom') return; 
    
    navigator.geolocation.getCurrentPosition(pos => { 
        state.lat = pos.coords.latitude; 
        state.lon = pos.coords.longitude; 
        
        fetch("/api/proxy/nominatim?lat=" + state.lat + "&lon=" + state.lon)
            .then(r => r.json())
            .then(data => { 
                state.city = data.address.city || data.address.town || data.address.village || "Unknown"; 
                state.state = data.address.state || ""; 
                state.country = data.address.country || ""; 
                const coordText = document.getElementById('coord-text');
                if (coordText) coordText.innerText = `GPS: ${state.city}, ${state.state || state.country}`;
                renderPOISelectors(); 
            }); 
    }, err => {
        console.warn("Geolocation failed", err);
    }); 
}

/**
 * Returns the active seasonal theme based on the current date.
 */
function getThemeForDate() { 
    const now = new Date(); 
    const ord = (now.getMonth() + 1) * 100 + now.getDate(); 
    const match = state.settings.themes.find(t => ord >= t.Begin && ord <= t.End); 
    return match ? match.Theme : "General"; 
}

/**
 * Wipes local storage and reloads.
 */
function resetApp() { 
    if(confirm("Wipe everything and reset to defaults? This cannot be undone.")) { 
        localStorage.clear(); 
        location.reload(); 
    } 
}

/**
 * Resets prompt templates to defaults.
 */
function resetPrompts() { 
    if(confirm("Reset templates to factory defaults?")) { 
        state.settings.promptDay = DEFAULT_DAY_STR; 
        state.settings.promptNight = DEFAULT_NIGHT_STR; 
        state.settings.promptPOIDomestic = DEFAULT_POI_DOMESTIC_STR;
        state.settings.promptPOIIntl = DEFAULT_POI_INTL_STR;
        isDirty = true; 
        updateSyncUI();
        loadEditorPrompt(); 
        save();
    } 
}

/**
 * Opens the current generated image in a new tab.
 */
function openFullRes() { 
    const src = document.getElementById('result-image').src; 
    if (src && !src.includes('placeholder')) window.open(src, '_blank'); 
}

/**
 * Renders local profiles list.
 */
function renderProfiles() { 
    const list = document.getElementById('profile-list'); 
    if(!list) return; 
    list.innerHTML = ""; 
    state.settings.profiles.forEach((p, i) => { 
        const row = document.createElement('div'); 
        row.className = 'list-item'; 
        row.innerHTML = `
            <div>
                <div class="list-item-title">${p.name}</div>
                <div class="list-item-sub">Local Profile</div>
            </div>
            <div>
                <button onclick="loadProfile(${i})" style="color:var(--accent-color); background:none; border:none; margin-right:10px;">Load</button>
                <button onclick="deleteProfile(${i})" style="color:#ff3b30; background:none; border:none;">Del</button>
            </div>
        `; 
        list.appendChild(row); 
    }); 
}

/**
 * Renders cloud profiles list.
 */
function renderRemoteProfileList() { 
    const list = document.getElementById('remote-profile-list'); 
    if(!list) return; 
    list.innerHTML = ""; 
    state.remoteProfiles.forEach(name => { 
        const row = document.createElement('div'); 
        row.className = 'list-item'; 
        const active = (name === state.currentProfile) ? " (Active)" : ""; 
        row.innerHTML = `
            <div>
                <div class="list-item-title">${name}${active}</div>
                <div class="list-item-sub">Cloud Config</div>
            </div>
            <div>
                <button onclick="switchRemoteProfile('${name}')" style="color:var(--accent-color); background:none; border:none; margin-right:10px;">Switch</button>
                <button onclick="deleteRemoteProfile('${name}')" style="color:#ff3b30; background:none; border:none;">Del</button>
            </div>
        `; 
        list.appendChild(row); 
    }); 
}

/**
 * Deletes a remote profile from the worker storage.
 */
async function deleteRemoteProfile(name) { 
    if (name === 'default') return alert("Cannot delete default profile"); 
    if (!confirm(`Delete cloud profile '${name}' permanently?`)) return; 
    try { 
        await fetch(`/api/config?profile=${encodeURIComponent(name)}&secret=${encodeURIComponent(state.settings.syncSecret)}`, { method: 'DELETE' }); 
        await refreshRemoteProfiles(); 
    } catch(e) {
        alert("Delete failed.");
    } 
}

/**
 * Creates a new cloud profile by cloning current settings.
 */
async function createRemoteProfile() { 
    const name = prompt("New Cloud Profile Name:"); 
    if (!name) return; 
    state.currentProfile = name; 
    isDirty = true; 
    updateSyncUI();
    await save(); 
}

/**
 * Maintenance tool to purge all data associated with the sync secret.
 */
async function purgeCloudData() { 
    if (!state.settings.syncSecret) return alert("Sync Secret required."); 
    const pin = prompt("Enter Maintenance PIN:"); 
    if (!pin) return; 
    try { 
        const res = await fetch(`/api/maintenance/purge?secret=${encodeURIComponent(state.settings.syncSecret)}&pin=${encodeURIComponent(pin)}`); 
        const data = await res.json(); 
        alert(data.success ? "Purge Successful!" : "Purge Failed: " + (data.error || "Unknown error")); 
    } catch(e) { alert("Error communicating with worker."); } 
}

/**
 * Saves current settings as a local profile.
 */
function saveProfile() { 
    const name = prompt("Profile Name:"); 
    if (!name) return; 
    state.settings.profiles.push({ name, ...state.settings }); 
    isDirty = true; 
    updateSyncUI();
    renderProfiles(); 
    save();
}

/**
 * Loads a local profile into active state.
 */
function loadProfile(i) { 
    if (!state.settings.profiles[i]) return;
    state.settings = { ...state.settings, ...JSON.parse(JSON.stringify(state.settings.profiles[i])) }; 
    isDirty = true; 
    updateSyncUI();
    setupUI(); 
    applyAppearance(); 
    alert("Profile Loaded!"); 
}

/**
 * Deletes a local profile.
 */
function deleteProfile(i) { 
    state.settings.profiles.splice(i, 1); 
    isDirty = true; 
    updateSyncUI();
    renderProfiles(); 
    save();
}

/**
 * Renders the saved locations list.
 */
function renderLocations() {
    const list = document.getElementById('location-list');
    if(list) {
        list.innerHTML = "";
        state.settings.locations.forEach((loc, i) => {
            const row = document.createElement('div');
            row.className = 'list-item';
            row.innerHTML = `
                <div>
                    <div class="list-item-title">${loc.city}</div>
                    <div class="list-item-sub">${loc.state || loc.country}</div>
                </div>
                <button onclick="deleteLocation(${i})" style="color:#ff3b30; background:none; border:none;">Del</button>
            `;
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

/**
 * Deletes a saved location.
 */
function deleteLocation(i) { 
    if (state.settings.locations.length <= 1) return alert("Must keep at least one location.");
    state.settings.locations.splice(i, 1); 
    isDirty = true; 
    updateSyncUI();
    renderLocations(); 
    save();
}

/**
 * Renders the city selector for the landmarks view.
 */
function renderPOISelectors() { 
    const sel = document.getElementById('poi-city-select'); 
    if(!sel) return; 
    const currentVal = sel.value;
    sel.innerHTML = ""; 
    
    const cachedCities = Object.keys(state.settings.poiCache); 
    const savedCities = state.settings.locations.map(l => l.city.toLowerCase()); 
    const allCities = [...new Set([...cachedCities, ...savedCities])].sort(); 
    
    allCities.forEach(city => { 
        const opt = document.createElement('option'); 
        opt.value = city; opt.innerText = city.toUpperCase(); 
        sel.appendChild(opt); 
    }); 
    
    if (currentVal && allCities.includes(currentVal)) {
        sel.value = currentVal;
    } else if (state.city) {
        sel.value = state.city.toLowerCase();
    }
    
    renderPOIs(); 
}

/**
 * Renders the points of interest for the selected city.
 */
function renderPOIs() { 
    const list = document.getElementById('poi-list'); 
    if(!list) return; 
    const city = document.getElementById('poi-city-select').value; 
    list.innerHTML = ""; 
    
    if (!city || !state.settings.poiCache[city]) {
        list.innerHTML = `<div style="padding: 20px; text-align: center; opacity: 0.5;">No landmarks discovered for ${city || 'this location'}.</div>`;
        return; 
    }
    
    state.settings.poiCache[city].forEach((p, i) => { 
        const row = document.createElement('div'); 
        row.className = 'list-item'; 
        row.innerHTML = `
            <div>
                <div class="list-item-title">${p.name}</div>
                <div class="list-item-sub">${p.description || "No description available."}</div>
            </div>
            <div style="display: flex; gap: 10px;">
                <button onclick="consultPOI('${city}', ${i})" style="color:var(--accent-color); background:none; border:none;">Consult</button>
                <button onclick="deletePOI('${city}', ${i})" style="color:#ff3b30; background:none; border:none;">Del</button>
            </div>
        `; 
        list.appendChild(row); 
    }); 
}

/**
 * Deletes a POI from the cache.
 */
function deletePOI(city, i) { 
    state.settings.poiCache[city].splice(i, 1); 
    isDirty = true; 
    updateSyncUI();
    renderPOIs(); 
    save();
}

/**
 * Clears all POIs for a specific city.
 */
function deleteCity() { 
    const city = document.getElementById('poi-city-select').value; 
    if (!city || !confirm(`Delete all landmarks for ${city.toUpperCase()}?`)) return; 
    delete state.settings.poiCache[city]; 
    isDirty = true; 
    updateSyncUI();
    renderPOISelectors(); 
    save();
}

/**
 * Uses AI to discover landmarks for the current city.
 */
async function discoverPOIs(btn) { 
    const city = state.city; 
    const isUS = state.country.toLowerCase().includes("usa") || state.country.toLowerCase().includes("united states"); 
    let rawPrompt = isUS ? state.settings.promptPOIDomestic : state.settings.promptPOIIntl; 
    
    rawPrompt = rawPrompt.split('{city}').join(state.city)
                         .split('{state_region}').join(state.state)
                         .split('{country}').join(state.country); 
                         
    if(btn) { btn.disabled = true; btn.innerText = "Finding..."; } 
    
    try { 
        const payload = { 
            prompt: rawPrompt, 
            model: state.settings.textModel || "gemini-search", 
            key: state.settings.apiKey 
        }; 
        
        const res = await fetch("/api/proxy/poi", { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
        }); 
        
        if (!res.ok) throw new Error("POI Discovery Failed");
        
        const data = await res.json(); 
        const cityKey = city.toLowerCase().trim(); 
        
        if (!state.settings.poiCache[cityKey]) state.settings.poiCache[cityKey] = []; 
        
        if (Array.isArray(data)) {
            state.settings.poiCache[cityKey] = [...state.settings.poiCache[cityKey], ...data]; 
        } else if (data && data.name) {
            state.settings.poiCache[cityKey].push({name: data.name, description: data.description}); 
        }
        
        // De-duplicate by name
        const unique = [];
        const names = new Set();
        state.settings.poiCache[cityKey].forEach(p => {
            if (!names.has(p.name)) {
                names.add(p.name);
                unique.push(p);
            }
        });
        state.settings.poiCache[cityKey] = unique;
        
        isDirty = true; 
        updateSyncUI();
        renderPOISelectors(); 
        save();
    } catch(e) { 
        console.error("Discovery error:", e); 
        alert("Landmark discovery failed. Check your API key and text model settings.");
    } 
    finally { 
        if(btn) { btn.disabled = false; btn.innerText = "✨ AI Discover"; } 
    } 
}

/**
 * Uses AI to fetch a detailed description for a specific POI.
 */
async function consultPOI(city, i) { 
    const p = state.settings.poiCache[city][i]; 
    const btn = event ? event.currentTarget : null; 
    if(btn) { btn.disabled = true; btn.innerText = "..."; } 
    
    try { 
        const res = await fetch("/api/proxy/consult?name=" + encodeURIComponent(p.name) + "&city=" + encodeURIComponent(city) + (state.settings.apiKey ? "&key="+state.settings.apiKey : "")); 
        if (!res.ok) throw new Error("Consult failed");
        const data = await res.json(); 
        p.description = data.description; 
        isDirty = true; 
        updateSyncUI();
        renderPOIs(); 
        save();
    } catch(e) {
        alert("AI Consultation failed.");
    } finally { 
        if(btn) { btn.disabled = false; btn.innerText = "Consult"; } 
    } 
}

/**
 * Renders the seasonal themes list.
 */
function renderThemes() { 
    const list = document.getElementById('theme-list'); 
    if(!list) return; 
    list.innerHTML = ""; 
    state.settings.themes.forEach((t, i) => { 
        const row = document.createElement('div'); 
        row.className = 'list-item'; 
        row.innerHTML = `
            <div>
                <div class="list-item-title">${t.Theme}</div>
                <div class="list-item-sub">${t.Begin} - ${t.End}</div>
            </div>
            <button onclick="deleteTheme(${i})" style="color:#ff3b30; background:none; border:none;">Del</button>
        `; 
        list.appendChild(row); 
    }); 
}

/**
 * Adds a new seasonal theme.
 */
function addThemePrompt() { 
    const Theme = prompt("Theme Name:"); 
    const Begin = prompt("Start Date (MMDD, e.g. 1015 for Oct 15):"); 
    const End = prompt("End Date (MMDD, e.g. 1031 for Oct 31):"); 
    if (Theme && Begin && End) { 
        state.settings.themes.push({Theme, Begin: parseInt(Begin), End: parseInt(End)}); 
        isDirty = true; 
        updateSyncUI();
        renderThemes(); 
        save();
    } 
}

/**
 * Deletes a seasonal theme.
 */
function deleteTheme(i) { 
    state.settings.themes.splice(i, 1); 
    isDirty = true; 
    updateSyncUI();
    renderThemes(); 
    save();
}

/**
 * Renders the styles list.
 */
function renderStyles() { 
    const list = document.getElementById('style-list'); 
    if(!list) return; 
    list.innerHTML = ""; 
    state.settings.styles.forEach((s, i) => { 
        const row = document.createElement('div'); 
        row.className = 'list-item'; 
        row.innerHTML = `
            <div><div class="list-item-title">${s}</div></div>
            <button onclick="deleteStyle(${i})" style="color:#ff3b30; background:none; border:none;">Del</button>
        `; 
        list.appendChild(row); 
    }); 
    
    // Update main dropdown
    const sel = document.getElementById('set-style');
    if (sel) {
        sel.innerHTML = "";
        state.settings.styles.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s; opt.innerText = s;
            sel.appendChild(opt);
        });
        sel.value = state.settings.style;
    }
}

/**
 * Adds a new image style.
 */
function addStylePrompt() { 
    const s = prompt("New Style Name (e.g., 'Cyberpunk', 'Fairy Tale'):"); 
    if(s) { 
        state.settings.styles.push(s); 
        isDirty = true; 
        updateSyncUI();
        renderStyles(); 
        save();
    } 
}

/**
 * Deletes an image style.
 */
function deleteStyle(i) { 
    if (state.settings.styles.length <= 1) return alert("Must keep at least one style.");
    state.settings.styles.splice(i, 1); 
    isDirty = true; 
    updateSyncUI();
    renderStyles(); 
    save();
}

/**
 * Fetches and displays usage statistics and balance for the API key.
 */
async function fetchUsageStats() {
    const key = state.settings.apiKey; 
    const container = document.getElementById('usage-stats');
    if (!container) return;
    
    if (!key) { 
        container.innerHTML = `<span style="opacity:0.5; font-size:11px;">API key required for stats.</span>`; 
        return; 
    }
    
    container.innerHTML = "Fetching stats...";
    try {
        const pRes = await fetch(`/api/proxy/account/profile?key=${encodeURIComponent(key)}`); 
        const pData = await pRes.json();
        
        const bRes = await fetch(`/api/proxy/account/balance?key=${encodeURIComponent(key)}`); 
        const bData = await bRes.json();
        
        const balance = bData.balance ?? bData.totalBalance ?? pData.balance ?? "N/A";
        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>Balance: <span style="color:#fff; font-weight:bold;">${isNaN(balance) ? balance : Number(balance).toFixed(2)} Pollen</span></div>
                <div style="font-size:10px; opacity:0.6;">Tier: ${pData.tier || "Standard"}</div>
            </div>
            <div style="width:100%; height:4px; background:rgba(255,255,255,0.1); border-radius:2px; margin-top:8px; overflow:hidden;">
                <div style="width: ${Math.min(100, (Number(balance)/1000)*100)}%; height:100%; background:var(--accent-color);"></div>
            </div>
        `;
    } catch(e) { 
        container.innerHTML = `<span style="color:#ff3b30; font-size:11px;">Failed to load usage stats.</span>`; 
    }
}

/**
 * Exports settings or specific data categories as JSON.
 */
function exportData(type) { 
    let data; 
    if (type === 'pois') data = state.settings.poiCache; 
    else if (type === 'themes') data = state.settings.themes; 
    else if (type === 'styles') data = state.settings.styles; 
    else if (type === 'locations') data = state.settings.locations; 
    else if (type === 'prompts') data = { 
        day: state.settings.promptDay, 
        night: state.settings.promptNight, 
        poidomestic: state.settings.promptPOIDomestic, 
        poiintl: state.settings.promptPOIIntl 
    }; 
    else data = state.settings;
    
    const modal = document.getElementById('import-modal');
    document.getElementById('import-title').innerText = "Export " + type.toUpperCase();
    document.getElementById('import-text').value = JSON.stringify(data, null, 2);
    if (modal) modal.classList.add('active');
}

/**
 * Opens the import modal.
 */
function openImport(type) { 
    state.importType = type; 
    const modal = document.getElementById('import-modal');
    document.getElementById('import-title').innerText = "Import " + type.toUpperCase(); 
    document.getElementById('import-text').value = ""; 
    if (modal) modal.classList.add('active'); 
}

/**
 * Closes the import modal.
 */
function closeImport() { 
    const modal = document.getElementById('import-modal');
    if (modal) modal.classList.remove('active'); 
}

/**
 * Validates and merges imported JSON data.
 * v1.19.0: Enhanced comment-removal logic using stable strings.
 */
function confirmImport() {
    let raw = document.getElementById('import-text').value;
    if (!raw) return closeImport();
    
    try {
        // Robust JSON Extraction
        const startBrace = raw.indexOf('{');
        const startBracket = raw.indexOf('[');
        let start = -1;
        if (startBrace !== -1 && startBracket !== -1) start = Math.min(startBrace, startBracket);
        else if (startBrace !== -1) start = startBrace;
        else if (startBracket !== -1) start = startBracket;

        const endBrace = raw.lastIndexOf('}');
        const endBracket = raw.lastIndexOf(']');
        let end = Math.max(endBrace, endBracket);

        if (start === -1 || end === -1) throw new Error("No JSON structure detected in input.");

        let jsonStr = raw.substring(start, end + 1);
        
        // Stable Comment Removal & Sanitization (v1.19.0)
        let cleaned = jsonStr
            .replace(/[\\u201C\\u201D\\u201E\\u201F\\u2033\\u2036]/g, '"') 
            .replace(/[\\u2018\\u2019\\u201A\\u201B\\u2032\\u2035]/g, "'") 
            .replace(/[\\u200B-\\u200D\\uFEFF]/g, "") 
            .replace(/,\\s*([\]}])/g, '$1') 
            // Advanced regex: skips strings and removes both // and /* */ comments
            .replace(/\\"(?:\\\\|\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g1) => g1 ? "" : m)
            .trim();

        const parsed = JSON.parse(cleaned);
        
        if (state.importType === 'themes') {
            state.settings.themes = Array.isArray(parsed) ? parsed : state.settings.themes;
            renderThemes();
        } else if (state.importType === 'pois') {
            state.settings.poiCache = (typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : state.settings.poiCache;
            renderPOISelectors();
        } else if (state.importType === 'styles') {
            state.settings.styles = Array.isArray(parsed) ? parsed : state.settings.styles;
            renderStyles();
        } else if (state.importType === 'locations') {
            state.settings.locations = Array.isArray(parsed) ? parsed : state.settings.locations;
            renderLocations();
        } else if (state.importType === 'full') {
            Object.assign(state.settings, parsed);
            setupUI(); renderThemes(); renderPOISelectors(); renderStyles(); renderLocations(); applyAppearance();
        } else if (state.importType === 'prompts') {
            state.settings.promptDay = parsed.day || state.settings.promptDay;
            state.settings.promptNight = parsed.night || state.settings.promptNight;
            state.settings.promptPOIDomestic = parsed.poidomestic || state.settings.promptPOIDomestic;
            state.settings.promptPOIIntl = parsed.poiintl || state.settings.promptPOIIntl;
            loadEditorPrompt();
        }
        
        isDirty = true; 
        updateSyncUI();
        save();
        alert("Import successful!");
        closeImport();
    } catch(e) {
        console.error("Heal Error:", e);
        alert("Import failed: " + e.message + "\\n\\nEnsure your JSON is well-formatted.");
    }
}

/**
 * Opens modal to manually add a landmark.
 */
function openPOIModal() { 
    document.getElementById('modal-poi-city').value = state.city; 
    document.getElementById('modal-poi-name').value = ""; 
    document.getElementById('modal-poi-desc').value = ""; 
    document.getElementById('poi-modal').classList.add('active'); 
}

/**
 * Closes manual POI modal.
 */
function closePOIModal() { 
    document.getElementById('poi-modal').classList.remove('active'); 
}

/**
 * Saves a manually added POI.
 */
async function savePOIModal() {
    const city = document.getElementById('modal-poi-city').value; 
    const name = document.getElementById('modal-poi-name').value; 
    const desc = document.getElementById('modal-poi-desc').value;
    
    if (!city || !name) return alert("City and Name are required");
    
    const cityKey = city.toLowerCase().trim();
    if (!state.settings.poiCache[cityKey]) state.settings.poiCache[cityKey] = []; 
    state.settings.poiCache[cityKey].push({name, description: desc});
    
    isDirty = true; 
    updateSyncUI();
    renderPOISelectors(); 
    closePOIModal();
    save();
}

/**
 * Uses AI to improve a manual landmark description.
 */
async function sanitizePOIModal() {
    const name = document.getElementById('modal-poi-name').value; 
    const desc = document.getElementById('modal-poi-desc').value; 
    const city = document.getElementById('modal-poi-city').value; 
    
    if (!name) return alert("Please enter a name first");
    
    const btn = document.getElementById('btn-modal-sanitize'); 
    if (btn) { btn.disabled = true; btn.innerText = "..."; }
    
    try { 
        const res = await fetch("/api/proxy/sanitize?name=" + encodeURIComponent(name) + "&description=" + encodeURIComponent(desc) + "&city=" + encodeURIComponent(city) + (state.settings.apiKey ? "&key="+state.settings.apiKey : "")); 
        if (!res.ok) throw new Error("Sanitize failed");
        const data = await res.json(); 
        document.getElementById('modal-poi-name').value = data.name; 
        document.getElementById('modal-poi-desc').value = data.description; 
    } catch(e) {
        alert("AI Sanitization failed.");
    } finally { 
        if (btn) { btn.disabled = false; btn.innerText = "✨ AI Sanitize"; }
    }
}

/**
 * Opens modal to add a custom location.
 */
function openLocationModal() { 
    document.getElementById('modal-loc-city').value = ""; 
    document.getElementById('modal-loc-state').value = ""; 
    document.getElementById('modal-loc-country').value = ""; 
    document.getElementById('modal-loc-lat').value = ""; 
    document.getElementById('modal-loc-lon').value = ""; 
    document.getElementById('loc-modal').classList.add('active'); 
}

/**
 * Closes custom location modal.
 */
function closeLocationModal() { 
    document.getElementById('loc-modal').classList.remove('active'); 
}

/**
 * Saves a new custom location.
 * v1.19.0: Added prompt to pre-populate landmarks.
 */
function saveLocationModal() {
    const city = document.getElementById('modal-loc-city').value; 
    const stateVal = document.getElementById('modal-loc-state').value;
    const countryVal = document.getElementById('modal-loc-country').value;
    const lat = parseFloat(document.getElementById('modal-loc-lat').value); 
    const lon = parseFloat(document.getElementById('modal-loc-lon').value);
    
    if (!city || isNaN(lat) || isNaN(lon)) return alert("Invalid Location Data");
    
    const newLoc = { city, state: stateVal, country: countryVal, lat, lon };
    state.settings.locations.push(newLoc);
    
    isDirty = true; 
    updateSyncUI();
    renderLocations(); 
    closeLocationModal();
    save();
    
    // v1.19.0 New Workflow: Prompt for pre-population
    if (confirm(`Pre-populate landmarks for ${city.toUpperCase()} with AI?`)) {
        // Set context temporarily
        const oldState = { city: state.city, state: state.state, country: state.country, lat: state.lat, lon: state.lon };
        state.city = city;
        state.state = stateVal || "";
        state.country = countryVal || "";
        state.lat = lat;
        state.lon = lon;
        
        discoverPOIs(null).then(() => {
            // Restore context
            state.city = oldState.city;
            state.state = oldState.state;
            state.country = oldState.country;
            state.lat = oldState.lat;
            state.lon = oldState.lon;
            renderPOISelectors();
        });
    }
}

/**
 * Uses Nominatim to fetch coordinates for a city.
 */
async function autofillLocation() {
    const city = document.getElementById('modal-loc-city').value; 
    const stateVal = document.getElementById('modal-loc-state').value; 
    if (!city) return alert("Please enter a city name");
    
    const btn = document.getElementById('btn-loc-autofill'); 
    if (btn) { btn.disabled = true; btn.innerText = "..."; }
    
    try { 
        const query = city + (stateVal ? ", " + stateVal : "");
        const res = await fetch("/api/proxy/nominatim?q=" + encodeURIComponent(query)); 
        const data = await res.json(); 
        if (data && data.length > 0) { 
            const top = data[0]; 
            document.getElementById('modal-loc-lat').value = parseFloat(top.lat).toFixed(4); 
            document.getElementById('modal-loc-lon').value = parseFloat(top.lon).toFixed(4); 
            if (top.address) {
                if (top.address.state && !stateVal) document.getElementById('modal-loc-state').value = top.address.state;
                document.getElementById('modal-loc-country').value = top.address.country || "USA";
            }
        } else {
            alert("City not found.");
        }
    } catch(e) { 
        alert("Error during autofill."); 
    } 
    finally { 
        if (btn) { btn.disabled = false; btn.innerText = "✨ AI Autofill"; } 
    }
}

/**
 * Switches the active location to a saved one.
 */
function applySavedLoc(i) {
    if (i === undefined) {
        const sel = document.getElementById('set-custom-loc');
        if (sel) i = parseInt(sel.value);
    }
    const loc = state.settings.locations[i];
    if(!loc) return;
    
    state.lat = loc.lat; 
    state.lon = loc.lon;
    state.city = loc.city; 
    state.state = loc.state || ""; 
    state.country = loc.country || "USA";
    state.settings.customLocIdx = i;
    
    const coordText = document.getElementById('coord-text');
    if (coordText) coordText.innerText = "Location: " + state.city;
    
    renderPOISelectors();
    applyAppearance();
}

/**
 * Toggles between GPS and manual location modes.
 */
function toggleCustomLoc() {
    const modeSel = document.getElementById('set-loc-mode');
    if (!modeSel) return;
    
    const isCustom = modeSel.value === 'custom';
    const row = document.getElementById('row-custom-list');
    if (row) row.style.display = isCustom ? 'flex' : 'none';
    
    if(isCustom) {
        applySavedLoc(state.settings.customLocIdx || 0);
    } else {
        requestLocation();
    }
}

// --- 3. GLOBAL EXPORTS ---
// Ensuring all functions are available to the DOM event listeners.

window.switchTab = switchTab;
window.switchSubTab = switchSubTab;
window.handleGenerate = handleGenerate;
window.openFullRes = openFullRes;
window.resetApp = resetApp;
window.resetPrompts = resetPrompts;
window.syncSettings = syncSettings;
window.loadEditorPrompt = loadEditorPrompt;
window.saveEditorPrompt = saveEditorPrompt;
window.openImport = openImport;
window.confirmImport = confirmImport;
window.closeImport = closeImport;
window.exportData = exportData;
window.clearCategory = (t) => { 
    if(confirm(`Clear all ${t}?`)) {
        state.settings[t] = Array.isArray(state.settings[t]) ? [] : {}; 
        isDirty = true; 
        updateSyncUI(); 
        save(); 
        location.reload(); 
    }
};
window.openPOIModal = openPOIModal;
window.closePOIModal = closePOIModal;
window.savePOIModal = savePOIModal;
window.sanitizePOIModal = sanitizePOIModal;
window.deletePOI = deletePOI;
window.discoverPOIs = discoverPOIs;
window.deleteCity = deleteCity;
window.openLocationModal = openLocationModal;
window.closeLocationModal = closeLocationModal;
window.saveLocationModal = saveLocationModal;
window.autofillLocation = autofillLocation;
window.deleteLocation = deleteLocation;
window.applySavedLoc = applySavedLoc;
window.toggleCustomLoc = toggleCustomLoc;
window.addStylePrompt = addStylePrompt;
window.deleteStyle = deleteStyle;
window.addThemePrompt = addThemePrompt;
window.deleteTheme = deleteTheme;
window.saveProfile = saveProfile;
window.loadProfile = loadProfile;
window.deleteProfile = deleteProfile;
window.createRemoteProfile = createRemoteProfile;
window.switchRemoteProfile = switchRemoteProfile;
window.deleteRemoteProfile = deleteRemoteProfile;
window.purgeCloudData = purgeCloudData;
window.refreshRemoteProfiles = refreshRemoteProfiles;
window.manualCloudSync = manualCloudSync;
window.fetchUsageStats = fetchUsageStats;
window.applyAppearance = applyAppearance;
window.toggleCustomRes = toggleCustomRes;
window.toggleAccordion = toggleAccordion;
window.startWeatherEngine = startWeatherEngine;
window.stopWeatherEngine = stopWeatherEngine;

// Debug Exports
window.state = state;
window.STORAGE_KEY = STORAGE_KEY;

console.log("Lumina Aeris v1.19.0 logic loaded successfully.");
