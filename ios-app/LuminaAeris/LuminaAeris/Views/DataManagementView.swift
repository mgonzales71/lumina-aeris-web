import SwiftUI

struct DataManagementView: View {
    @StateObject private var settings = SettingsManager.shared
    @State private var showingImporter = false
    @State private var importType: String = ""
    @State private var importText: String = ""
    
    var body: some View {
        NavigationView {
            List {
                Section("Core Lists") {
                    NavigationLink("Landmarks (POIs)") { POIManagementView() }
                    NavigationLink("Seasonal Themes") { ThemeManagementView() }
                    NavigationLink("Saved Locations") { LocationManagementView() }
                    NavigationLink("Styles") { StyleManagementView() }
                Section("Backup & Migration") {
                    Button("Export Full Profile") { exportData("full") }
                    Button("Import Data") { showingImporter = true }
                }
                
                Section("Maintenance") {
                    Button("Clear All Local Cache", role: .destructive) {
                        settings.appData.poiCache = [:]
                        settings.save()
                    }
                }
            }
            .navigationTitle("Data Management")
            .sheet(isPresented: $showingImporter) {
                ImporterView()
            }
        }
    }
    
    func exportData(_ type: String) {
        // Implementation for sharing JSON string
    }
}

// MARK: - Subviews for Data Management

struct POIManagementView: View {
    @StateObject private var settings = SettingsManager.shared
    @State private var selectedCity = ""
    
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
            Button("Add") { /* Add POI logic */ }
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
                        Text("\(theme.Begin) - \(theme.End)").font(.caption).opacity(0.7)
                    }
                    Spacer()
                }
            }
            .onDelete { settings.appData.themes.remove(atOffsets: $0); settings.save() }
        }
        .navigationTitle("Themes")
        .toolbar {
            Button("Add") { /* Add Theme logic */ }
        }
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
        .toolbar {
            Button("Add") { /* Add Style logic */ }
        }
    }
}

struct ImporterView: View {
    @Environment(\.dismiss) var dismiss
    @State private var text = ""
    var body: some View {
        NavigationView {
            VStack {
                Text("Paste JSON Data here").font(.caption)
                TextEditor(text: $text)
                    .font(.system(size: 12, design: .monospaced))
                    .border(Color.gray.opacity(0.2))
                    .padding()
                
                Button("Process Import") {
                    // Smart healing logic from Web App v1.14.7
                    processImport()
                }
                .padding()
            }
            .navigationTitle("Import Data")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
            }
        }
    }
    
    func processImport() {
        // Implementation of self-healing JSON parser
        dismiss()
    }
}
