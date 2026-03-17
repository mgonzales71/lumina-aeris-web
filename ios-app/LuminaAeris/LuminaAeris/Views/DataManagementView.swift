import SwiftUI

struct DataManagementView: View {
    @StateObject private var settings = SettingsManager.shared
    @State private var showingImporter = false
    @State private var importType: String = "full"
    
    var body: some View {
        NavigationView {
            List {
                Section("Core Lists") {
                    NavigationLink("Landmarks (POIs)") { POIManagementView() }
                    NavigationLink("Seasonal Themes") { ThemeManagementView() }
                    NavigationLink("Saved Locations") { LocationManagementView() }
                    NavigationLink("Styles") { StyleManagementView() }
                }
                
                Section("Backup & Migration") {
                    Button("Export Full Profile") { exportData() }
                    Button("Import Data") { 
                        importType = "full"
                        showingImporter = true 
                    }
                }
                
                Section("Maintenance") {
                    Button("Clear POI Cache", role: .destructive) {
                        settings.appData.poiCache = [:]
                        settings.save()
                    }
                }
            }
            .navigationTitle("Data Management")
            .sheet(isPresented: $showingImporter) {
                ImporterView(importType: $importType)
            }
        }
    }
    
    func exportData() {
        if let encoded = try? JSONEncoder().encode(settings.currentProfile),
           let jsonString = String(data: encoded, encoding: .utf8) {
            let av = UIActivityViewController(activityItems: [jsonString], applicationActivities: nil)
            if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
               let rootVC = windowScene.windows.first?.rootViewController {
                rootVC.present(av, animated: true)
            }
        }
    }
}

// MARK: - Subviews

struct POIManagementView: View {
    @StateObject private var settings = SettingsManager.shared
    @State private var selectedCity = ""
    @State private var showingAddPOI = false
    
    var body: some View {
        VStack {
            Picker("City", selection: $selectedCity) {
                Text("Select City").tag("")
                ForEach(Array(settings.appData.poiCache.keys).sorted(), id: \.self) { city in
                    Text(city.uppercased()).tag(city)
                }
            }
            .pickerStyle(.menu)
            .padding()
            
            List {
                if !selectedCity.isEmpty, let pois = settings.appData.poiCache[selectedCity] {
                    ForEach(pois) { poi in
                        VStack(alignment: .leading) {
                            Text(poi.name).font(.headline)
                            Text(poi.description).font(.caption).opacity(0.7)
                        }
                    }
                    .onDelete { indices in
                        settings.appData.poiCache[selectedCity]?.remove(atOffsets: indices)
                        settings.save()
                    }
                }
            }
        }
        .navigationTitle("Landmarks")
        .toolbar {
            Button("Import") { /* logic to show specific importer */ }
        }
    }
}

struct ThemeManagementView: View {
    @StateObject private var settings = SettingsManager.shared
    var body: some View {
        List {
            ForEach(settings.appData.themes) { theme in
                HStack {
                    VStack(alignment: .leading) {
                        Text(theme.Theme).font(.headline)
                        Text(String(format: "%04d - %04d", theme.Begin, theme.End)).font(.caption).opacity(0.7)
                    }
                }
            }
            .onDelete { settings.appData.themes.remove(atOffsets: $0); settings.save() }
        }
        .navigationTitle("Themes")
    }
}

struct LocationManagementView: View {
    @StateObject private var settings = SettingsManager.shared
    var body: some View {
        List {
            ForEach(settings.appData.locations) { loc in
                VStack(alignment: .leading) {
                    Text(loc.city).font(.headline)
                    Text("\(loc.state ?? loc.country ?? "") (\(String(format: "%.2f", loc.lat)), \(String(format: "%.2f", loc.lon)))").font(.caption).opacity(0.7)
                }
            }
            .onDelete { settings.appData.locations.remove(atOffsets: $0); settings.save() }
        }
        .navigationTitle("Locations")
    }
}

struct StyleManagementView: View {
    @StateObject private var settings = SettingsManager.shared
    var body: some View {
        List {
            ForEach(settings.appData.styles, id: \.self) { style in
                Text(style)
            }
            .onDelete { settings.appData.styles.remove(atOffsets: $0); settings.save() }
        }
        .navigationTitle("Styles")
    }
}

struct ImporterView: View {
    @Environment(\.dismiss) var dismiss
    @Binding var importType: String
    @State private var text = ""
    @State private var errorMessage: String?
    
    var body: some View {
        NavigationView {
            VStack {
                Text("Paste JSON Data (Auto-healing enabled)").font(.caption).padding(.top)
                TextEditor(text: $text)
                    .font(.system(size: 12, design: .monospaced))
                    .padding(4)
                    .background(Color.white.opacity(0.05))
                    .cornerRadius(8)
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.gray.opacity(0.2)))
                    .padding()
                
                if let error = errorMessage {
                    Text(error).foregroundColor(.red).font(.caption).padding(.horizontal)
                }
                
                Button(action: { processImport() }) {
                    Text("Process Import")
                        .bold()
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                }
                .padding()
            }
            .navigationTitle("Import \(importType.capitalized)")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
            }
        }
    }
    
    func processImport() {
        guard !text.isEmpty else { return }
        
        // --- SELF-HEALING LOGIC PARITY (v1.14.5) ---
        var cleaned = text
        // 1. Smart Quote Healing
        cleaned = cleaned.replacingOccurrences(of: "[\u{201C}\u{201D}\u{201E}\u{201F}\u{2033}\u{2036}]", with: "'", options: .regularExpression)
        cleaned = cleaned.replacingOccurrences(of: "[\u{2018}\u{2019}\u{201A}\u{201B}\u{2032}\u{2035}]", with: "'", options: .regularExpression)
        // 2. Hidden Characters
        cleaned = cleaned.replacingOccurrences(of: "[\u{200B}-\u{200D}\u{FEFF}]", with: "", options: .regularExpression)
        // 3. Trailing Commas
        cleaned = cleaned.replacingOccurrences(of: ",\\s*([\\}\\]])", with: "$1", options: .regularExpression)
        // 4. Flatten literal newlines
        cleaned = cleaned.replacingOccurrences(of: "\\r?\\n|\\r", with: " ", options: .regularExpression)
        
        guard let data = cleaned.data(using: .utf8) else {
            errorMessage = "Invalid text encoding."
            return
        }
        
        do {
            let settings = SettingsManager.shared
            switch importType {
            case "pois":
                let decoded = try JSONDecoder().decode([String: [POI]].self, from: data)
                settings.appData.poiCache.merge(decoded) { (_, new) in new }
            case "themes":
                let decoded = try JSONDecoder().decode([Theme].self, from: data)
                settings.appData.themes = decoded
            case "styles":
                let decoded = try JSONDecoder().decode([String].self, from: data)
                settings.appData.styles = decoded
            case "full":
                let decoded = try JSONDecoder().decode(Profile.self, from: data)
                settings.currentProfile = decoded
            default: break
            }
            settings.save()
            dismiss()
        } catch {
            errorMessage = "Import failed: \(error.localizedDescription)"
        }
    }
}
