// Lumina Aeris Web & Worker - App Logic v1.19.5
// Mandate: NO Truncation. NO Minification. NO Missing Logic.

// --- 1. GLOBALS & DEFAULT CONSTANTS ---
const STORAGE_KEY = 'lumina_v1.19.5';
const DEFAULT_DAY_STR = "Generate a {style} style image of {poi_name} in {city}, {state_region}. POI description: {poi_desc}. Ensure architectural and geographical accuracy based on real-world references. Time: {time_of_day} {datetime}. Weather: {weather}, {temperature}. Sun at {sunrise} and {sunset} for realistic positioning. Adjust sun visibility based on {weather}. Include the UV index and visibility in the depiction. Account for cloud cover to influence lighting and shadows. Safe Zone Framing: keep significant elements centered and critical content within 80-90 percent of the image width and height. Atmosphere: incorporate the theme of {theme} as a subtle, realistic element. Apply a professional, natural-looking auto-enhancement: brighten shadows, recover highlights, boost midtone contrast, and enhance clarity while preserving a photorealistic look.";
const DEFAULT_NIGHT_STR = "Generate a {style} style image of {poi_name} in {city}, {state_region}. POI description: {poi_desc}. Ensure architectural and geographical accuracy based on real-world references. Time: {time_of_day} {datetime}. Weather: {weather}, {temperature}. Moon in {moon_phase} with {moon_illumination} illumination. Account for moonrise {moonrise} and moonset {moonset} for realistic positioning. Adjust moon visibility based on {weather}. Safe Zone Framing: keep significant elements centered and critical content within 80-90 percent of the image width and height. Atmosphere: incorporate the theme of {theme} as a subtle, realistic element. Apply a professional, natural-looking auto-enhancement: brighten shadows, recover highlights, boost midtone contrast, and enhance clarity while preserving a photorealistic look.";

// International Default Prompts
const DEFAULT_DAY_INTL_STR = "Generate a {style} style image of {poi_name} in {city}, {country}. POI description: {poi_desc}. Ensure architectural and geographical accuracy based on real-world references. Time: {time_of_day} {datetime}. Weather: {weather}, {temperature}. Sun at {sunrise} and {sunset} for realistic positioning. Adjust sun visibility based on {weather}. Include the UV index and visibility in the depiction. Account for cloud cover to influence lighting and shadows. Safe Zone Framing: keep significant elements centered and critical content within 80-90 percent of the image width and height. Atmosphere: incorporate the theme of {theme} as a subtle, realistic element. Apply a professional, natural-looking auto-enhancement: brighten shadows, recover highlights, boost midtone contrast, and enhance clarity while preserving a photorealistic look.";
const DEFAULT_NIGHT_INTL_STR = "Generate a {style} style image of {poi_name} in {city}, {country}. POI description: {poi_desc}. Ensure architectural and geographical accuracy based on real-world references. Time: {time_of_day} {datetime}. Weather: {weather}, {temperature}. Moon in {moon_phase} with {moon_illumination} illumination. Account for moonrise {moonrise} and moonset {moonset} for realistic positioning. Adjust moon visibility based on {weather}. Safe Zone Framing: keep significant elements centered and critical content within 80-90 percent of the image width and height. Atmosphere: incorporate the theme of {theme} as a subtle, realistic element. Apply a professional, natural-looking auto-enhancement: brighten shadows, recover highlights, boost midtone contrast, and enhance clarity while preserving a photorealistic look.";

// Expert POI Discovery Prompt
const DEFAULT_POI_DISCOVERY_PROMPT = "You are an expert on points of interest and other unique and notable places of things views or vistas of requested locations. Do not cite sources or any additional information beyond returning one item per line with no formatting. Task: Generate a list of up to 30 visually unique points of interest, landmarks, or vistas in or nearby the city of {city} in the state of {state}. Format Rules: 1. Output ONLY a raw JSON array of objects. 2. Do NOT include markdown code blocks (no backticks). 3. Do NOT include any introductory or concluding text. 4. Each object must have exactly two keys: \"name\" and \"description\". 5. \"description\" must be 1-2, concise sentences that visually describes the named point of interest.";

const TOKENS_LIST = ["{style}", "{poi_name}", "{poi_desc}", "{city}", "{state_region}", "{country}", "{time_of_day}", "{datetime}", "{weather}", "{temperature}", "{theme}", "{moon_phase}", "{moon_illumination}", "{moonrise}", "{moonset}", "{sunrise}", "{sunset}", "{uv_index}", "{visibility}", "{cloud_cover}", "{wind_speed}"];
const DEFAULT_STYLES = ["Hyper photo realistic", "Cinematic photography", "Watercolor painting", "Oil painting", "Pencil sketch", "Crayon drawing", "Claymation", "3D animation render", "Pixar-style 3D illustration", "Flat vector illustration", "Paper craft collage", "Ukiyo-e woodblock print", "Impressionist painting", "Pixel art", "Neon noir", "Vintage film photograph", "Comic book art", "Stained glass illustration"];

var state = {
    currentTab: 'home', isGenerating: false,
    lat: 45.52, lon: -122.67, city: "Portland", state: "Oregon", country: "USA",
    importType: '', currentProfile: 'default', remoteProfiles: [],
    settings: {
        appearance: 'auto',
        promptDay: DEFAULT_DAY_STR, promptNight: DEFAULT_NIGHT_STR,
        promptDayIntl: DEFAULT_DAY_INTL_STR, promptNightIntl: DEFAULT_NIGHT_INTL_STR, // Added international prompts
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
        try {
            const parsed = JSON.parse(saved);
            // Manually merge to preserve array types for collections
            state.settings = { ...state.settings, ...parsed }; // Shallow merge for scalar values
            
            // Ensure collections are arrays and merge contents if necessary
            if (parsed.themes && Array.isArray(parsed.themes)) state.settings.themes = parsed.themes;
            if (parsed.styles && Array.isArray(parsed.styles)) state.settings.styles = parsed.styles;
            if (parsed.locations && Array.isArray(parsed.locations)) state.settings.locations = parsed.locations;
            
            // poiCache is an object of arrays, so handle deep merge
            if (parsed.poiCache) {
                for (const city in parsed.poiCache) {
                    if (Array.isArray(parsed.poiCache[city])) {
                        if (!state.settings.poiCache[city]) state.settings.poiCache[city] = [];
                        state.settings.poiCache[city] = [...parsed.poiCache[city]];
                    }
                }
            }
            // profiles is an array of objects which can also contain settings
            if (parsed.profiles && Array.isArray(parsed.profiles)) state.settings.profiles = parsed.profiles;

        } catch(e) { console.error("Error loading saved settings:", e); }
    } else {
        const oldKeys = ['lumina_v1.19.1', 'lumina_v1.19.0', 'lumina_v1.18.1', 'lumina_v1.16.4', 'lumina_v1.16.2', 'lumina_v1.15.3'];
        for (const k of oldKeys) {
            const old = localStorage.getItem(k);
            if (old) { try { Object.assign(state.settings, JSON.parse(old)); save(); break; } catch(e) { console.error("Error loading old saved settings:", e); } }
        }
    }
    
    await applyAppearance();

    if (state.settings.syncSecret) {
        await refreshRemoteProfiles();
        await switchRemoteProfile(state.currentProfile || 'default');
    }
    
    await fetchModels();
    setupUI(); 
    renderThemes(); 
    renderPOISelectors(); 
    renderProfiles(); 
    renderStyles(); 
    renderLocations(); 
    updateSyncUI();
    
    if (state.settings.locMode === 'gps') requestLocation();
    else if (state.settings.locMode === 'custom') applySavedLoc(state.settings.customLocIdx || 0);
};

function loadEditorPrompt() {
    const mode = document.getElementById('prompt-mode').value;
    const editor = document.getElementById('prompt-editor');
    const tokensContainer = document.getElementById('token-chips');
    let currentPrompt = '';

    const promptMap = {
        'day': state.settings.promptDay,
        'night': state.settings.promptNight,
        'dayintl': state.settings.promptDayIntl, // Added international daytime
        'nightintl': state.settings.promptNightIntl, // Added international nighttime
        'poidomestic': state.settings.promptPOIDomestic,
        'poiintl': state.settings.promptPOIIntl,
    };

    currentPrompt = promptMap[mode] || '';
    editor.value = currentPrompt;

    // Update tokens list based on mode
    let relevantTokens = [...TOKENS_LIST];
    if (mode.startsWith('poi')) {
        relevantTokens = relevantTokens.filter(token => 
            ['{city}', '{state_region}', '{country}', '{poi_name}', '{poi_desc}', '{style}'].includes(token) || token === '{theme}' // Keep theme as it's general
        );
        if (mode === 'poiintl') {
            relevantTokens = relevantTokens.filter(token => token !== '{state_region}'); // Remove state_region for international POI
        }
    }
    
    tokensContainer.innerHTML = '';
    relevantTokens.forEach(token => {
        const span = document.createElement('span');
        span.className = 'token-chip';
        span.textContent = token;
        span.onclick = () => editor.value += token;
        tokensContainer.appendChild(span);
    });
}

// --- 4. GLOBAL EXPORTS ---
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
window.clearCategory = (t) => { state.settings[t] = []; isDirty = true; updateSyncUI(); save(); location.reload(); }; 
window.openPOIModal = openPOIModal; 
window.closePOIModal = closePOIModal; 
window.savePOIModal = savePOIModal; 
window.sanitizePOIModal = sanitizePOIModal; 
window.deletePOI = deletePOI; 
window.discoverPOIs = discoverPOIs; 
window.consultPOI = consultPOI;
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