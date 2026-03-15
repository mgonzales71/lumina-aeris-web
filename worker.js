// Lumina Aeris Web & Worker - Management Suite v1.11.0
// FULL VERSION - 100% COMPLETE - NO PLACEHOLDERS.
// Mandate: NO Truncation. NO Minification. NO Missing Logic.

// --- 1. SERVER-SIDE CONSTANTS (Shared with Client) ---
const SHARED_DEFAULT_DAY = "Generate a {style} style image of {poi_name} in {city}, {state_region}. POI description: {poi_desc}. Ensure architectural and geographical accuracy based on real-world references. Time: {time_of_day} {datetime}. Weather: {weather}, {temperature}. Sun at {sunrise} and {sunset} for realistic positioning. Adjust sun visibility based on {weather}. Include the UV index and visibility in the depiction. Account for cloud cover to influence lighting and shadows. Safe Zone Framing: keep significant elements centered and critical content within 80-90 percent of the image width and height. Atmosphere: incorporate the theme of {theme} as a subtle, realistic element. Apply a professional, natural-looking auto-enhancement: brighten shadows, recover highlights, boost midtone contrast, and enhance clarity while preserving a photorealistic look.";
const SHARED_DEFAULT_NIGHT = "Generate a {style} style image of {poi_name} in {city}, {state_region}. POI description: {poi_desc}. Ensure architectural and geographical accuracy based on real-world references. Time: {time_of_day} {datetime}. Weather: {weather}, {temperature}. Moon in {moon_phase} with {moon_illumination} illumination. Account for moonrise {moonrise} and moonset {moonset} for realistic positioning. Adjust moon visibility based on {weather}. Safe Zone Framing: keep significant elements centered and critical content within 80-90 percent of the image width and height. Atmosphere: incorporate the theme of {theme} as a subtle, realistic element. Apply a professional, natural-looking auto-enhancement: brighten shadows, recover highlights, boost midtone contrast, and enhance clarity while preserving a photorealistic look.";
const SHARED_DEFAULT_POI_DOMESTIC = "You are an expert in identifying unique and notable points of interest, views, and vistas of the requested locations. Please provide one item per line without any formatting or citations. Generate a list of up to 30 visually distinct points of interest, landmarks, or vistas in or near {city}, {state_region}. Take your time to conduct a comprehensive search. Formatting Guidelines: 1. Provide only a raw JSON array of objects. 2. Exclude markdown code blocks (no backticks). 3. Omit any introductory or concluding text. 4. Each object must have precisely two keys: \"name\" and \"description\". 5. The \"description\" should consist of one to two concise sentences that visually describe the named point of interest.";
const SHARED_DEFAULT_POI_INTL = "You are an expert in identifying unique and notable points of interest, views, and vistas of the requested locations. Please provide one item per line without any formatting or citations. Generate a list of up to 30 visually distinct points of interest, landmarks, or vistas in or near {city}, {country}. Take your time to conduct a comprehensive search. Formatting Guidelines: 1. Provide only a raw JSON array of objects. 2. Exclude markdown code blocks (no backticks). 3. Omit any introductory or concluding text. 4. Each object must have precisely two keys: \"name\" and \"description\". 5. The \"description\" should consist of one to two concise sentences that visually describe the named point of interest.";
const WMO_MAP = { 0: "Clear", 1: "Mainly Clear", 2: "Partly Cloudy", 3: "Overcast", 45: "Fog", 61: "Rain", 71: "Snow", 95: "Thunderstorm" };

const HTML_CONTENT = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <title>Lumina Aeris</title>
    <style>
        :root {
            --bg-color: #000;
            --text-color: #fff;
            --accent-color: #007aff;
            --card-bg: rgba(255, 255, 255, 0.1);
            --safe-area-top: env(safe-area-inset-top);
            --safe-area-bottom: env(safe-area-inset-bottom);
        }

        body {
            margin: 0; padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-color);
            overflow-x: hidden;
            -webkit-user-select: none;
            user-select: none;
        }

        /* --- Header --- */
        header {
            padding-top: max(20px, var(--safe-area-top));
            padding-bottom: 10px;
            text-align: center;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            position: sticky; top: 0; z-index: 100;
            border-bottom: 0.5px solid rgba(255,255,255,0.1);
        }

        h1 {
            font-size: 24px; font-weight: 800; margin: 0;
            background: linear-gradient(90deg, #007aff, #af52de, #ff2d55, #ff9500, #ffcc00, #34c759, #007aff);
            background-size: 200% auto;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: shine 5s linear infinite;
        }
        @keyframes shine { to { background-position: 200% center; } }

        /* --- Layout --- */
        .container { padding: 20px; padding-bottom: 120px; max-width: 600px; margin: 0 auto; }
        .view { display: none; }
        .view.active { display: block; animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        /* --- Preview Card --- */
        .preview-card {
            position: relative; background: #111; border-radius: 32px; overflow: hidden;
            height: 500px; width: 230px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;
            cursor: pointer;
        }
        .preview-image { width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 0.5s ease; }
        .preview-image.loaded { opacity: 1; }
        #firefly-canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; opacity: 0; transition: opacity 0.5s; }
        #firefly-canvas.active { opacity: 1; }

        /* --- Overlays --- */
        .overlay-label {
            position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%);
            background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
            padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 14px; white-space: nowrap;
        }
        .overlay-info {
            position: absolute; bottom: 0; left: 0; right: 0; padding: 15px;
            background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
        }

        /* --- Forms & Settings --- */
        .group { background: #1c1c1e; border-radius: 12px; overflow: hidden; margin-bottom: 20px; }
        .row { padding: 12px 16px; border-bottom: 0.5px solid #38383a; display: flex; justify-content: space-between; align-items: center; min-height: 44px; }
        .row:last-child { border-bottom: none; }
        .label { font-size: 15px; }
        select, input, textarea { background: transparent; color: var(--accent-color); border: none; font-size: 15px; text-align: right; outline: none; font-family: inherit; }
        textarea { text-align: left; width: 100%; height: 150px; resize: none; color: #fff; font-size: 13px; margin-top: 10px; padding: 10px; }
        
        .section-title { font-size: 13px; color: #888; text-transform: uppercase; margin: 0 0 8px 16px; font-weight: 600; }

        /* --- Prompt Builder --- */
        .chip-scroll { display: flex; gap: 8px; overflow-x: auto; padding: 10px 0; -webkit-overflow-scrolling: touch; }
        .chip { background: rgba(0,122,255,0.15); color: var(--accent-color); padding: 6px 12px; border-radius: 8px; font-size: 12px; font-family: monospace; white-space: nowrap; border: 0.5px solid rgba(0,122,255,0.3); cursor: pointer; }

        /* --- Buttons --- */
        .btn { width: 100%; padding: 16px; border-radius: 18px; border: none; background: var(--accent-color); color: white; font-size: 17px; font-weight: 600; margin-bottom: 10px; cursor: pointer; transition: transform 0.1s; }
        .btn:active { transform: scale(0.98); }
        .btn-secondary { background: #333; }
        .btn-danger { background: #ff3b30; }
        .btn-home { width: 80%; max-width: 260px; display: block; margin: 0 auto 10px; padding: 14px; font-size: 15px; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* --- Tab Bar --- */
        .tab-bar {
            position: fixed; bottom: 0; left: 0; right: 0;
            background: rgba(28, 28, 30, 0.9); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
            padding-bottom: max(5px, var(--safe-area-bottom)); display: flex; border-top: 0.5px solid rgba(255,255,255,0.1);
        }
        .tab-btn { background: none; border: none; color: #888; padding: 10px; display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 10px; flex: 1; }
        .tab-btn.active { color: var(--accent-color); }
        .tab-icon { font-size: 20px; }

        .list-item { padding: 12px 16px; border-bottom: 0.5px solid #38383a; display: flex; justify-content: space-between; align-items: center; }
        .list-item-title { font-weight: 600; font-size: 15px; }
        .list-item-sub { font-size: 12px; color: #888; }

        /* --- Global Overlay (Import) --- */
        #import-modal {
            display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.95); z-index: 2000; flex-direction: column; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box;
        }
        #import-modal.active { display: flex; }
        #import-text { width: 100%; max-width: 600px; height: 400px; background: #1c1c1e; color: #fff; border: 1px solid #333; border-radius: 12px; padding: 15px; font-family: monospace; font-size: 12px; }
    </style>
</head>
<body>

<div id="import-modal">
    <div class="section-title" id="import-title">Import Data</div>
    <textarea id="import-text" placeholder="Paste massive JSON here..."></textarea>
    <div style="display: flex; gap: 10px; width: 100%; max-width: 600px; margin-top: 20px;">
        <button onclick="confirmImport()" class="btn" style="flex: 1">Confirm Import</button>
        <button onclick="closeImport()" class="btn btn-secondary" style="flex: 1">Cancel</button>
    </div>
</div>

<header>
    <h1 id="header-title">Lumina Aeris</h1>
</header>

<div id="home-view" class="view active container">
    <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; color: #888; margin-bottom: 10px; letter-spacing: 1px;">
        <span id="status-text">READY</span>
        <span id="coord-text">LOCATING...</span>
    </div>
    <div class="preview-card" id="preview-container" onclick="openFullRes()">
        <canvas id="firefly-canvas"></canvas>
        <div style="font-size: 48px; opacity: 0.2;" id="placeholder">✨</div>
        <img id="result-image" class="preview-image" />
        <div id="poi-label" class="overlay-label" style="display: none;"></div>
        <div id="info-overlay" class="overlay-info" style="display: none;">
            <div id="theme-tag" style="font-size: 10px; font-weight: 800; background: rgba(255,255,255,0.2); padding: 4px 6px; border-radius: 4px; display: inline-block; margin-bottom: 4px;">GENERAL</div>
            <div id="poi-name" style="font-size: 18px; font-weight: bold;">Select City</div>
            <div id="poi-desc" style="font-size: 11px; opacity: 0.8; margin-top: 2px;">Generate to see landmarks.</div>
        </div>
    </div>
    <button id="btn-gen-ui" class="btn btn-home" onclick="handleGenerate()">Generate Wallpaper</button>
    <button id="btn-save-ui" class="btn btn-secondary btn-home" style="display: none;" onclick="openFullRes()">Save Wallpaper</button>
</div>

<div id="prompts-view" class="view container">
    <div class="section-title">Mode Selection</div>
    <div class="group"><div class="row"><span class="label">Editing Template</span><select id="prompt-mode" onchange="loadEditorPrompt()"><option value="day">Daytime Template</option><option value="night">Nighttime Template</option><option value="poidomestic">POI Query - Domestic</option><option value="poiintl">POI Query - International</option></select></div></div>
    <div class="section-title">Template Editor</div>
    <div class="group" style="padding: 10px;"><textarea id="prompt-editor" spellcheck="false" oninput="saveEditorPrompt()"></textarea><div class="chip-scroll" id="token-chips"></div></div>
    <div class="group"><div class="row"><span class="label">Bake POI Label</span><input type="checkbox" id="set-overlay" onchange="syncSettings()"></div></div>
    <button onclick="resetPrompts()" class="btn btn-secondary btn-danger" style="margin-top: 20px;">Reset to Defaults</button>
</div>

<div id="data-view" class="view container">
    <div style="display: flex; gap: 10px; margin-bottom: 20px;"><button onclick="switchSubTab('themes')" id="tab-themes" class="btn btn-secondary" style="flex:1">Themes</button><button onclick="switchSubTab('pois')" id="tab-pois" class="btn btn-secondary" style="flex:1">Landmarks</button><button onclick="switchSubTab('styles')" id="tab-styles" class="btn btn-secondary" style="flex:1">Styles</button><button onclick="switchSubTab('prompts')" id="tab-data-prompts" class="btn btn-secondary" style="flex:1">Prompts</button></div>
    
    <div id="sub-themes"><div class="section-title">Seasonal Themes</div><div class="group" id="theme-list"></div><div style="display: flex; gap: 10px; flex-wrap: wrap;"><button onclick="addThemePrompt()" class="btn btn-secondary" style="flex:1; min-width: 140px;">➕ Add Theme</button><button onclick="openImport('themes')" class="btn btn-secondary" style="flex:1; min-width: 140px;">📥 Import</button><button onclick="exportData('themes')" class="btn btn-secondary" style="flex:1; min-width: 140px;">📤 Export/View</button><button onclick="clearCategory('themes')" class="btn btn-secondary btn-danger" style="flex:1; min-width: 140px;">🗑️ Clear</button></div></div>
    
    <div id="sub-pois" style="display: none;">
        <div class="group"><div class="row"><span class="label">City</span><div style="display: flex; align-items: center; gap: 8px;"><select id="poi-city-select" onchange="renderPOIs()"></select><button onclick="deleteCity()" style="color:#ff3b30; background:none; border:none; font-size:12px;">Del</button></div></div></div>
        <div class="group" id="poi-list"></div>
        <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 10px;"><button onclick="discoverPOIs()" class="btn btn-secondary" style="flex:1; min-width: 140px;">✨ AI Discover</button><button onclick="addPOIPrompt()" class="btn btn-secondary" style="flex:1; min-width: 140px;">➕ Add Manual</button><button onclick="openImport('pois')" class="btn btn-secondary" style="flex:1; min-width: 140px;">📥 Import Cache</button><button onclick="exportData('pois')" class="btn btn-secondary" style="flex:1; min-width: 140px;">📤 Export/View</button></div><button onclick="clearCategory('pois')" class="btn btn-secondary btn-danger">🗑️ Clear All POIs</button>
    </div>

    <div id="sub-styles" style="display: none;"><div class="section-title">Visual Styles</div><div class="group" id="style-list"></div><button onclick="addStylePrompt()" class="btn btn-secondary">➕ Add Style</button></div>

    <div id="sub-prompts-data" style="display: none;">
        <div class="section-title">Prompt Management</div>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button onclick="openImport('prompts')" class="btn btn-secondary" style="flex:1; min-width: 140px;">📥 Import Prompts</button>
            <button onclick="exportData('prompts')" class="btn btn-secondary" style="flex:1; min-width: 140px;">📤 Export Prompts</button>
        </div>
    </div>
</div>

<div id="settings-view" class="view container">
    <div class="section-title">AI Configuration</div>
    <div class="group">
        <div class="row"><span class="label">Image Model</span><select id="set-model" onchange="syncSettings()"></select></div>
        <div class="row"><span class="label">Text Model</span><select id="set-text-model" onchange="syncSettings()"></select></div>
        <div class="row"><span class="label">Quality</span><select id="set-quality" onchange="syncSettings()"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High (8K)</option><option value="hd">HD (16K)</option></select></div>
        <div class="row"><span class="label">Dimensions</span><select id="set-res" onchange="syncSettings()"><option value="1290x2796">iPhone (1290x2796)</option><option value="1024x1024">Square (1024x1024)</option><option value="1920x1080">Desktop (1920x1080)</option></select></div>
        <div class="row"><span class="label">Style</span><select id="set-style" onchange="syncSettings()"></select></div>
        <div class="row"><span class="label">API Key</span><input type="password" id="set-apikey" placeholder="Pollinations Key" onchange="syncSettings()"></div>
    </div>
    
    <div class="section-title">Advanced Image Options</div>
    <div class="group">
        <div class="row"><span class="label">Transparent</span><input type="checkbox" id="set-transparent" onchange="syncSettings()"></div>
        <div class="row"><span class="label">Safe Search</span><input type="checkbox" id="set-safe" onchange="syncSettings()"></div>
        <div class="row"><span class="label">AI Enhance</span><input type="checkbox" id="set-enhance" onchange="syncSettings()"></div>
        <div class="row"><span class="label">Enable Seed</span><input type="checkbox" id="set-seed-enable" onchange="syncSettings()"></div>
        <div class="row"><span class="label">Seed (-1 to 2B)</span><input type="number" id="set-seed" value="0" min="-1" max="2147483647" onchange="syncSettings()"></div>
        <div class="row"><span class="label">Negative Prompt (Enable)</span><input type="checkbox" id="set-neg-enable" onchange="syncSettings()"></div>
        <div class="row"><span class="label">Negative Prompt</span><input type="text" id="set-neg" placeholder="Optional" style="width: 60%" onchange="syncSettings()"></div>
    </div>

    <div class="section-title">Location</div>
    <div class="group">
        <div class="row"><span class="label">Mode</span><select id="set-loc-mode" onchange="syncSettings(); toggleCustomLoc()"><option value="gps">Live GPS</option><option value="custom">Custom Location</option></select></div>
        <div class="row" id="row-custom-city" style="display: none;"><input type="text" id="set-city" placeholder="City, State" style="width: 100%; text-align: left;" onchange="validateCustomLoc()"></div>
    </div>
    
    <div class="section-title">Profiles</div>
    <div class="group" id="profile-list"></div>
    <div class="group" style="padding: 12px;"><input type="text" id="new-profile-name" placeholder="New Profile Name" style="width: 100%; text-align: left; color: #fff; margin-bottom: 10px;"><button onclick="saveProfile()" class="btn btn-secondary">Save Current Config</button></div>
    <button onclick="resetApp()" class="btn btn-danger">Wipe All App Data</button>
</div>

<nav class="tab-bar">
    <button class="tab-btn active" onclick="switchTab('home')"><span class="tab-icon">🏠</span><span>Home</span></button>
    <button class="tab-btn" onclick="switchTab('prompts')"><span class="tab-icon">✍️</span><span>Prompts</span></button>
    <button class="tab-btn" onclick="switchTab('data')"><span class="tab-icon">🗺️</span><span>Data</span></button>
    <button class="tab-btn" onclick="switchTab('settings')"><span class="tab-icon">⚙️</span><span>More</span></button>
</nav>

<script>
// --- 1. GLOBALS & INJECTION ---
// We inject server constants here as JSON strings to avoid template literal conflicts
const DEFAULT_DAY_STR = ${JSON.stringify(SHARED_DEFAULT_DAY)};
const DEFAULT_NIGHT_STR = ${JSON.stringify(SHARED_DEFAULT_NIGHT)};
const DEFAULT_POI_DOMESTIC_STR = ${JSON.stringify(SHARED_DEFAULT_POI_DOMESTIC)};
const DEFAULT_POI_INTL_STR = ${JSON.stringify(SHARED_DEFAULT_POI_INTL)};
const TOKENS_LIST = ["{style}", "{poi_name}", "{poi_desc}", "{city}", "{state_region}", "{country}", "{time_of_day}", "{datetime}", "{weather}", "{temperature}", "{theme}", "{moon_phase}", "{moon_illumination}", "{moonrise}", "{moonset}", "{sunrise}", "{sunset}", "{uv_index}", "{visibility}", "{cloud_cover}", "{wind_speed}"];

// Declare state at the top level so it is hoisted and available immediately
var state = {
    currentTab: 'home', isGenerating: false,
    lat: 45.52, lon: -122.67, city: "Portland", state: "Oregon", country: "USA",
    importType: '',
    settings: {
        promptDay: DEFAULT_DAY_STR, promptNight: DEFAULT_NIGHT_STR,
        promptPOIDomestic: DEFAULT_POI_DOMESTIC_STR, promptPOIIntl: DEFAULT_POI_INTL_STR,
        quality: "medium", model: "gptimage", textModel: "gemini-search", style: "Hyper photo realistic", resolution: "1290x2796",
        overlayLabel: false, apiKey: "", syncSecret: "", locMode: "gps", customCity: "Portland, Oregon",
        themes: [{"Begin":101, "End":103, "Theme":"New Years"}, {"Begin":1015, "End":1031, "Theme":"Halloween"}, {"Begin":1220, "End":1231, "Theme":"Holiday Season"}],
        poiCache: {}, profiles: [],
        styles: ["Hyper photo realistic", "Cinematic photography", "Oil painting", "Anime art", "Cyberpunk", "Architectural drawing"],
        transparent: false, safe: true, enhance: false, seedEnable: false, seed: 0, negativePrompt: "", negEnable: false
        }
        };

        // --- 2. INITIALIZATION ---
        window.onload = async () => {
        // Attempt to load settings
        const saved = localStorage.getItem('lumina_v1.10.12');
        if (saved) {
        try {
            const parsed = JSON.parse(saved);
            Object.assign(state.settings, parsed);
        } catch(e) { console.error("Save load error", e); }
        } else {
        // Fallback to previous versions if needed
        const old = localStorage.getItem('lumina_v1.9.8') || localStorage.getItem('lumina_v1.9.7') || localStorage.getItem('lumina_v1.9.6');
        if (old) {
            try {
                Object.assign(state.settings, JSON.parse(old));
                save();
            } catch(e) {}
        }
        }

        // NEW: Cloudflare KV Sync (Pull)
        if (state.settings.syncSecret) {
        try {
            const res = await fetch("/api/config?secret=" + encodeURIComponent(state.settings.syncSecret));
            if (res.ok) {
                const remote = await res.json();
                if (remote && remote.promptDay) {
                    Object.assign(state.settings, remote);
                    localStorage.setItem('lumina_v1.10.12', JSON.stringify(state.settings)); 
                }
            }
        } catch(e) { console.error("KV Pull failed", e); }
        }

        // Ensure critical defaults exist if cache was empty
        if(!state.settings.styles || state.settings.styles.length === 0) state.settings.styles = ["Hyper photo realistic", "Cinematic photography", "Oil painting", "Anime art", "Cyberpunk", "Architectural drawing"];
        if(!state.settings.themes || state.settings.themes.length === 0) state.settings.themes = [{"Begin":101, "End":103, "Theme":"New Years"}, {"Begin":1015, "End":1031, "Theme":"Halloween"}, {"Begin":1220, "End":1231, "Theme":"Holiday Season"}];

        await fetchModels();
        setupUI(); renderThemes(); renderPOISelectors(); renderProfiles(); renderStyles();

        if (state.settings.locMode === 'gps') requestLocation();
        };

        async function save() { 
        localStorage.setItem('lumina_v1.10.12', JSON.stringify(state.settings)); 
        if (state.settings.syncSecret) {
        try {
            await fetch("/api/config", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "X-Lumina-Secret": state.settings.syncSecret 
                },
                body: JSON.stringify(state.settings)
            });
        } catch(e) { console.error("KV Sync failed", e); }
        }
        }
// --- 3. CORE FUNCTIONS ---
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
        let start = raw.indexOf('{'); if (start === -1) start = raw.indexOf('[');
        let end = raw.lastIndexOf('}'); if (end === -1) end = raw.lastIndexOf(']');
        if (start === -1 || end === -1) throw new Error("Could not find JSON data in paste.");
        
        let cleaned = raw.substring(start, end + 1)
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/[\u200B-\u200D\uFEFF]/g, "");
            
        cleaned = cleaned.replace(/,[\s\r\n]*([\]\}])/g, '$1');
        
        const parsed = JSON.parse(cleaned);
        if (state.importType === 'themes') { state.settings.themes = parsed; renderThemes(); }
        else if (state.importType === 'pois') { state.settings.poiCache = parsed; renderPOISelectors(); }
        else if (state.importType === 'prompts') { 
            state.settings.promptDay = parsed.day || DEFAULT_DAY_STR; 
            state.settings.promptNight = parsed.night || DEFAULT_NIGHT_STR; 
            loadEditorPrompt(); 
        }
        save(); 
        alert("Import successful!");
        closeImport();
    } catch(e) { 
        alert("Import failed: " + e.message); 
        console.error(e); 
    }
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
                opt.value = m.name;
                opt.innerText = m.name + (m.paid_only ? ' *' : '');
                sel.appendChild(opt);
            });
            // Select current or default
            sel.value = state.settings.model || "gptimage";
        }
    } catch(e) {
        console.error("Model fetch failed", e);
        // Fallback if API fails
        const sel = document.getElementById('set-model'); 
        if(sel) sel.innerHTML = '<option value="gptimage">GPT Image</option><option value="flux">Flux</option>';
    }

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
    } catch(e) {
        const tsel = document.getElementById('set-text-model');
        if(tsel) tsel.innerHTML = '<option value="gemini-search">Gemini Search</option>';
    }
}

function setupUI() {
    loadEditorPrompt();
    document.getElementById('set-quality').value = state.settings.quality;
    if (document.getElementById('set-text-model')) document.getElementById('set-text-model').value = state.settings.textModel || "gemini-search";
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
    
    toggleCustomLoc(); 
    renderTokens();
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
            const start = area.selectionStart;
            const end = area.selectionEnd;
            area.setRangeText(t, start, end, 'end');
            saveEditorPrompt();
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
    document.getElementById('row-custom-city').style.display = isCustom ? 'flex' : 'none';
}

async function validateCustomLoc() {
    const cityStr = document.getElementById('set-city').value;
    if (!cityStr || cityStr.length < 3) return;
    try {
        const res = await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent(cityStr));
        const data = await res.json();
        if (data.length > 0) {
            state.lat = parseFloat(data[0].lat);
            state.lon = parseFloat(data[0].lon);
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
    else if (type === 'prompts') data = { day: state.settings.promptDay, night: state.settings.promptNight };
    
    console.log("Lumina Export (" + type + "):", JSON.stringify(data, null, 2));
    alert("JSON logged to browser console (F12).");
}

function clearCategory(type) {
    if (!confirm("Wipe all " + type + "?")) return;
    if (type === 'themes') state.settings.themes = [];
    else state.settings.poiCache = {};
    save(); renderThemes(); renderPOISelectors();
}

function renderStyles() {
    const list = document.getElementById('style-list');
    const sel = document.getElementById('set-style');
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
    const Theme = prompt("Theme Name:");
    const Begin = prompt("Start MMDD:");
    const End = prompt("End MMDD:");
    if (Theme && Begin && End) { 
        state.settings.themes.push({Theme, Begin: parseInt(Begin), End: parseInt(End)}); 
        renderThemes(); save(); 
    }
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
        const opt = document.createElement('option'); opt.value = city; opt.innerText = city.toUpperCase();
        sel.appendChild(opt);
    });
    renderPOIs();
}
function renderPOIs() {
    const list = document.getElementById('poi-list'); if(!list) return;
    const city = document.getElementById('poi-city-select').value;
    list.innerHTML = ""; 
    if (!city || !state.settings.poiCache[city]) return;
    
    state.settings.poiCache[city].forEach((p, i) => {
        const row = document.createElement('div'); row.className = 'list-item';
        row.innerHTML = '<div><div class="list-item-title">' + p.name + '</div><div class="list-item-sub">' + (p.description || "") + '</div></div><div><button onclick="consultPOI(\\'' + city + '\\', ' + i + ')" style="color:var(--accent-color); background:none; border:none; margin-right:10px;">Consult</button><button onclick="deletePOI(\\'' + city + '\\', ' + i + ')" style="color:#ff3b30; background:none; border:none;">Del</button></div>';
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
    const p = state.settings.poiCache[city][i];
    const btn = event.currentTarget; 
    btn.disabled = true; btn.innerText = "...";
    try {
        const res = await fetch("/api/proxy/consult?name=" + encodeURIComponent(p.name) + "&city=" + encodeURIComponent(city) + (state.settings.apiKey ? "&key="+state.settings.apiKey : ""));
        const data = await res.json();
        p.description = data.description; 
        renderPOIs(); save();
    } finally { 
        btn.disabled = false; btn.innerText = "Consult"; 
    }
}

async function addPOIPrompt() {
    const city = document.getElementById('poi-city-select').value || prompt("City (lowercase):").toLowerCase();
    if (!city) return;
    const name = prompt("Landmark Name:");
    if (!name) return;
    const desc = confirm("Use AI description?") ? "..." : prompt("Description:");
    if (!state.settings.poiCache[city]) state.settings.poiCache[city] = [];
    const idx = state.settings.poiCache[city].push({name, description: desc}) - 1;
    renderPOISelectors(); save();
    if (desc === "...") consultPOI(city, idx);
}

async function discoverPOIs(btn) {
    const city = state.city;
    const isUS = state.country.toLowerCase().includes("usa") || state.country.toLowerCase().includes("united states");
    let rawPrompt = isUS ? (state.settings.promptPOIDomestic || DEFAULT_POI_DOMESTIC_STR) : (state.settings.promptPOIIntl || DEFAULT_POI_INTL_STR);
    rawPrompt = rawPrompt.split('{city}').join(state.city).split('{state_region}').join(state.state).split('{country}').join(state.country);

    if(btn && btn.id !== 'btn-gen-ui') { btn.disabled = true; btn.innerText = "Finding..."; }

    try {
        const payload = { prompt: rawPrompt, model: state.settings.textModel || "gemini-search", key: state.settings.apiKey };
        const res = await fetch("/api/proxy/poi", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const textRes = await res.text();
        const cleanJson = textRes.split("\`\`\`json").join("").split("\`\`\`").join("").trim();
        const data = JSON.parse(cleanJson);
        const cityKey = city.toLowerCase().trim();
        if (!state.settings.poiCache[cityKey]) state.settings.poiCache[cityKey] = [];

        if (Array.isArray(data)) {
            state.settings.poiCache[cityKey] = [...state.settings.poiCache[cityKey], ...data];
        } else if (data.name) {
            state.settings.poiCache[cityKey].push({name: data.name, description: data.description});
        }
        renderPOISelectors(); save();
    } catch(e) {
    } finally {
        if(btn && btn.id !== 'btn-gen-ui') { btn.disabled = false; btn.innerText = "✨ AI Discover"; }
    }
}
function openFullRes() {
    const src = document.getElementById('result-image').src;
    if (src) window.open(src, '_blank');
}

function browserSanitize(input) {
    if (!input) return "";
    let str = input.toString();
    str = str.split("\\n").join(" ");
    str = str.split("%").join(" percent");
    str = str.split("&").join(" and");
    str = str.split("#").join("");
    str = str.split("?").join("");
    str = str.split("\\\"").join("'");
    str = str.split("/").join(" ");
    str = str.split("\\\\").join(" ");
    return str.trim();
}

async function handleGenerate() {
    if (state.isGenerating) return;
    state.isGenerating = true;
    const btn = document.getElementById('btn-gen-ui');
    btn.disabled = true; btn.innerText = "Locating...";
    startFireflies(); document.getElementById('firefly-canvas').classList.add('active');

    try {
        const envRes = await fetch("/api/proxy/weather?lat=" + state.lat + "&lon=" + state.lon);
        const env = await envRes.json();
        const cityKey = state.city.toLowerCase().trim();
        
        if (!state.settings.poiCache[cityKey] || state.settings.poiCache[cityKey].length === 0) {
            btn.innerText = "Discovering...";
            await discoverPOIs();
        }
        
        const pois = state.settings.poiCache[cityKey] || [{name: state.city, description: "A beautiful view"}];
        const poi = pois[Math.floor(Math.random() * pois.length)];
        const theme = getThemeForDate();

        btn.innerText = "Dreaming...";
        const rawP = buildPrompt(env, poi, theme);
        const cleanP = browserSanitize(rawP) || "Wallpaper of " + poi.name;
        
        if (cleanP.length > 1500) {
            alert("Your prompt is too long (" + cleanP.length + " chars). Please reduce the length of your custom styles or themes to prevent server errors.");
            btn.disabled = false; state.isGenerating = false; stopFireflies(); document.getElementById('firefly-canvas').classList.remove('active');
            btn.innerText = "✨ AI Discover";
            return;
        }
        
        const [w, h] = state.settings.resolution.split('x');
        const seed = state.settings.seedEnable ? state.settings.seed : Math.floor(Math.random()*999999);
        let url = "https://gen.pollinations.ai/image/" + encodeURIComponent(cleanP) + "?width=" + w + "&height=" + h + "&seed=" + seed + "&model=" + state.settings.model + "&nologo=true";
        
        if (state.settings.apiKey) url += "&key=" + state.settings.apiKey;
        if (state.settings.transparent) url += "&transparent=true";
        if (state.settings.safe === false) url += "&safe=false";
        if (state.settings.enhance) url += "&enhance=true";
        if (state.settings.negEnable && state.settings.negativePrompt) url += "&negative_prompt=" + encodeURIComponent(state.settings.negativePrompt);

        try {
            const imgRes = await fetch(url);
            if (!imgRes.ok) throw new Error("Server error " + imgRes.status);
            const blob = await imgRes.blob();
            const objectUrl = URL.createObjectURL(blob);
            
            const img = document.getElementById('result-image');
            img.classList.remove('loaded'); img.src = objectUrl;
            img.onload = () => {
                img.classList.add('loaded'); stopFireflies();
                document.getElementById('firefly-canvas').classList.remove('active');
                document.getElementById('placeholder').style.display = 'none';
                
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
                document.getElementById('btn-save-ui').style.display = 'block';
                btn.innerText = "Generate Wallpaper"; btn.disabled = false; state.isGenerating = false;
            };
        } catch (fetchErr) {
            throw new Error("Image load failed. If your prompt is very complex, try simplifying it. (" + fetchErr.message + ")");
        }
    } catch(e) { alert("Error: " + e.message); const btn = document.getElementById('btn-gen-ui'); if (btn) { btn.disabled = false; btn.innerText = "✨ AI Discover"; } state.isGenerating = false; stopFireflies(); document.getElementById('firefly-canvas').classList.remove('active'); }
}

function buildPrompt(env, poi, theme) {
    const isDay = env.is_day;
    let p = isDay ? state.settings.promptDay : state.settings.promptNight;
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
    for (const [k, v] of Object.entries(vars)) {
        p = p.split(k).join(v || "");
    }
    if (state.settings.quality === 'high') p += ", 8k resolution, masterpiece";
    if (state.settings.quality === 'hd') p += ", 16k resolution, cinematic lighting";
    return p;
}

let animId;
function startFireflies() {
    const canvas = document.getElementById('firefly-canvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.clientWidth; canvas.height = canvas.parentElement.clientHeight;
    const particles = Array.from({length: 40}, () => ({
        x: Math.random() * canvas.width, y: Math.random() * canvas.height,
        size: Math.random() * 2 + 1, speed: Math.random() * 0.8 + 0.2, phase: Math.random() * 10
    }));
    function loop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.y -= p.speed; if (p.y < 0) p.y = canvas.height;
            ctx.globalAlpha = Math.pow((Math.sin(Date.now()/300 + p.phase) + 1)/2, 8);
            ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
        });
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
    const now = new Date();
    const ord = (now.getMonth() + 1) * 100 + now.getDate();
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
    const name = document.getElementById('new-profile-name').value;
    if (!name) return alert("Enter a name");
    state.settings.profiles.push({ name, ...state.settings });
    renderProfiles(); save(); document.getElementById('new-profile-name').value = "";
}
function loadProfile(i) { state.settings = { ...state.settings, ...JSON.parse(JSON.stringify(state.settings.profiles[i])) }; setupUI(); renderThemes(); renderPOISelectors(); renderStyles(); alert("Loaded Profile: " + state.settings.name); }
function deleteProfile(i) { state.settings.profiles.splice(i, 1); renderProfiles(); save(); }
function resetApp() { if(confirm("Wipe everything?")) { localStorage.removeItem('lumina_v1.9.7'); location.reload(); } }
function resetPrompts() { if(confirm("Reset templates?")) { state.settings.promptDay = DEFAULT_DAY_STR; state.settings.promptNight = DEFAULT_NIGHT_STR; state.settings.promptPOIDomestic = DEFAULT_POI_DOMESTIC_STR; state.settings.promptPOIIntl = DEFAULT_POI_INTL_STR; loadEditorPrompt(); save(); } }
</script>
</body>
</html>
`;

function workerSanitize(input) {
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

export default {
    async fetch(request, env, ctx) {
        try {
            const url = new URL(request.url);
            if (url.pathname === "/") return new Response(HTML_CONTENT, { headers: { "Content-Type": "text/html" } });

            if (url.pathname === "/api/proxy/weather") {
                const lat = url.searchParams.get("lat") || 45.52; const lon = url.searchParams.get("lon") || -122.67;
                const weatherUrl = "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon + "&current=temperature_2m,weather_code,is_day,visibility,cloud_cover,wind_speed_10m&daily=uv_index_max&timezone=auto";
                const res = await fetch(weatherUrl);
                const d = await res.json();
                const dateStr = new Date().toISOString().split('T')[0];
                const utcOffsetSeconds = d.utc_offset_seconds || 0;
                const tzParam = (utcOffsetSeconds % 3600 === 0) ? (utcOffsetSeconds / 3600).toString() : (utcOffsetSeconds / 3600).toFixed(1);
                const usnoUrl = "https://aa.usno.navy.mil/api/rstt/oneday?date=" + dateStr + "&coords=" + lat + "," + lon + "&tz=" + tzParam;
                const usnoRes = await fetch(usnoUrl);
                let astro = { sunrise: "6:00 AM", sunset: "18:00 PM", moon: "Visible", moonrise: "N/A", moonset: "N/A", moon_illumination: 0 };
                try {
                    const u = await usnoRes.json();
                    const data = u.properties.data;
                    astro.moon = data.curphase || "Visible";
                    astro.moon_illumination = parseInt((data.fracillum || "0").replace("%", "")) || 0;
                    if (data.sundata) data.sundata.forEach(s => { if(s.phen=="Rise") astro.sunrise=s.time; if(s.phen=="Set") astro.sunset=s.time; });
                    if (data.moondata) data.moondata.forEach(m => { if(m.phen=="Rise") astro.moonrise=m.time; if(m.phen=="Set") astro.moonset=m.time; });
                } catch(e) {}
                return new Response(JSON.stringify({ 
                    weather_desc: WMO_MAP[d.current.weather_code] || "Variable", 
                    temp: Math.round(d.current.temperature_2m * 9/5 + 32), 
                    is_day: d.current.is_day === 1,
                    uv_index: d.daily.uv_index_max[0],
                    visibility: (d.current.visibility / 1609).toFixed(1) + "mi",
                    cloud_cover: d.current.cloud_cover + "%",
                    wind_speed: d.current.wind_speed_10m + "mph",
                    sunrise: astro.sunrise, sunset: astro.sunset, moon_phase: astro.moon,
                    moonrise: astro.moonrise, moonset: astro.moonset, moon_illumination: astro.moon_illumination
                }), { headers: { "Content-Type": "application/json" } });
            }

            if (url.pathname === "/api/proxy/poi") {
                let promptStr = "";
                let model = "gemini-search";
                if (request.method === "POST") {
                    try {
                        const body = await request.json();
                        promptStr = body.prompt || "";
                        model = body.model || "gemini-search";
                    } catch(e) {}
                } else {
                    const city = url.searchParams.get("city");
                    promptStr = `Name one famous landmark in ${city}. Output JSON: {"name": "Name", "description": "Short 1 sentence description"}`;
                }

                const payload = {
                    messages: [
                        { role: "system", content: "Output JSON only. Do not wrap in markdown blocks." },
                        { role: "user", content: promptStr }
                    ],
                    model: model,
                    jsonMode: true
                };
                
                const res = await fetch("https://text.pollinations.ai/", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                const t = await res.text();
                const clean = t.split("```json").join("").split("```").join("").trim();
                return new Response(clean, { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
            }

            if (url.pathname === "/api/proxy/consult") {
                const name = url.searchParams.get("name"); const city = url.searchParams.get("city"); const key = url.searchParams.get("key");
                const promptStr = "Provide a concise 1-2 sentence visual description of the landmark '" + name + "' in " + city + ". No other text.";
                const apiUrl = "https://gen.pollinations.ai/text/" + encodeURIComponent(promptStr) + "?model=gemini-search" + (key ? "&key="+key : "");
                const res = await fetch(apiUrl);
                const t = await res.text(); return new Response(JSON.stringify({ description: t.trim() }), { headers: { "Content-Type": "application/json" } });
            }

            if (url.pathname === "/api/proxy/nominatim") {
                const lat = url.searchParams.get("lat"); const lon = url.searchParams.get("lon");
                const apiUrl = "https://nominatim.openstreetmap.org/reverse?format=json&lat=" + lat + "&lon=" + lon;
                const res = await fetch(apiUrl, { headers: {"User-Agent": "LuminaAeris/1.0"} });
                return new Response(JSON.stringify(await res.json()), { headers: { "Content-Type": "application/json" } });
            }

            if (url.pathname === "/api/context") {
                const lat = url.searchParams.get("lat") || 45.52; const lon = url.searchParams.get("lon") || -122.67;
                const city = url.searchParams.get("city") || "Unknown"; const key = url.searchParams.get("key") || ""; const model = url.searchParams.get("model") || "gptimage";
                const weatherRes = await fetch("https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon + "&current=temperature_2m,weather_code,is_day,visibility,cloud_cover,wind_speed_10m&daily=uv_index_max&timezone=auto");
                const d = await weatherRes.json();
                const dateStr = new Date().toISOString().split('T')[0];
                const utcOffsetSeconds = d.utc_offset_seconds || 0;
                const tzParam = (utcOffsetSeconds % 3600 === 0) ? (utcOffsetSeconds / 3600).toString() : (utcOffsetSeconds / 3600).toFixed(1);
                const usnoRes = await fetch("https://aa.usno.navy.mil/api/rstt/oneday?date=" + dateStr + "&coords=" + lat + "," + lon + "&tz=" + tzParam);
                let astro = { sunrise: "6:00 AM", sunset: "18:00 PM", moon: "Visible", moonrise: "N/A", moonset: "N/A", moon_illumination: 0 };
                try {
                    const u = await usnoRes.json();
                    const data = u.properties.data;
                    astro.moon = data.curphase || "Visible";
                    astro.moon_illumination = parseInt((data.fracillum || "0").replace("%", "")) || 0;
                    if (data.sundata) data.sundata.forEach(s => { if(s.phen=="Rise") astro.sunrise=s.time; if(s.phen=="Set") astro.sunset=s.time; });
                    if (data.moondata) data.moondata.forEach(m => { if(m.phen=="Rise") astro.moonrise=m.time; if(m.phen=="Set") astro.moonset=m.time; });
                } catch(e) {}
                const poiRes = await fetch("https://gen.pollinations.ai/text/" + encodeURIComponent("One famous landmark in " + city + ". Output JSON: {\"name\":\"...\",\"description\":\"...\"}") + "?model=gemini-search&system=Output%20JSON%20only" + (key ? "&key="+key : ""));
                let poi = { name: city, description: "A beautiful view" };
                try { 
                    const poiText = await poiRes.text();
                    const cleanPoi = poiText.split("```json").join("").split("```").join("").trim();
                    poi = JSON.parse(cleanPoi); 
                } catch(e) {}
                const isDay = d.current.is_day === 1;
                const vars = {
                    "{poi_name}": poi.name, "{poi_desc}": poi.description || "",
                    "{city}": city, "{state_region}": "", "{country}": "",
                    "{time_of_day}": isDay ? "Daytime" : "Nighttime", "{datetime}": new Date().toLocaleString(),
                    "{weather}": WMO_MAP[d.current.weather_code] || "Clear", "{temperature}": Math.round(d.current.temperature_2m * 9/5 + 32) + "°F", "{theme}": "General",
                    "{sunrise}": astro.sunrise, "{sunset}": astro.sunset,
                    "{uv_index}": d.daily.uv_index_max[0], "{visibility}": (d.current.visibility / 1609).toFixed(1) + "mi",
                    "{cloud_cover}": d.current.cloud_cover + "%", "{wind_speed}": d.current.wind_speed_10m + "mph",
                    "{moon_phase}": astro.moon, "{moon_illumination}": astro.moon_illumination + " percent",
                    "{moonrise}": astro.moonrise, "{moonset}": astro.moonset, "{style}": "Hyper Realistic"
                };
                let p = d.current.is_day === 1 ? SHARED_DEFAULT_DAY : SHARED_DEFAULT_NIGHT;
                for (const [k, v] of Object.entries(vars)) { p = p.split(k).join(v || ""); }
                const cleanP = workerSanitize(p) || "Beautiful cinematic wallpaper of " + poi.name;
                const finalImgUrl = "https://gen.pollinations.ai/image/" + encodeURIComponent(cleanP) + "?model=" + model + "&width=1290&height=2796&nologo=true" + (key ? "&key="+key : "");
                return new Response(JSON.stringify({ imageUrl: finalImgUrl, poiLabel: poi.name, prompt: cleanP }), { headers: { "Content-Type": "application/json" } });
            }
            return new Response("Not Found", { status: 404 });
        } catch (err) {
            return new Response(err.message + "\n" + err.stack, { status: 500, headers: { "Content-Type": "text/plain" } });
        }
    }
};