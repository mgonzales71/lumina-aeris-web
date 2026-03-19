// Lumina Aeris Web & Worker - API Logic v1.19.2

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
    } catch(e) { console.error("Error fetching image models:", e); }
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
    } catch(e) { console.error("Error fetching text models:", e); }
}

function requestLocation() {
    if (!navigator.geolocation || state.settings.locMode === 'custom') return;
    navigator.geolocation.getCurrentPosition(pos => {
        state.lat = pos.coords.latitude; state.lon = pos.coords.longitude;
        fetch("/api/proxy/nominatim?lat=" + state.lat + "&lon=" + state.lon).then(r => r.json()).then(data => {
            state.city = data.address.city || data.address.town || data.address.village || "Unknown";
            state.state = data.address.state || ""; state.country = data.address.country || "";
            const coordText = document.getElementById('coord-text');
            if (coordText) coordText.innerText = `GPS: ${state.city}`;
            renderPOISelectors(); applyAppearance();
        });
    });
}

async function discoverPOIs(btn) {
    const city = state.city;
    const stateVal = state.state || "requested location";
    
    // expert prompt v1.19.2
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

async function consultPOI(city, i, e) {
    const p = state.settings.poiCache[city][i];
    const btn = e ? e.currentTarget : null;    if(btn) { btn.disabled = true; btn.innerText = "..."; } 
    try { 
        const res = await fetch("/api/proxy/consult?name=" + encodeURIComponent(p.name) + "&city=" + encodeURIComponent(city) + (state.settings.apiKey ? "&key="+state.settings.apiKey : "")); 
        const data = await res.json(); p.description = data.description; 
        isDirty = true; updateSyncUI(); renderPOIs(); save();
    } finally { if(btn) { btn.disabled = false; btn.innerText = "Consult"; } } 
}

async function autofillLocation() {
    const city = document.getElementById('modal-loc-city').value; 
    const stateVal = document.getElementById('modal-loc-state').value; 
    if (!city) return alert("Enter city");
    const btn = document.getElementById('btn-loc-autofill'); btn.disabled = true; btn.innerText = "...";
    try { 
        const res = await fetch("/api/proxy/nominatim?q=" + encodeURIComponent(city + (stateVal ? ", " + stateVal : ""))); 
        const data = await res.json(); 
        if (data && data.length > 0) { 
            const top = data[0]; 
            document.getElementById('modal-loc-lat').value = parseFloat(top.lat).toFixed(4); 
            document.getElementById('modal-loc-lon').value = parseFloat(top.lon).toFixed(4); 
        } 
    } catch(e) { alert("Error"); } finally { btn.disabled = false; btn.innerText = "✨ AI Autofill"; }
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

async function deleteRemoteProfile(name) { if (name === 'default') return alert("Cannot delete default profile"); if (!confirm(`Delete cloud profile '${name}'?`)) return; try { await fetch(`/api/config?profile=${encodeURIComponent(name)}&secret=${encodeURIComponent(state.settings.syncSecret)}`, { method: 'DELETE' }); await refreshRemoteProfiles(); } catch(e) {} }
async function createRemoteProfile() { const name = prompt("New Cloud Profile Name:"); if (!name) return; state.currentProfile = name; isDirty = true; updateSyncUI(); await save(); }
async function purgeCloudData() { if (!state.settings.syncSecret) return alert("Sync Secret required."); const pin = prompt("Enter Maintenance PIN:"); if (!pin) return; try { const res = await fetch(`/api/maintenance/purge?secret=${encodeURIComponent(state.settings.syncSecret)}&pin=${encodeURIComponent(pin)}`); const data = await res.json(); alert(data.success ? "Purge Successful!" : "Purge Failed."); } catch(e) { alert("Error."); } }

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
