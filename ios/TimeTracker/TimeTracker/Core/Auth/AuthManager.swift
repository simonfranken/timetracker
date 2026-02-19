import Foundation
import KeychainAccess

@MainActor
final class AuthManager: ObservableObject {
    static let shared = AuthManager()
    
    @Published private(set) var isAuthenticated = false
    @Published private(set) var currentUser: User?
    
    private let keychain: Keychain
    private let apiClient = APIClient()
    
    /// The backend-issued JWT. Sent as `Authorization: Bearer <token>` on every API call.
    var accessToken: String? {
        get { try? keychain.get(AppConstants.KeychainKeys.accessToken) }
        set {
            if let value = newValue {
                try? keychain.set(value, key: AppConstants.KeychainKeys.accessToken)
            } else {
                try? keychain.remove(AppConstants.KeychainKeys.accessToken)
            }
        }
    }
    
    private init() {
        self.keychain = Keychain(service: "com.timetracker.app")
            .accessibility(.whenUnlockedThisDeviceOnly)
    }
    
    func checkAuthState() async {
        guard accessToken != nil else {
            isAuthenticated = false
            return
        }
        
        do {
            let user: User = try await apiClient.request(
                endpoint: APIEndpoint.me,
                authenticated: true
            )
            currentUser = user
            isAuthenticated = true
        } catch {
            clearAuth()
        }
    }
    
    func fetchCurrentUser() async throws -> User {
        let user: User = try await apiClient.request(
            endpoint: APIEndpoint.me,
            authenticated: true
        )
        currentUser = user
        return user
    }
    
    func logout() async throws {
        // Best-effort server-side logout; the backend JWT is stateless so the
        // real security comes from clearing the local token.
        try? await apiClient.requestVoid(
            endpoint: APIEndpoint.logout,
            method: .post,
            authenticated: true
        )
        clearAuth()
    }
    
    func clearAuth() {
        accessToken = nil
        currentUser = nil
        isAuthenticated = false
    }
    
    func handleTokenResponse(_ response: TokenResponse) async {
        accessToken = response.accessToken
        currentUser = response.user
        isAuthenticated = true
    }
    
    var loginURL: URL {
        APIEndpoints.url(for: APIEndpoint.login)
    }
    
    var callbackURL: String {
        AppConfig.authCallbackURL
    }
}
