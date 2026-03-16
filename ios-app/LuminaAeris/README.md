# Lumina Aeris - Native iOS Application

This is a native SwiftUI implementation of the Lumina Aeris Management Suite.

## Key Features
- **Local-First Architecture**: All settings and landmark caches are stored locally on the device in a robust JSON format.
- **Native Shortcut Integration**: Includes the "Get Lumina Wallpaper" Shortcut action, allowing for automated background updates via the iOS Shortcuts app.
- **Location & Weather Aware**: Automatically detects your city and current weather to generate highly relevant, localized AI wallpapers.
- **Self-Healing Importer**: Replicates the v1.14.7 Web App's intelligent JSON importer for bulk landmark and profile migration.

## File Structure
- `Models/`: Data structures matching the Web App's JSON schema.
- `Managers/`:
    - `SettingsManager`: Local persistence and defaults.
    - `GenerationManager`: The "Brain" for prompt building and image generation.
    - `LocationManager`: CoreLocation integration for real-time GPS.
- `Views/`: SwiftUI views for Home, Prompts, Data, and Settings.
- `Intents/`: AppIntent for native Shortcut support.

## Shortcut Setup
1. Open the **Shortcuts** app on iOS.
2. Search for the **Lumina Aeris** app.
3. Use the **Get Lumina Wallpaper** action.
4. Pass the resulting URL into a **Get Contents of URL** action to download the image.
5. Use the **Set Wallpaper** action to apply it.
