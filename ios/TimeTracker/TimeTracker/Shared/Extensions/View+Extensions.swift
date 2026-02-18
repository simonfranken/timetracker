import SwiftUI

extension View {
    func hideKeyboard() {
        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
    }
    
    @ViewBuilder
    func `if`<Transform: View>(_ condition: Bool, transform: (Self) -> Transform) -> some View {
        if condition {
            transform(self)
        } else {
            self
        }
    }
}

struct FormFieldStyle: ViewModifier {
    var isEditing: Bool = false
    
    func body(content: Content) -> some View {
        content
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(Color(.systemGray6))
            .cornerRadius(10)
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(isEditing ? Color.accentColor : Color.clear, lineWidth: 2)
            )
    }
}

extension View {
    func formFieldStyle(isEditing: Bool = false) -> some View {
        modifier(FormFieldStyle(isEditing: isEditing))
    }
}
