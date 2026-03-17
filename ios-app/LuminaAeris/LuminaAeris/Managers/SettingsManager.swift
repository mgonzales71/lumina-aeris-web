import Foundation
import SwiftUI
import Combine

class SettingsManager: ObservableObject {
    static let shared = SettingsManager()
    
    @Published var appData: AppData
    @Published var currentProfile: Profile
    
    // Usage Stats State
    @Published var pollenBalance: String = "N/A"
    @Published var accountTier: String = "N/A"
    @Published var tierGrant: String = "0.00 Pollen"
    
    // Default Strings from Web App v1.15.3
    static let DEFAULT_DAY_STR = "Generate a {style} style image of {poi_name} in {city}, {state_region}. POI description: {poi_desc}. Ensure architectural and geographical accuracy based on real-world references. Time: {time_of_day} {datetime}. Weather: {weather}, {temperature}. Sun at {sunrise} and {sunset} for realistic positioning. Adjust sun visibility based on {weather}. Include the UV index and visibility in the depiction. Account for cloud cover to influence lighting and shadows. Safe Zone Framing: keep significant elements centered and critical content within 80-90 percent of the image width and height. Atmosphere: incorporate the theme of {theme} as a subtle, realistic element. Apply a professional, natural-looking auto-enhancement: brighten shadows, recover highlights, boost midtone contrast, and enhance clarity while preserving a photorealistic look."
    
    static let DEFAULT_NIGHT_STR = "Generate a {style} style image of {poi_name} in {city}, {state_region}. POI description: {poi_desc}. Ensure architectural and geographical accuracy based on real-world references. Time: {time_of_day} {datetime}. Weather: {weather}, {temperature}. Moon in {moon_phase} with {moon_illumination} illumination. Account for moonrise {moonrise} and moonset {moonset} for realistic positioning. Adjust moon visibility based on {weather}. Safe Zone Framing: keep significant elements centered and critical content within 80-90 percent of the image width and height. Atmosphere: incorporate the theme of {theme} as a subtle, realistic element. Apply a professional, natural-looking auto-enhancement: brighten shadows, recover highlights, boost midtone contrast, and enhance clarity while preserving a photorealistic look."
    
    static let DEFAULT_POI_DOMESTIC_STR = "You are an expert in identifying unique and notable points of interest, views, and vistas of the requested locations. Please provide one item per line without any formatting or citations. Generate a list of up to 30 visually distinct points of interest, landmarks, or vistas in or near {city}, {state_region}. Take your time to conduct a comprehensive search. Formatting Guidelines: 1. Provide only a raw JSON array of objects. 2. Exclude markdown code blocks (no backticks). 3. Omit any introductory or concluding text. 4. Each object must have precisely two keys: \"name\" and \"description\". 5. The \"description\" should consist of one to two concise sentences that visually describe the named point of interest."
    
    static let DEFAULT_POI_INTL_STR = "You are an expert in identifying unique and notable points of interest, views, and vistas of the requested locations. Please provide one item per line without any formatting or citations. Generate a list of up to 30 visually distinct points of interest, landmarks, or vistas in or near {city}, {country}. Take your time to conduct a comprehensive search. Formatting Guidelines: 1. Provide only a raw JSON array of objects. 2. Exclude markdown code blocks (no backticks). 3. Omit any introductory or concluding text. 4. Each object must have precisely two keys: \"name\" and \"description\". 5. The \"description\" should consist of one to two concise sentences that visually describe the named point of interest."
    
    static let DEFAULT_STYLES = ["Hyper photo realistic", "Cinematic photography", "Watercolor painting", "Oil painting", "Pencil sketch", "Crayon drawing", "Claymation", "3D animation render", "Pixar-style 3D illustration", "Flat vector illustration", "Paper craft collage", "Ukiyo-e woodblock print", "Impressionist painting", "Pixel art", "Neon noir", "Vintage film photograph", "Comic book art", "Stained glass illustration"]

    private let savePath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("lumina_settings_v1.json")

    init() {
        let defaultProfile = Profile(
            name: "default",
            promptDay: SettingsManager.DEFAULT_DAY_STR,
            promptNight: SettingsManager.DEFAULT_NIGHT_STR,
            promptPOIDomestic: SettingsManager.DEFAULT_POI_DOMESTIC_STR,
            promptPOIIntl: SettingsManager.DEFAULT_POI_INTL_STR,
            quality: "medium",
            model: "gptimage",
            textModel: "gemini-search",
            style: "Hyper photo realistic",
            resolution: "1290x2796",
            apiKey: "",
            overlayLabel: false,
            transparent: false,
            safeSearch: true,
            enhance: false,
            seedEnable: false,
            seed: -1,
            negativePrompt: "",
            negEnable: false,
            locMode: "gps",
            customLocIdx: 0
        )
        
        let initialData = AppData(
            poiCache: [:],
            locations: [LocationRecord(city: "Portland", state: "Oregon", country: "USA", lat: 45.52, lon: -122.67)],
            styles: SettingsManager.DEFAULT_STYLES,
            themes: SettingsManager.defaultThemes(),
            profiles: [defaultProfile],
            currentProfile: "default"
        )
        
        self.appData = initialData
        self.currentProfile = defaultProfile
        
        load()
    }
    
    func load() {
        if let data = try? Data(contentsOf: savePath),
           let decoded = try? JSONDecoder().decode(AppData.self, from: data) {
            self.appData = decoded
            if let profile = decoded.profiles.first(where: { $0.name == decoded.currentProfile }) {
                self.currentProfile = profile
            }
        }
    }
    
    func save() {
        if let idx = appData.profiles.firstIndex(where: { $0.name == currentProfile.name }) {
            appData.profiles[idx] = currentProfile
        } else {
            appData.profiles.append(currentProfile)
        }
        appData.currentProfile = currentProfile.name
        
        if let encoded = try? JSONEncoder().encode(appData) {
            try? encoded.write(to: savePath)
        }
    }
    
    func switchProfile(name: String) {
        save()
        if let profile = appData.profiles.first(where: { $0.name == name }) {
            self.currentProfile = profile
            appData.currentProfile = name
            save()
            Task { await fetchUsageStats() } // Refresh stats on switch
        }
    }
    
    func fetchUsageStats() async {
        guard !currentProfile.apiKey.isEmpty else { return }
        
        do {
            // 1. Fetch Profile
            var pReq = URLRequest(url: URL(string: "https://gen.pollinations.ai/account/profile")!)
            pReq.setValue("Bearer \(currentProfile.apiKey)", forHTTPHeaderField: "Authorization")
            let (pDataRaw, _) = try await URLSession.shared.data(for: pReq)
            let pData = try? JSONSerialization.jsonObject(with: pDataRaw) as? [String: Any]
            
            // 2. Fetch Balance
            var bReq = URLRequest(url: URL(string: "https://gen.pollinations.ai/account/balance")!)
            bReq.setValue("Bearer \(currentProfile.apiKey)", forHTTPHeaderField: "Authorization")
            let (bDataRaw, _) = try await URLSession.shared.data(for: bReq)
            let bData = try? JSONSerialization.jsonObject(with: bDataRaw) as? [String: Any]
            
            DispatchQueue.main.async {
                let rawBal = bData?["balance"] ?? bData?["totalBalance"] ?? pData?["balance"] ?? 0
                self.pollenBalance = String(format: "%.2f Pollen", Double("\(rawBal)") ?? 0.0)
                self.accountTier = pData?["tier"] as? String ?? "Standard"
                let rawGrant = bData?["tierBalance"] ?? bData?["tierGrant"] ?? 0
                self.tierGrant = String(format: "%.2f Pollen", Double("\(rawGrant)") ?? 0.0)
            }
        } catch {}
    }
    
    func createProfile(name: String) {
        var newProfile = currentProfile
        newProfile.name = name
        appData.profiles.append(newProfile)
        switchProfile(name: name)
    }
    
    func deleteProfile(name: String) {
        if name == "default" { return }
        appData.profiles.removeAll { $0.name == name }
        if currentProfile.name == name {
            switchProfile(name: "default")
        }
        save()
    }
    
    static func defaultThemes() -> [Theme] {
        return [
            Theme(Begin: 101, End: 103, Theme: "New Years"),
            Theme(Begin: 1015, End: 1031, Theme: "Halloween"),
            Theme(Begin: 1220, End: 1231, Theme: "Holiday Season")
        ]
    }
}
