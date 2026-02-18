import SwiftUI

struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    var color: Color = .accentColor
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .foregroundStyle(color)
                Text(title)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            
            Text(value)
                .font(.title2)
                .fontWeight(.semibold)
                .foregroundStyle(.primary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

extension TimeInterval {
    var formattedDuration: String {
        let hours = Int(self) / 3600
        let minutes = (Int(self) % 3600) / 60
        let seconds = Int(self) % 60
        
        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, seconds)
        } else {
            return String(format: "%02d:%02d", minutes, seconds)
        }
    }
    
    var formattedHours: String {
        let hours = self / 3600
        return String(format: "%.1fh", hours)
    }
}
