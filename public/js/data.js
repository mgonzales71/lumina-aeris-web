// Lumina Aeris Web & Worker - Data Logic v1.19.2

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

        // --- STABLE HEALING LOGIC (v1.19.2) ---
        let cleaned = jsonStr
            .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"') 
            .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'") 
            .replace(/[\u200B-\u200D\uFEFF]/g, "") 
            .replace(/,\s*([\]}])/g, '$1') 
            .replace(/\/\/.*$/gm, "") 
            .replace(/\/\*[\s\S]*?\*\//g, "")
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

function deleteLocation(i) { 
    state.settings.locations.splice(i, 1); 
    isDirty = true; updateSyncUI(); renderLocations(); save();
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

function renderProfiles() { 
    const list = document.getElementById('profile-list'); if(!list) return; list.innerHTML = ""; 
    state.settings.profiles.forEach((p, i) => { 
        const row = document.createElement('div'); row.className = 'list-item'; 
        row.innerHTML = `<div><div class="list-item-title">${p.name}</div><div class="list-item-sub">Local</div></div><div><button onclick="loadProfile(${i})" style="color:var(--accent-color); background:none; border:none; margin-right:10px;">Load</button><button onclick="deleteProfile(${i})" style="color:#ff3b30; background:none; border:none;">Del</button></div>`; list.appendChild(row); 
    }); 
}

function renderRemoteProfileList() { 
    const list = document.getElementById('remote-profile-list'); if(!list) return; list.innerHTML = ""; 
    state.remoteProfiles.forEach(name => { 
        const row = document.createElement('div'); row.className = 'list-item'; 
        const active = (name === state.currentProfile) ? " (Active)" : ""; 
        row.innerHTML = `<div><div class="list-item-title">${name}${active}</div><div class="list-item-sub">Cloud</div></div><div><button onclick="switchRemoteProfile('${name}')" style="color:var(--accent-color); background:none; border:none; margin-right:10px;">Switch</button><button onclick="deleteRemoteProfile('${name}')" style="color:#ff3b30; background:none; border:none;">Del</button></div>`; list.appendChild(row); 
    }); 
}

function saveProfile() { const name = prompt("Profile Name:"); if (!name) return; state.settings.profiles.push({ name, ...state.settings }); isDirty = true; updateSyncUI(); renderProfiles(); save(); }
function loadProfile(i) { if (!state.settings.profiles[i]) return; state.settings = { ...state.settings, ...JSON.parse(JSON.stringify(state.settings.profiles[i])) }; isDirty = true; updateSyncUI(); setupUI(); applyAppearance(); alert("Profile Loaded!"); }
function deleteProfile(i) { state.settings.profiles.splice(i, 1); isDirty = true; updateSyncUI(); renderProfiles(); save(); }
function clearCategory(t) { state.settings[t] = []; isDirty = true; updateSyncUI(); save(); location.reload(); }; 
