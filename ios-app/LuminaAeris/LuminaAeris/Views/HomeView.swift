import SwiftUI

struct HomeView: View {
    @StateObject private var settings = SettingsManager.shared
    @StateObject private var generator = GenerationManager.shared
    @StateObject private var location = LocationManager.shared
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.black.ignoresSafeArea()
                
                VStack(spacing: 20) {
                    // Header
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Lumina Aeris")
                                .font(.system(size: 28, weight: .bold))
                            Text("V1.0.0 NATIVE")
                                .font(.system(size: 10, weight: .bold))
                                .opacity(0.4)
                        }
                        Spacer()
                    }
                    .padding(.horizontal)
                    
                    // Status Bar
                    HStack {
                        Text(generator.statusMessage)
                        Spacer()
                        Text("PROFILE: \(settings.currentProfile.name.uppercased())")
                            .foregroundColor(settings.currentProfile.name == "default" ? .gray : .blue)
                        Spacer()
                        Text(locationString)
                    }
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.gray)
                    .padding(.horizontal)
                    
                    // Image Preview
                    ZStack {
                        RoundedRectangle(cornerRadius: 24)
                            .fill(Color.white.opacity(0.05))
                            .overlay(
                                Group {
                                    if let url = generator.lastGeneratedImageURL {
                                        AsyncImage(url: url) { phase in
                                            switch phase {
                                            case .success(let image):
                                                image.resizable().aspectRatio(contentMode: .fill)
                                            case .failure:
                                                Image(systemName: "photo").font(.largeTitle).opacity(0.2)
                                            default:
                                                ProgressView().tint(.white)
                                            }
                                        }
                                    } else {
                                        Text("✨").font(.system(size: 48)).opacity(0.2)
                                    }
                                }
                            )
                            .clipShape(RoundedRectangle(cornerRadius: 24))
                            .shadow(color: Color.blue.opacity(0.1), radius: 20)
                        
                        if generator.isGenerating {
                            FireflyEffect()
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .aspectRatio(1290.0 / 2796.0, contentMode: .fit)
                    .padding(.horizontal)
                    
                    // Action Button
                    Button(action: {
                        Task {
                            let lat = location.lastLocation?.coordinate.latitude ?? 45.52
                            let lon = location.lastLocation?.coordinate.longitude ?? -122.67
                            await generator.generateWallpaper(lat: lat, lon: lon)
                        }
                    }) {
                        Text(generator.isGenerating ? "Dreaming..." : "Generate Wallpaper")
                            .font(.headline)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 56)
                            .background(Color.blue)
                            .cornerRadius(16)
                    }
                    .disabled(generator.isGenerating)
                    .padding(.horizontal)
                    
                    if generator.lastGeneratedImageURL != nil {
                        Button(action: { saveImage() }) {
                            Text("Save to Photos")
                                .font(.subheadline)
                                .foregroundColor(.blue)
                        }
                    }
                    
                    Spacer()
                }
                .padding(.top)
            }
            .navigationBarHidden(true)
        }
    }
    
    var locationString: some View {
        let lat = location.lastLocation?.coordinate.latitude ?? 45.52
        return Text("GPS: \(String(format: "%.2f", lat))")
    }
    
    func saveImage() {
        guard let url = generator.lastGeneratedImageURL else { return }
        // Simple download and save to photos logic would go here
    }
}

// MARK: - Subviews
struct FireflyEffect: View {
    @State private var animate = false
    
    var body: some View {
        TimelineView(.animation) { timeline in
            Canvas { context, size in
                for i in 0..<30 {
                    let phase = Double(i) * 0.5
                    let time = timeline.date.timeIntervalSinceReferenceDate
                    let alpha = pow((sin(time * 2.0 + phase) + 1.0) / 2.0, 8.0)
                    
                    let x = (sin(time * 0.5 + phase) + 1.0) / 2.0 * size.width
                    let y = (cos(time * 0.3 + phase) + 1.0) / 2.0 * size.height
                    
                    context.opacity = alpha
                    context.fill(Path(ellipseIn: CGRect(x: x, y: y, width: 3, height: 3)), with: .color(.white))
                }
            }
        }
    }
}
