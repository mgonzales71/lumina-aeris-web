import SwiftUI

struct SettingsView: View {
    @StateObject private var settings = SettingsManager.shared
    @State private var newProfileName = ""
    
    var body: some View {
        NavigationView {
            Form {
                Section("AI Configuration") {
                    Picker("Image Model", selection: $settings.currentProfile.model) {
                        Text("GPT Image").tag("gptimage")
                        Text("Flux").tag("flux")
                    }
                    Picker("Text Model", selection: $settings.currentProfile.textModel) {
                        Text("Gemini Search").tag("gemini-search")
                    }
                    Picker("Style", selection: $settings.currentProfile.style) {
                        ForEach(settings.appData.styles, id: \.self) { style in
                            Text(style).tag(style)
                        }
                    }
                    Picker("Resolution", selection: $settings.currentProfile.resolution) {
                        Text("iPhone 16 Pro Max").tag("1290x2796")
                        Text("Standard").tag("1024x1024")
                    }
                }
                
                Section("API Key") {
                    SecureField("Pollinations API Key", text: $settings.currentProfile.apiKey)
                }
                
                Section("Advanced Options") {
                    Toggle("Overlay POI Label", isOn: $settings.currentProfile.overlayLabel)
                    Toggle("Transparent Background", isOn: $settings.currentProfile.transparent)
                    Toggle("Safe Search", isOn: $settings.currentProfile.safeSearch)
                    Toggle("AI Enhance", isOn: $settings.currentProfile.enhance)
                }
                
                Section("Local Profiles") {
                    ForEach(settings.appData.profiles) { profile in
                        HStack {
                            Text(profile.name)
                            if profile.name == settings.currentProfile.name {
                                Spacer()
                                Image(systemName: "checkmark").foregroundColor(.blue)
                            }
                        }
                        .contentShape(Rectangle())
                        .onTapGesture { settings.switchProfile(name: profile.name) }
                    }
                    .onDelete { indices in
                        // Filter out 'default' and then delete
                        let profilesToDelete = indices.map { settings.appData.profiles[$0].name }
                        for name in profilesToDelete {
                            settings.deleteProfile(name: name)
                        }
                    }
                    
                    HStack {
                        TextField("New Profile Name", text: $newProfileName)
                        Button("Create") {
                            settings.createProfile(name: newProfileName)
                            newProfileName = ""
                        }
                        .disabled(newProfileName.isEmpty)
                    }
                }
                
                Section {
                    Button("Factory Reset", role: .destructive) {
                        // Reset local data
                    }
                }
            }
            .navigationTitle("Settings")
            .onChange(of: settings.currentProfile) { _ in
                settings.save()
            }
        }
    }
}
