import SwiftUI

struct PromptEditorView: View {
    @StateObject private var settings = SettingsManager.shared
    @State private var mode = 0 // 0: Day, 1: Night, 2: POI Domestic, 3: POI Intl
    @State private var text = ""
    
    let tokens = ["{style}", "{poi_name}", "{poi_desc}", "{city}", "{state_region}", "{country}", "{time_of_day}", "{datetime}", "{weather}", "{temperature}", "{theme}", "{moon_phase}", "{moon_illumination}", "{moonrise}", "{moonset}", "{sunrise}", "{sunset}", "{uv_index}", "{visibility}", "{cloud_cover}", "{wind_speed}"]
    
    var body: some View {
        NavigationView {
            VStack {
                Picker("Mode", selection: $mode) {
                    Text("Day").tag(0)
                    Text("Night").tag(1)
                    Text("POI US").tag(2)
                    Text("POI Int").tag(3)
                }
                .pickerStyle(.segmented)
                .padding()
                .onChange(of: mode) { _ in loadText() }
                
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack {
                        ForEach(tokens, id: \.self) { token in
                            Button(action: { insertToken(token) }) {
                                Text(token)
                                    .font(.system(size: 12, weight: .medium))
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 6)
                                    .background(Color.blue.opacity(0.1))
                                    .cornerRadius(20)
                            }
                        }
                    }
                    .padding(.horizontal)
                }
                
                TextEditor(text: $text)
                    .font(.system(size: 14, design: .monospaced))
                    .padding(8)
                    .background(Color.white.opacity(0.05))
                    .cornerRadius(12)
                    .padding()
                    .onChange(of: text) { _ in saveText() }
                
                Spacer()
                
                Button(action: { resetToDefault() }) {
                    Text("Reset to Default")
                        .foregroundColor(.red)
                        .font(.subheadline)
                }
                .padding(.bottom)
            }
            .navigationTitle("Prompt Editor")
            .onAppear { loadText() }
        }
    }
    
    func loadText() {
        switch mode {
        case 0: text = settings.currentProfile.promptDay
        case 1: text = settings.currentProfile.promptNight
        case 2: text = settings.currentProfile.promptPOIDomestic
        case 3: text = settings.currentProfile.promptPOIIntl
        default: break
        }
    }
    
    func saveText() {
        switch mode {
        case 0: settings.currentProfile.promptDay = text
        case 1: settings.currentProfile.promptNight = text
        case 2: settings.currentProfile.promptPOIDomestic = text
        case 3: settings.currentProfile.promptPOIIntl = text
        default: break
        }
        settings.save()
    }
    
    func insertToken(_ token: String) {
        text += token
    }
    
    func resetToDefault() {
        switch mode {
        case 0: text = SettingsManager.DEFAULT_DAY_STR
        case 1: text = SettingsManager.DEFAULT_NIGHT_STR
        case 2: text = SettingsManager.DEFAULT_POI_DOMESTIC_STR
        case 3: text = SettingsManager.DEFAULT_POI_INTL_STR
        default: break
        }
        saveText()
    }
}
