// Lumina Aeris Web Backend - Functions v1.10.18
// Mandate: NO Truncation. NO Minification. NO Missing Logic.

const WMO_MAP = { 0: "Clear", 1: "Mainly Clear", 2: "Partly Cloudy", 3: "Overcast", 45: "Fog", 61: "Rain", 71: "Snow", 95: "Thunderstorm" };

// --- 1. UTILITIES ---
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

const SHARED_DEFAULT_DAY = "Generate a {style} style image of {poi_name} in {city}, {state_region}. POI description: {poi_desc}. Ensure architectural and geographical accuracy based on real-world references. Time: {time_of_day} {datetime}. Weather: {weather}, {temperature}. Sun at {sunrise} and {sunset} for realistic positioning. Adjust sun visibility based on {weather}. Include the UV index and visibility in the depiction. Account for cloud cover to influence lighting and shadows. Safe Zone Framing: keep significant elements centered and critical content within 80-90 percent of the image width and height. Atmosphere: incorporate the theme of {theme} as a subtle, realistic element. Apply a professional, natural-looking auto-enhancement: brighten shadows, recover highlights, boost midtone contrast, and enhance clarity while preserving a photorealistic look.";
const SHARED_DEFAULT_NIGHT = "Generate a {style} style image of {poi_name} in {city}, {state_region}. POI description: {poi_desc}. Ensure architectural and geographical accuracy based on real-world references. Time: {time_of_day} {datetime}. Weather: {weather}, {temperature}. Moon in {moon_phase} with {moon_illumination} illumination. Account for moonrise {moonrise} and moonset {moonset} for realistic positioning. Adjust moon visibility based on {weather}. Safe Zone Framing: keep significant elements centered and critical content within 80-90 percent of the image width and height. Atmosphere: incorporate the theme of {theme} as a subtle, realistic element. Apply a professional, natural-looking auto-enhancement: brighten shadows, recover highlights, boost midtone contrast, and enhance clarity while preserving a photorealistic look.";
const SHARED_DEFAULT_POI_DOMESTIC = "You are an expert in identifying unique and notable points of interest, views, and vistas of the requested locations. Please provide one item per line without any formatting or citations. Generate a list of up to 30 visually distinct points of interest, landmarks, or vistas in or near {city}, {state_region}. Take your time to conduct a comprehensive search. Formatting Guidelines: 1. Provide only a raw JSON array of objects. 2. Exclude markdown code blocks (no backticks). 3. Omit any introductory or concluding text. 4. Each object must have precisely two keys: \"name\" and \"description\". 5. The \"description\" should consist of one to two concise sentences that visually describe the named point of interest.";
const SHARED_DEFAULT_POI_INTL = "You are an expert in identifying unique and notable points of interest, views, and vistas of the requested locations. Please provide one item per line without any formatting or citations. Generate a list of up to 30 visually distinct points of interest, landmarks, or vistas in or near {city}, {country}. Take your time to conduct a comprehensive search. Formatting Guidelines: 1. Provide only a raw JSON array of objects. 2. Exclude markdown code blocks (no backticks). 3. Omit any introductory or concluding text. 4. Each object must have precisely two keys: \"name\" and \"description\". 5. The \"description\" should consist of one to two concise sentences that visually describe the named point of interest.";

const SECRET_KEY = "SuperSecret2026Key42"; // Must match searchParams for write access

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname;

    try {
        // --- 2. Nominatim Proxy ---
        if (path === "/api/proxy/nominatim") {
            const lat = url.searchParams.get("lat");
            const lon = url.searchParams.get("lon");
            const q = url.searchParams.get("q");
            let apiUrl = "https://nominatim.openstreetmap.org/reverse?format=json&lat=" + lat + "&lon=" + lon;
            if (q) apiUrl = "https://nominatim.openstreetmap.org/search?format=json&q=" + encodeURIComponent(q);
            
            const res = await fetch(apiUrl, { headers: { "User-Agent": "LuminaAeris/1.0" } });
            return new Response(JSON.stringify(await res.json()), { headers: { "Content-Type": "application/json" } });
        }

        // --- 3. Weather Proxy ---
        if (path === "/api/proxy/weather") {
            const lat = url.searchParams.get("lat") || 45.52;
            const lon = url.searchParams.get("lon") || -122.67;
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day,visibility,cloud_cover,wind_speed_10m&daily=uv_index_max&timezone=auto`);
            return new Response(JSON.stringify(await res.json()), { headers: { "Content-Type": "application/json" } });
        }

        // --- 4. Cloudflare KV Config Store ---
        if (path === "/api/config") {
            const secret = request.headers.get("X-Lumina-Secret") || url.searchParams.get("secret");
            if (secret !== SECRET_KEY) return new Response("Unauthorized", { status: 401 });

            if (request.method === "POST") {
                const config = await request.json();
                if (env.LUMINA_SETTINGS) {
                    await env.LUMINA_SETTINGS.put("settings", JSON.stringify(config));
                }
                return new Response("Saved", { status: 200 });
            } else {
                try {
                    const config = env.LUMINA_SETTINGS ? await env.LUMINA_SETTINGS.get("settings") : "{}";
                    return new Response(config || "{}", { headers: { "Content-Type": "application/json" } });
                } catch(e) { return new Response(e.message, { status: 500 }); }
            }
        }

        // --- 5. Shortcut Context API (The "Brain" for iOS) ---
        if (path === "/api/context") {
            const secret = url.searchParams.get("secret");
            if (secret !== SECRET_KEY) return new Response("Unauthorized", { status: 401 });

            // Load Global Settings from KV
            let kvConfigRaw = null;
            if (env.LUMINA_SETTINGS) {
                try { kvConfigRaw = await env.LUMINA_SETTINGS.get("settings"); } catch(e) {}
            }
            const config = kvConfigRaw ? JSON.parse(kvConfigRaw) : { 
                promptDay: SHARED_DEFAULT_DAY, promptNight: SHARED_DEFAULT_NIGHT,
                promptPOIDomestic: SHARED_DEFAULT_POI_DOMESTIC, promptPOIIntl: SHARED_DEFAULT_POI_INTL,
                textModel: "gemini-search", model: "gptimage", apiKey: ""
            };

            const lat = url.searchParams.get("lat") || 45.52;
            const lon = url.searchParams.get("lon") || -122.67;
            const city = url.searchParams.get("city") || "Unknown";
            const state_region = url.searchParams.get("state") || "";
            const country = url.searchParams.get("country") || "";
            const cityKey = `poi:${city.toLowerCase().trim()}`;

            // Check KV for cached POIs
            let poiListRaw = null;
            if (env.LUMINA_SETTINGS) {
                try { poiListRaw = await env.LUMINA_SETTINGS.get(cityKey); } catch(e) {}
            }
            let pois = poiListRaw ? JSON.parse(poiListRaw) : [];

            // If no POIs cached, run Discovery
            if (pois.length === 0) {
                const isUS = country.toLowerCase().includes("usa") || country.toLowerCase().includes("united states");
                let discPrompt = isUS ? (config.promptPOIDomestic || SHARED_DEFAULT_POI_DOMESTIC) : (config.promptPOIIntl || SHARED_DEFAULT_POI_INTL);
                discPrompt = discPrompt.split("{city}").join(city).split("{state_region}").join(state_region).split("{country}").join(country);

                try {
                    const discPayload = {
                        messages: [
                            { role: "system", content: "Output JSON only. Do not wrap in markdown blocks." },
                            { role: "user", content: discPrompt }
                        ],
                        model: config.textModel || "gemini-search",
                        jsonMode: true
                    };
                    const discRes = await fetch("https://text.pollinations.ai/", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(discPayload)
                    });
                    const discText = await discRes.text();
                    const cleanDisc = discText.split("```json").join("").split("```").join("").trim();
                    const discoveredData = JSON.parse(cleanDisc);
                    pois = Array.isArray(discoveredData) ? discoveredData : [discoveredData];
                    
                    // Save to KV for next time
                    if (env.LUMINA_SETTINGS) {
                        try { await env.LUMINA_SETTINGS.put(cityKey, JSON.stringify(pois)); } catch(e) {}
                    }
                } catch(e) { 
                    pois = [{ name: city, description: "A beautiful local landmark." }];
                }
            }

            // Pick a random POI
            const poi = pois[Math.floor(Math.random() * pois.length)] || { name: city, description: "A beautiful local landmark." };

            // Weather & Astro
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

            const isDay = d.current.is_day === 1;
            const theme = "General"; 
            
            const vars = {
                "{poi_name}": poi.name, "{poi_desc}": poi.description || "", "{city}": city, "{state_region}": state_region, "{country}": country,
                "{time_of_day}": isDay ? "Daytime" : "Nighttime", "{datetime}": new Date().toLocaleString(),
                "{weather}": WMO_MAP[d.current.weather_code] || "Clear", "{temperature}": Math.round(d.current.temperature_2m * 9/5 + 32) + "°F", "{theme}": theme,
                "{sunrise}": astro.sunrise, "{sunset}": astro.sunset, "{uv_index}": d.daily.uv_index_max[0], "{visibility}": (d.current.visibility / 1609).toFixed(1) + "mi",
                "{cloud_cover}": d.current.cloud_cover + "%", "{wind_speed}": d.current.wind_speed_10m + "mph",
                "{moon_phase}": astro.moon, "{moon_illumination}": astro.moon_illumination + " percent", "{moonrise}": astro.moonrise, "{moonset}": astro.moonset, "{style}": config.style || "Hyper photo realistic"
            };

            let p = isDay ? (config.promptDay || SHARED_DEFAULT_DAY) : (config.promptNight || SHARED_DEFAULT_NIGHT);
            for (const [k, v] of Object.entries(vars)) { p = p.split(k).join(v || ""); }
            const cleanP = workerSanitize(p) || `Beautiful cinematic wallpaper of ${poi.name}`;
            
            const [w, h] = (config.resolution || "1290x2796").split('x');
            let finalImgUrl = `https://gen.pollinations.ai/image/${encodeURIComponent(cleanP)}?model=${config.model || "gptimage"}&width=${w}&height=${h}&nologo=true`;
            if (config.apiKey) finalImgUrl += `&key=${config.apiKey}`;
            
            return new Response(JSON.stringify({ 
                imageUrl: finalImgUrl, 
                poiLabel: poi.name,
                poiDescription: poi.description || "",
                prompt: cleanP,
                city: city,
                discovered: pois.length > 0
            }), { headers: { "Content-Type": "application/json" } });
        }
        return new Response("Not Found", { status: 404 });
    } catch (err) {
        return new Response(err.message + "\n" + err.stack, { status: 500, headers: { "Content-Type": "text/plain" } });
    }
}