import SwiftUI

struct SettingsView: View {
    @StateObject private var settings = SettingsManager.shared
    @State private var newProfileName = ""
    
    var body: some View {
        NavigationView {
            Form {
                Section("Usage Statistics") {
                    HStack {
                        Text("Total Balance")
                        Spacer()
                        Text(settings.pollenBalance)
                            .foregroundColor(.white)
                            .bold()
                    }
                    HStack {
                        Text("Account Tier")
                        Spacer()
                        Text(settings.accountTier.uppercased())
                            .foregroundColor(.blue)
                            .bold()
                    }
                    HStack {
                        Text("Tier Grant")
                        Spacer()
                        Text(settings.tierGrant)
                            .foregroundColor(.gray)
                            .font(.caption)
                    }
                    Button("Refresh Stats") {
                        Task { await settings.fetchUsageStats() }
                    }
                    .font(.footnote)
                }
                
                Section("AI Configuration") {
                    Picker("Image Model", selection: $settings.currentProfile.model) {
                        Text("GPT Image").tag("gptimage")
                        Text("Flux").tag("flux")
                        Text("ZImage").tag("zimage")
                    }
                    Picker("Quality", selection: $settings.currentProfile.quality) {
                        Text("Low").tag("low")
                        Text("Medium").tag("medium")
                        Text("High").tag("high")
                        Text("HD").tag("hd")
                    }
                    Picker("Style", selection: $settings.currentProfile.style) {
                        ForEach(settings.appData.styles, id: \.self) { style in
                            Text(style).tag(style)
                        }
                    }
                    Picker("Resolution", selection: $settings.currentProfile.resolution) {
                        Text("iPhone 16 Pro Max").tag("1290x2796")
                        Text("iPhone Standard").tag("1170x2532")
                        Text("Square").tag("1024x1024")
                    }
                }
                
                Section("API Key") {
                    SecureField("Pollinations API Key", text: $settings.currentProfile.apiKey)
                }
                
                Section("Advanced Options") {
                    Toggle("AI Enhance", isOn: $settings.currentProfile.enhance)
                    Toggle("Overlay POI Label", isOn: $settings.currentProfile.overlayLabel)
                    Toggle("Transparent Background", isOn: $settings.currentProfile.transparent)
                    Toggle("Safe Search", isOn: $settings.currentProfile.safeSearch)
                    
                    VStack(alignment: .leading) {
                        Toggle("Fixed Seed", isOn: $settings.currentProfile.seedEnable)
                        if settings.currentProfile.seedEnable {
                            TextField("Seed Number (-1 for random)", value: $settings.currentProfile.seed, formatter: NumberFormatter())
                                .keyboardType(.numberPad)
                                .textFieldStyle(RoundedBorderTextFieldStyle())
                        }
                    }
                    
                    VStack(alignment: .leading) {
                        Toggle("Negative Prompt", isOn: $settings.currentProfile.negEnable)
                        if settings.currentProfile.negEnable {
                            TextEditor(text: $settings.currentProfile.negativePrompt)
                                .frame(height: 60)
                                .font(.system(size: 12, design: .monospaced))
                                .overlay(RoundedRectangle(cornerRadius: 4).stroke(Color.gray.opacity(0.2)))
                        }
                    }
                }
                
                Section("Cloud Accounts") {
                    ForEach(settings.appData.profiles) { profile in
                        HStack {
                            VStack(alignment: .leading) {
                                Text(profile.name)
                                    .bold()
                                Text(profile.name == settings.currentProfile.name ? "Active" : "Local Config")
                                    .font(.caption)
                                    .foregroundColor(profile.name == settings.currentProfile.name ? .blue : .gray)
                            }
                            Spacer()
                            if profile.name == settings.currentProfile.name {
                                Image(systemName: "checkmark.circle.fill").foregroundColor(.blue)
                            }
                        }
                        .contentShape(Rectangle())
                        .onTapGesture { settings.switchProfile(name: profile.name) }
                    }
                    .onDelete { indices in
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
                    Button("Wipe All Local Data", role: .destructive) {
                        // Reset local data logic
                    }
                }
            }
            .navigationTitle("Settings")
            .onAppear {
                Task { await settings.fetchUsageStats() }
            }
        }
    }
}
