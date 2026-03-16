import Foundation
import AppIntents
import UIKit

struct UpdateWallpaperIntent: AppIntent {
    static var title: LocalizedStringResource = "Get Lumina Wallpaper"
    static var description = IntentDescription("Generates a location-aware AI wallpaper and returns the image URL.")

    @Parameter(title: "Profile Name", default: "default")
    var profileName: String

    @Parameter(title: "Force Refresh POIs", default: false)
    var forceRefresh: Bool

    static var parameterSummary: some ParameterSummary {
        Summary("Get wallpaper using \(\.$profileName)")
    }

    func perform() async throws -> some IntentResult & ReturnsValue<URL> {
        let settings = SettingsManager.shared
        let generator = GenerationManager.shared
        let locationManager = LocationManager.shared
        
        // 1. Ensure Profile is correct
        if settings.currentProfile.name != profileName {
            settings.switchProfile(name: profileName)
        }
        
        // 2. Get Location (Wait for it if necessary)
        locationManager.requestLocation()
        // Simple polling for location with timeout
        var retryCount = 0
        while locationManager.lastLocation == nil && retryCount < 10 {
            try? await Task.sleep(nanoseconds: 500 * 1_000_000) // 0.5s
            retryCount += 1
        }
        
        let lat = locationManager.lastLocation?.coordinate.latitude ?? 45.52
        let lon = locationManager.lastLocation?.coordinate.longitude ?? -122.67
        
        // 3. Generate
        if let url = await generator.generateWallpaper(lat: lat, lon: lon) {
            return .result(value: url)
        }
        
        throw NSError(domain: "LuminaAeris", code: 1, userInfo: [NSLocalizedDescriptionKey: "Failed to generate wallpaper URL"])
    }
}
