// Lumina Aeris Web & Worker - UI Logic v1.19.6

function setupUI() {
    loadEditorPrompt();
    const badge = document.getElementById('profile-badge');
    if (badge) {
        badge.innerText = "PROFILE: " + (state.currentProfile || "DEFAULT").toUpperCase();
        badge.style.color = (state.currentProfile && state.currentProfile !== 'default') ? "var(--accent-color)" : "var(--sub-text)";
    }
    document.getElementById('set-appearance').value = state.settings.appearance || 'auto';
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
    toggleCustomLoc(); toggleCustomRes(); renderTokens();
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

function saveEditorPrompt() {
    const mode = document.getElementById('prompt-mode').value;
    const val = document.getElementById('prompt-editor').value;
    if (mode === 'day') state.settings.promptDay = val;
    else if (mode === 'night') state.settings.promptNight = val;
    else if (mode === 'dayintl') state.settings.promptDayIntl = val;
    else if (mode === 'nightintl') state.settings.promptNightIntl = val;
    else if (mode === 'poidomestic') state.settings.promptPOIDomestic = val;
    else if (mode === 'poiintl') state.settings.promptPOIIntl = val;
    isDirty = true; updateSyncUI();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings)); 
}

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
    const oldS = state.settings.syncSecret;
    const newS = document.getElementById('set-sync-secret').value;
    state.settings.syncSecret = newS;
    state.settings.locMode = document.getElementById('set-loc-mode').value;
    state.settings.transparent = document.getElementById('set-transparent').checked;
    state.settings.safe = document.getElementById('set-safe').checked;
    state.settings.enhance = document.getElementById('set-enhance').checked;
    state.settings.seedEnable = document.getElementById('set-seed-enable').checked;
    state.settings.seed = parseInt(document.getElementById('set-seed').value);
    state.settings.negEnable = document.getElementById('set-neg-enable').checked;
    state.settings.negativePrompt = document.getElementById('set-neg').value;
    
    if (newS && newS !== oldS) {
        await refreshRemoteProfiles();
        await switchRemoteProfile('default');
    }
    
    save(); // Call the unified save function

    isDirty = true; updateSyncUI();
    await applyAppearance();
}

function toggleCustomRes() {
    const isCustom = document.getElementById('set-res').value === 'custom';
    const row = document.getElementById('row-custom-res');
    if (row) row.style.display = isCustom ? 'flex' : 'none';
}

function toggleCustomLoc() {
    const isCustom = document.getElementById('set-loc-mode').value === 'custom';
    const row = document.getElementById('row-custom-list');
    if (row) row.style.display = isCustom ? 'flex' : 'none';
    if (isCustom) renderCustomLocList();
}

function renderCustomLocList() {
    const sel = document.getElementById('set-custom-loc'); if (!sel) return;
    sel.innerHTML = '<option value="">Choose...</option>';
    state.settings.locations.forEach((loc, i) => {
        const opt = document.createElement('option'); opt.value = i; opt.innerText = loc.city + (loc.state ? ", " + loc.state : ""); sel.appendChild(opt);
    });
    if (state.settings.customLocIdx !== undefined) sel.value = state.settings.customLocIdx;
}

function applySavedLoc(i) {
    if (i === undefined) i = parseInt(document.getElementById('set-custom-loc').value);
    const loc = state.settings.locations[i]; if(!loc) return;
    state.lat = loc.lat; state.lon = loc.lon; state.city = loc.city; state.state = loc.state || ""; state.country = loc.country || "USA";
    state.settings.customLocIdx = i;
    document.getElementById('coord-text').innerText = "Saved: " + state.city;
    renderPOISelectors(); applyAppearance();
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
