import SwiftUI

struct ProjectColorDot: View {
    let color: String?
    var size: CGFloat = 12
    
    var body: some View {
        Circle()
            .fill(colorValue)
            .frame(width: size, height: size)
    }
    
    private var colorValue: Color {
        if let hex = color {
            return Color(hex: hex)
        }
        return .gray
    }
}

struct ProjectColorBadge: View {
    let color: String?
    let name: String
    
    var body: some View {
        HStack(spacing: 8) {
            ProjectColorDot(color: color, size: 10)
            Text(name)
                .font(.subheadline)
                .foregroundStyle(.primary)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(Color(.systemGray6))
        .cornerRadius(8)
    }
}
