import SwiftUI

struct ContentView: View {
    @StateObject private var settings = SettingsManager.shared
    @StateObject private var generator = GenerationManager.shared
    @StateObject private var location = LocationManager.shared
    
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            HomeView()
                .tabItem { Label("Home", systemImage: "house") }
                .tag(0)
            
            PromptEditorView()
                .tabItem { Label("Prompts", systemImage: "pencil.and.outline") }
                .tag(1)
            
            DataManagementView()
                .tabItem { Label("Data", systemImage: "map") }
                .tag(2)
            
            SettingsView()
                .tabItem { Label("More", systemImage: "gearshape") }
                .tag(3)
        }
        .accentColor(.blue)
        .onAppear {
            location.requestLocation()
        }
    }
}
