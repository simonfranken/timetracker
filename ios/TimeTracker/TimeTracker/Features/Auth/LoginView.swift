import SwiftUI
import AuthenticationServices

struct LoginView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            
            Image(systemName: "timer")
                .font(.system(size: 64))
                .foregroundStyle(Color.accentColor)
            
            Text("TimeTracker")
                .font(.largeTitle)
                .fontWeight(.bold)
            
            Text("Track your time spent on projects")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            
            Spacer()
            
            if let error = errorMessage {
                Text(error)
                    .font(.subheadline)
                    .foregroundStyle(.red)
                    .padding(.horizontal)
            }
            
            Button {
                login()
            } label: {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        .frame(maxWidth: .infinity)
                } else {
                    Text("Sign In")
                        .frame(maxWidth: .infinity)
                }
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .disabled(isLoading)
            .padding(.horizontal, 40)
            
            Spacer()
                .frame(height: 40)
        }
        .padding()
        .onReceive(NotificationCenter.default.publisher(for: .authCallbackReceived)) { notification in
            handleAuthCallback(notification.userInfo)
        }
        .onReceive(NotificationCenter.default.publisher(for: .authError)) { notification in
            if let authError = notification.userInfo?["error"] as? AuthError {
                isLoading = false
                errorMessage = authError.errorDescription
            }
        }
    }
    
    private func login() {
        isLoading = true
        errorMessage = nil
        
        Task {
            let authService = AuthService.shared
            await authService.login(presentationAnchor: nil)
        }
    }
    
    private func handleAuthCallback(_ userInfo: [AnyHashable: Any]?) {
        Task {
            await authManager.checkAuthState()
            await MainActor.run {
                isLoading = false
            }
        }
    }
}
