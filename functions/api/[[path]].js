// Lumina Aeris Web Backend - Functions v1.10.4
// Mandate: NO Truncation. NO Minification. NO Missing Logic.

const WMO_MAP = { 0: "Clear", 1: "Mainly Clear", 2: "Partly Cloudy", 3: "Overcast", 45: "Fog", 61: "Rain", 71: "Snow", 95: "Thunderstorm" };

const SHARED_DEFAULT_DAY = "Generate a {style} style image of {poi_name} in {city}, {state_region}. POI description: {poi_desc}. Ensure architectural and geographical accuracy based on real-world references. Time: {time_of_day} {datetime}. Weather: {weather}, {temperature}. Sun at {sunrise} and {sunset} for realistic positioning. Adjust sun visibility based on {weather}. Include the UV index and visibility in the depiction. Account for cloud cover to influence lighting and shadows. Safe Zone Framing: keep significant elements centered and critical content within 80-90 percent of the image width and height. Atmosphere: incorporate the theme of {theme} as a subtle, realistic element. Apply a professional, natural-looking auto-enhancement: brighten shadows, recover highlights, boost midtone contrast, and enhance clarity while preserving a photorealistic look.";
const SHARED_DEFAULT_NIGHT = "Generate a {style} style image of {poi_name} in {city}, {state_region}. POI description: {poi_desc}. Ensure architectural and geographical accuracy based on real-world references. Time: {time_of_day} {datetime}. Weather: {weather}, {temperature}. Moon in {moon_phase} with {moon_illumination} illumination. Account for moonrise {moonrise} and moonset {moonset} for realistic positioning. Adjust moon visibility based on {weather}. Safe Zone Framing: keep significant elements centered and critical content within 80-90 percent of the image width and height. Atmosphere: incorporate the theme of {theme} as a subtle, realistic element. Apply a professional, natural-looking auto-enhancement: brighten shadows, recover highlights, boost midtone contrast, and enhance clarity while preserving a photorealistic look.";

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

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname;

    const SECRET_KEY = env.SECRET_KEY || 'your_secret_key_here'; 

    try {
        // --- 1. Weather Proxy ---
        if (path === "/api/proxy/weather") {
            const lat = url.searchParams.get("lat") || 45.52;
            const lon = url.searchParams.get("lon") || -122.67;
            const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day,visibility,cloud_cover,wind_speed_10m&daily=uv_index_max&timezone=auto`;
            const res = await fetch(weatherUrl);
            const d = await res.json();
            const dateStr = new Date().toISOString().split('T')[0];
            const utcOffsetSeconds = d.utc_offset_seconds || 0;
            const tzParam = (utcOffsetSeconds % 3600 === 0) ? (utcOffsetSeconds / 3600).toString() : (utcOffsetSeconds / 3600).toFixed(1);
            const usnoUrl = `https://aa.usno.navy.mil/api/rstt/oneday?date=${dateStr}&coords=${lat},${lon}&tz=${tzParam}`;
            const usnoRes = await fetch(usnoUrl);
            let astro = { sunrise: "6:00 AM", sunset: "18:00 PM", moon: "Visible", moonrise: "N/A", moonset: "N/A", moon_illumination: 0 };
            try {
                const u = await usnoRes.json();
                const data = u.properties.data;
                astro.moon = data.curphase || "Visible";
                astro.moon_illumination = parseInt((data.fracillum || "0").replace("%", "")) || 0;
                if (data.sundata) data.sundata.forEach(s => { if(s.phen === "Rise") astro.sunrise = s.time; if(s.phen === "Set") astro.sunset = s.time; });
                if (data.moondata) data.moondata.forEach(m => { if(m.phen === "Rise") astro.moonrise = m.time; if(m.phen === "Set") astro.moonset = m.time; });
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

        // --- 2. POI Discovery Proxy ---
        if (path === "/api/proxy/poi") {
            const city = url.searchParams.get("city");
            const key = url.searchParams.get("key");
            const promptStr = `Name one famous landmark in ${city}. Output JSON: {"name": "Name", "description": "Short 1 sentence description"}`;
            const apiUrl = `https://gen.pollinations.ai/text/${encodeURIComponent(promptStr)}?model=openai&system=Output%20JSON%20only${key ? "&key="+key : ""}`;
            const res = await fetch(apiUrl);
            const t = await res.text();
            const clean = t.split("```json").join("").split("```").join("").trim();
            return new Response(clean, { headers: { "Content-Type": "application/json" } });
        }

        // --- 3. POI Consult/Sanitize Proxy ---
        if (path === "/api/proxy/consult") {
            const name = url.searchParams.get("name");
            const city = url.searchParams.get("city");
            const key = url.searchParams.get("key");
            const promptStr = `Provide a concise 1-2 sentence visual description of the landmark '${name}' in ${city}. No other text.`;
            const apiUrl = `https://gen.pollinations.ai/text/${encodeURIComponent(promptStr)}?model=openai${key ? "&key="+key : ""}`;
            const res = await fetch(apiUrl);
            const t = await res.text();
            return new Response(JSON.stringify({ description: t.trim() }), { headers: { "Content-Type": "application/json" } });
        }

        // --- NEW: Sanitize Proxy ---
        if (path === "/api/proxy/sanitize") {
            const name = url.searchParams.get("name") || "";
            const desc = url.searchParams.get("description") || "";
            const city = url.searchParams.get("city") || "";
            const key = url.searchParams.get("key");
            const promptStr = `Refine this landmark info for an AI image generator. Landmark: "${name}", Description: "${desc}", Location: "${city}". Fix spelling, remove conversational filler, and make it visually evocative. Output ONLY raw JSON: {"name": "Refined Name", "description": "Refined 1-sentence visual description"}`;
            const apiUrl = `https://gen.pollinations.ai/text/${encodeURIComponent(promptStr)}?model=openai&system=Output%20JSON%20only${key ? "&key="+key : ""}`;
            const res = await fetch(apiUrl);
            const t = await res.text();
            const clean = t.split("```json").join("").split("```").join("").trim();
            return new Response(clean, { headers: { "Content-Type": "application/json" } });
        }

        // --- 4. Reverse Geocode Proxy ---
        if (path === "/api/proxy/nominatim") {
            const lat = url.searchParams.get("lat");
            const lon = url.searchParams.get("lon");
            const q = url.searchParams.get("q");
            let apiUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
            if (q) apiUrl = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
            const res = await fetch(apiUrl, { headers: { "User-Agent": "LuminaAeris/1.0" } });
            return new Response(JSON.stringify(await res.json()), { headers: { "Content-Type": "application/json" } });
        }

        // --- 5. Shortcut Context API ---
        if (path === "/api/context") {
            const secret = url.searchParams.get("secret");
            if (secret !== SECRET_KEY) return new Response("Unauthorized", { status: 401 });
            const lat = url.searchParams.get("lat") || 45.52;
            const lon = url.searchParams.get("lon") || -122.67;
            const city = url.searchParams.get("city") || "Unknown";
            const key = url.searchParams.get("key") || "";
            const model = url.searchParams.get("model") || "gptimage";
            const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day,visibility,cloud_cover,wind_speed_10m&daily=uv_index_max&timezone=auto`);
            const d = await weatherRes.json();
            const dateStr = new Date().toISOString().split('T')[0];
            const utcOffsetSeconds = d.utc_offset_seconds || 0;
            const tzParam = (utcOffsetSeconds % 3600 === 0) ? (utcOffsetSeconds / 3600).toString() : (utcOffsetSeconds / 3600).toFixed(1);
            const usnoRes = await fetch(`https://aa.usno.navy.mil/api/rstt/oneday?date=${dateStr}&coords=${lat},${lon}&tz=${tzParam}`);
            let astro = { sunrise: "6:00 AM", sunset: "18:00 PM", moon: "Visible", moonrise: "N/A", moonset: "N/A", moon_illumination: 0 };
            try {
                const u = await usnoRes.json();
                const data = u.properties.data;
                astro.moon = data.curphase || "Visible";
                astro.moon_illumination = parseInt((data.fracillum || "0").replace("%", "")) || 0;
                if (data.sundata) data.sundata.forEach(s => { if(s.phen=="Rise") astro.sunrise=s.time; if(s.phen=="Set") astro.sunset=s.time; });
                if (data.moondata) data.moondata.forEach(m => { if(m.phen=="Rise") astro.moonrise=m.time; if(m.phen=="Set") astro.moonset=m.time; });
            } catch(e) {}
            const poiRes = await fetch(`https://gen.pollinations.ai/text/${encodeURIComponent("One famous landmark in " + city + ". Output JSON: {\"name\":\"...\",\"description\":\"...\"}")}?model=openai&system=Output%20JSON%20only${key ? "&key="+key : ""}`);
            let poi = { name: city, description: "A beautiful view" };
            try { 
                const poiText = await poiRes.text();
                const cleanPoi = poiText.split("```json").join("").split("```").join("").trim();
                poi = JSON.parse(cleanPoi); 
            } catch(e) {}
            const isDay = d.current.is_day === 1;
            const vars = {
                "{poi_name}": poi.name, "{poi_desc}": poi.description || "", "{city}": city, "{state_region}": "", "{country}": "",
                "{time_of_day}": isDay ? "Daytime" : "Nighttime", "{datetime}": new Date().toLocaleString(),
                "{weather}": WMO_MAP[d.current.weather_code] || "Clear", "{temperature}": Math.round(d.current.temperature_2m * 9/5 + 32) + "°F", "{theme}": "General",
                "{sunrise}": astro.sunrise, "{sunset}": astro.sunset, "{uv_index}": d.daily.uv_index_max[0], "{visibility}": (d.current.visibility / 1609).toFixed(1) + "mi",
                "{cloud_cover}": d.current.cloud_cover + "%", "{wind_speed}": d.current.wind_speed_10m + "mph",
                "{moon_phase}": astro.moon, "{moon_illumination}": astro.moon_illumination + " percent", "{moonrise}": astro.moonrise, "{moonset}": astro.moonset, "{style}": "Hyper Realistic"
            };
            let p = isDay ? SHARED_DEFAULT_DAY : SHARED_DEFAULT_NIGHT;
            for (const [k, v] of Object.entries(vars)) { p = p.split(k).join(v || ""); }
            const cleanP = workerSanitize(p) || `Beautiful cinematic wallpaper of ${poi.name}`;
            const finalImgUrl = `https://gen.pollinations.ai/image/${encodeURIComponent(cleanP)}?model=${model}&width=1290&height=2796&nologo=true${key ? "&key="+key : ""}`;
            return new Response(JSON.stringify({ imageUrl: finalImgUrl, poiLabel: poi.name, prompt: cleanP }), { headers: { "Content-Type": "application/json" } });
        }
        return new Response("Not Found", { status: 404 });
    } catch (err) {
        return new Response(err.message + "\n" + err.stack, { status: 500, headers: { "Content-Type": "text/plain" } });
    }
}