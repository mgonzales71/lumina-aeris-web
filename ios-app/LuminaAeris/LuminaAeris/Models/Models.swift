import Foundation

// MARK: - Core Data Models
struct Theme: Codable, Identifiable, Hashable {
    var id: String { "\(Begin)-\(End)-\(Theme)" }
    let Begin: Int
    let End: Int
    let Theme: String
}

struct POI: Codable, Identifiable, Hashable {
    var id: String { name }
    let name: String
    let description: String
}

struct LocationRecord: Codable, Identifiable, Hashable {
    var id: String { "\(city)-\(lat)-\(lon)" }
    let city: String
    let state: String?
    let country: String?
    let lat: Double
    let lon: Double
}

struct Profile: Codable, Identifiable, Hashable {
    var id: String { name }
    var name: String
    
    // Core Templates
    var promptDay: String
    var promptNight: String
    var promptPOIDomestic: String
    var promptPOIIntl: String
    
    // AI Settings
    var quality: String
    var model: String
    var textModel: String
    var style: String
    var resolution: String
    var apiKey: String
    
    // UI Settings
    var overlayLabel: Bool
    var transparent: Bool
    var safeSearch: Bool
    var enhance: Bool
    var seedEnable: Bool
    var seed: Int
    var negativePrompt: String
    var negEnable: Bool
    
    // Location Settings
    var locMode: String // "gps" or "custom"
    var customLocIdx: Int
    
    // Landmark Cache (Parity with Web v1.14.6)
    var poiCache: [String: [POI]]?
}

struct AppData: Codable {
    var poiCache: [String: [POI]]
    var locations: [LocationRecord]
    var styles: [String]
    var themes: [Theme]
    var profiles: [Profile]
    var currentProfile: String
}
