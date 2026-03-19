// Lumina Aeris Web & Worker - Utility Logic v1.19.6

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

function browserSanitize(input) { return input.toString().replace(/[\n\r]/g, " ").replace(/%/g, " percent").replace(/[&#?\/"]/g, "").trim(); }
function getThemeForDate() {
    const now = new Date(); const ord = (now.getMonth() + 1) * 100 + now.getDate();
    const match = state.settings.themes.find(t => ord >= t.Begin && ord <= t.End);
    return match ? match.Theme : "General";
}

function resetApp() { if(confirm("Wipe everything?")) { localStorage.clear(); location.reload(); } }

function save() { 
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings));
    if (state.settings.syncSecret) {
        try {
            const profile = state.currentProfile || "default";
            fetch(`/api/config?profile=${encodeURIComponent(profile)}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-Lumina-Secret": state.settings.syncSecret },
                body: JSON.stringify(state.settings)
            });
        } catch(e) { console.error("Cloud sync failed in save():", e); }
    }
}

function resetPrompts() { if(confirm("Reset templates?")) { state.settings.promptDay = DEFAULT_DAY_STR; state.settings.promptNight = DEFAULT_NIGHT_STR; state.settings.promptDayIntl = DEFAULT_DAY_INTL_STR; state.settings.promptNightIntl = DEFAULT_NIGHT_INTL_STR; state.settings.promptPOIDomestic = DEFAULT_POI_DISCOVERY_PROMPT; state.settings.promptPOIIntl = DEFAULT_POI_DISCOVERY_PROMPT; loadEditorPrompt(); isDirty = true; updateSyncUI(); save(); } }
function openFullRes() { const src = document.getElementById('result-image').src; if (src && !src.includes('placeholder')) window.open(src, '_blank'); }
