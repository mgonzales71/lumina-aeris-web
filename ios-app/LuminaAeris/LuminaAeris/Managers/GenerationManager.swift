import Foundation
import CoreLocation

class GenerationManager: ObservableObject {
    static let shared = GenerationManager()
    
    @Published var lastGeneratedImageURL: URL?
    @Published var isGenerating = false
    @Published var statusMessage = "READY"
    
    private let settings = SettingsManager.shared
    
    struct WeatherInfo: Codable {
        let weather_desc: String
        let temp: Int
        let is_day: Bool
        let uv_index: Double
        let visibility: String
        let cloud_cover: String
        let wind_speed: String
        let sunrise: String
        let sunset: String
        let moon_phase: String
        let moonrise: String
        let moonset: String
        let moon_illumination: Int
    }
    
    // MARK: - Core Logic
    
    func generateWallpaper(lat: Double, lon: Double) async -> URL? {
        DispatchQueue.main.async { self.isGenerating = true; self.statusMessage = "LOCATING..." }
        
        // 1. Get Location Info (Reverse Geocode)
        let loc = await reverseGeocode(lat: lat, lon: lon)
        let city = loc.city
        let state = loc.state ?? ""
        let country = loc.country ?? ""
        
        // 2. Fetch Weather
        DispatchQueue.main.async { self.statusMessage = "WEATHER..." }
        guard let weather = await fetchWeather(lat: lat, lon: lon) else {
            DispatchQueue.main.async { self.isGenerating = false }
            return nil
        }
        
        // 3. Resolve POI
        DispatchQueue.main.async { self.statusMessage = "DISCOVERING..." }
        let poi = await resolvePOI(city: city, state: state, country: country)
        
        // 4. Get Seasonal Theme
        let theme = getThemeForDate()
        
        // 5. Build Prompt
        DispatchQueue.main.async { self.statusMessage = "DREAMING..." }
        let prompt = buildPrompt(weather: weather, poi: poi, theme: theme, city: city, state: state, country: country)
        
        // 6. Generate Image URL
        let finalURL = buildImageURL(prompt: prompt)
        
        DispatchQueue.main.async {
            self.lastGeneratedImageURL = finalURL
            self.isGenerating = false
            self.statusMessage = "READY"
        }
        
        return finalURL
    }
    
    // MARK: - Helpers
    
    private func reverseGeocode(lat: Double, lon: Double) async -> (city: String, state: String?, country: String?) {
        let url = URL(string: "https://nominatim.openstreetmap.org/reverse?format=json&lat=\(lat)&lon=\(lon)")!
        var request = URLRequest(url: url)
        request.setValue("LuminaAeris-iOS/1.0", forHTTPHeaderField: "User-Agent")
        
        do {
            let (data, _) = try await URLSession.shared.data(for: request)
            if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let address = json["address"] as? [String: Any] {
                let city = address["city"] as? String ?? address["town"] as? String ?? address["village"] as? String ?? "Unknown"
                let state = address["state"] as? String
                let country = address["country"] as? String
                return (city, state, country)
            }
        } catch {}
        return ("Unknown", nil, nil)
    }
    
    private func fetchWeather(lat: Double, lon: Double) async -> WeatherInfo? {
        let weatherUrl = URL(string: "https://api.open-meteo.com/v1/forecast?latitude=\(lat)&longitude=\(lon)&current=temperature_2m,weather_code,is_day,visibility,cloud_cover,wind_speed_10m&daily=uv_index_max&timezone=auto")!
        
        do {
            let (data, _) = try await URLSession.shared.data(from: weatherUrl)
            guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let current = json["current"] as? [String: Any],
                  let daily = json["daily"] as? [String: Any],
                  let uvMaxArr = daily["uv_index_max"] as? [Double] else { return nil }
            
            let code = current["weather_code"] as? Int ?? 0
            let wmoMap: [Int: String] = [0: "Clear", 1: "Mainly Clear", 2: "Partly Cloudy", 3: "Overcast", 45: "Fog", 61: "Rain", 71: "Snow", 95: "Thunderstorm"]
            
            // Astro (USNO)
            let dateStr = ISO8601DateFormatter().string(from: Date()).prefix(10)
            let utcOffset = (json["utc_offset_seconds"] as? Int ?? 0) / 3600
            let usnoUrl = URL(string: "https://aa.usno.navy.mil/api/rstt/oneday?date=\(dateStr)&coords=\(lat),\(lon)&tz=\(utcOffset)")!
            
            var astro = (sunrise: "6:00 AM", sunset: "18:00 PM", moon: "Visible", moonrise: "N/A", moonset: "N/A", moon_illumination: 0)
            
            if let (aData, _) = try? await URLSession.shared.data(from: usnoUrl),
               let aJson = try? JSONSerialization.jsonObject(with: aData) as? [String: Any],
               let properties = aJson["properties"] as? [String: Any],
               let dataObj = properties["data"] as? [String: Any] {
                astro.moon = dataObj["curphase"] as? String ?? "Visible"
                let frac = (dataObj["fracillum"] as? String ?? "0").replacingOccurrences(of: "%", with: "")
                astro.moon_illumination = Int(frac) ?? 0
                
                if let sundata = dataObj["sundata"] as? [[String: String]] {
                    for s in sundata {
                        if s["phen"] == "Rise" { astro.sunrise = s["time"] ?? astro.sunrise }
                        if s["phen"] == "Set" { astro.sunset = s["time"] ?? astro.sunset }
                    }
                }
                if let moondata = dataObj["moondata"] as? [[String: String]] {
                    for m in moondata {
                        if m["phen"] == "Rise" { astro.moonrise = m["time"] ?? astro.moonrise }
                        if m["phen"] == "Set" { astro.moonset = m["time"] ?? astro.moonset }
                    }
                }
            }
            
            return WeatherInfo(
                weather_desc: wmoMap[code] ?? "Variable",
                temp: Int(round((current["temperature_2m"] as? Double ?? 0.0) * 9/5 + 32)),
                is_day: (current["is_day"] as? Int ?? 1) == 1,
                uv_index: uvMaxArr.first ?? 0.0,
                visibility: String(format: "%.1fmi", (current["visibility"] as? Double ?? 0.0) / 1609.0),
                cloud_cover: "\(current["cloud_cover"] as? Int ?? 0)%",
                wind_speed: "\(current["wind_speed_10m"] as? Double ?? 0.0)mph",
                sunrise: astro.sunrise, sunset: astro.sunset, moon_phase: astro.moon,
                moonrise: astro.moonrise, moonset: astro.moonset, moon_illumination: astro.moon_illumination
            )
        } catch { return nil }
    }
    
    private func resolvePOI(city: String, state: String, country: String) async -> POI {
        let cityKey = city.lowercased().trimmingCharacters(in: .whitespaces)
        
        // 1. Check Profile Cache
        if let cached = settings.currentProfile.poiCache?[cityKey], !cached.isEmpty {
            return cached.randomElement()!
        }
        
        // 2. Check Shared Cache
        if let shared = settings.appData.poiCache[cityKey], !shared.isEmpty {
            return shared.randomElement()!
        }
        
        // 3. AI Discover
        let isUS = country.lowercased().contains("usa") || country.lowercased().contains("united states")
        var discPrompt = isUS ? settings.currentProfile.promptPOIDomestic : settings.currentProfile.promptPOIIntl
        discPrompt = discPrompt
            .replacingOccurrences(of: "{city}", with: city)
            .replacingOccurrences(of: "{state_region}", with: state)
            .replacingOccurrences(of: "{country}", with: country)
        
        let payload: [String: Any] = [
            "messages": [
                ["role": "system", "content": "Output JSON only. Do not wrap in markdown blocks."],
                ["role": "user", "content": discPrompt]
            ],
            "model": settings.currentProfile.textModel,
            "jsonMode": true
        ]
        
        var pollUrl = "https://text.pollinations.ai/"
        if !settings.currentProfile.apiKey.isEmpty { pollUrl += "?key=\(settings.currentProfile.apiKey)" }
        
        var request = URLRequest(url: URL(string: pollUrl)!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: payload)
        
        do {
            let (data, _) = try await URLSession.shared.data(for: request)
            if let text = String(data: data, encoding: .utf8) {
                let clean = text.replacingOccurrences(of: "```json", with: "").replacingOccurrences(of: "```", with: "").trimmingCharacters(in: .whitespacesAndNewlines)
                if let decoded = try? JSONDecoder().decode([POI].self, from: clean.data(using: .utf8)!) {
                    DispatchQueue.main.async {
                        self.settings.appData.poiCache[cityKey] = decoded
                        self.settings.save()
                    }
                    return decoded.randomElement()!
                } else if let single = try? JSONDecoder().decode(POI.self, from: clean.data(using: .utf8)!) {
                    DispatchQueue.main.async {
                        self.settings.appData.poiCache[cityKey] = [single]
                        self.settings.save()
                    }
                    return single
                }
            }
        } catch {}
        
        return POI(name: city, description: "A majestic local view.")
    }
    
    private func getThemeForDate() -> String {
        let now = Date()
        let calendar = Calendar.current
        let month = calendar.component(.month, from: now)
        let day = calendar.component(.day, from: now)
        let ord = month * 100 + day
        
        return settings.appData.themes.first { ord >= $0.Begin && ord <= $0.End }?.Theme ?? "General"
    }
    
    private func buildPrompt(weather: WeatherInfo, poi: POI, theme: String, city: String, state: String, country: String) -> String {
        var p = weather.is_day ? settings.currentProfile.promptDay : settings.currentProfile.promptNight
        
        let vars: [String: String] = [
            "{style}": settings.currentProfile.style,
            "{poi_name}": poi.name,
            "{poi_desc}": poi.description,
            "{city}": city,
            "{state_region}": state,
            "{country}": country,
            "{time_of_day}": weather.is_day ? "Daytime" : "Nighttime",
            "{datetime}": DateFormatter.localizedString(from: Date(), dateStyle: .medium, timeStyle: .short),
            "{weather}": weather.weather_desc,
            "{temperature}": "\(weather.temp)°F",
            "{theme}": theme,
            "{sunrise}": weather.sunrise,
            "{sunset}": weather.sunset,
            "{uv_index}": String(format: "%.1f", weather.uv_index),
            "{visibility}": weather.visibility,
            "{cloud_cover}": weather.cloud_cover,
            "{wind_speed}": weather.wind_speed,
            "{moon_phase}": weather.moon_phase,
            "{moon_illumination}": "\(weather.moon_illumination) percent",
            "{moonrise}": weather.moonrise,
            "{moonset}": weather.moonset
        ]
        
        for (k, v) in vars {
            p = p.replacingOccurrences(of: k, with: v)
        }
        
        if settings.currentProfile.quality == "high" { p += ", 8k resolution, masterpiece" }
        if settings.currentProfile.quality == "hd" { p += ", 16k resolution, cinematic lighting" }
        
        return p.replacingOccurrences(of: "\n", with: " ").replacingOccurrences(of: "%", with: " percent").trimmingCharacters(in: .whitespaces)
    }
    
    private func buildImageURL(prompt: String) -> URL? {
        let dims = settings.currentProfile.resolution.split(separator: "x")
        let w = dims.first ?? "1290"
        let h = dims.last ?? "2796"
        let seed = settings.currentProfile.seedEnable ? settings.currentProfile.seed : Int.random(in: 1...999999)
        
        var urlStr = "https://gen.pollinations.ai/image/\(prompt.addingPercentEncoding(withAllowedCharacters: .urlHostAllowed) ?? "")?width=\(w)&height=\(h)&seed=\(seed)&model=\(settings.currentProfile.model)&nologo=true"
        
        if settings.currentProfile.transparent { urlStr += "&transparent=true" }
        if !settings.currentProfile.safeSearch { urlStr += "&safe=false" }
        if settings.currentProfile.enhance { urlStr += "&enhance=true" }
        if settings.currentProfile.negEnable && !settings.currentProfile.negativePrompt.isEmpty {
            urlStr += "&negative_prompt=\(settings.currentProfile.negativePrompt.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")"
        }
        if !settings.currentProfile.apiKey.isEmpty { urlStr += "&key=\(settings.currentProfile.apiKey)" }
        
        return URL(string: urlStr)
    }
}
