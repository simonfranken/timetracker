import Foundation
import KeychainAccess
import OSLog

private let logger = Logger(subsystem: "com.timetracker.app", category: "AuthManager")

@MainActor
final class AuthManager: ObservableObject {
    static let shared = AuthManager()
    
    @Published private(set) var isAuthenticated = false
    @Published private(set) var currentUser: User?
    
    private let keychain: Keychain
    private let apiClient = APIClient()
    
    /// In-memory cache so the token is always available within the current session,
    /// even if the keychain write fails (e.g. missing entitlement on simulator).
    private var _accessToken: String?
    
    /// The backend-issued JWT. Sent as `Authorization: Bearer <token>` on every API call.
    var accessToken: String? {
        get {
            // Return the in-memory value first; fall back to keychain for persistence
            // across app launches.
            if let cached = _accessToken { return cached }
            let stored = try? keychain.get(AppConstants.KeychainKeys.accessToken)
            _accessToken = stored
            return stored
        }
        set {
            _accessToken = newValue
            if let value = newValue {
                do {
                    try keychain.set(value, key: AppConstants.KeychainKeys.accessToken)
                } catch {
                    logger.warning("Keychain write failed (token still available in-memory): \(error)")
                }
            } else {
                do {
                    try keychain.remove(AppConstants.KeychainKeys.accessToken)
                } catch {
                    logger.warning("Keychain remove failed: \(error)")
                }
            }
        }
    }
    
    private init() {
        self.keychain = Keychain(service: "com.timetracker.app")
            .accessibility(.whenUnlockedThisDeviceOnly)
    }
    
    func checkAuthState() async {
        guard let token = accessToken else {
            logger.info("checkAuthState — no token in keychain, not authenticated")
            isAuthenticated = false
            return
        }
        logger.info("checkAuthState — token found (first 20 chars: \(token.prefix(20))…), calling /auth/me")
        
        do {
            let user: User = try await apiClient.request(
                endpoint: APIEndpoint.me,
                authenticated: true
            )
            logger.info("checkAuthState — /auth/me OK, user: \(user.id)")
            currentUser = user
            isAuthenticated = true
        } catch {
            logger.error("checkAuthState — /auth/me failed: \(error.localizedDescription) — clearing auth")
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
        logger.info("clearAuth — wiping token and user")
        _accessToken = nil
        accessToken = nil
        currentUser = nil
        isAuthenticated = false
    }
    
    func handleTokenResponse(_ response: TokenResponse) async {
        logger.info("handleTokenResponse — storing JWT for user \(response.user.id)")
        accessToken = response.accessToken
        currentUser = response.user
        isAuthenticated = true
        logger.info("handleTokenResponse — isAuthenticated = true, token stored: \(self.accessToken != nil)")
    }
    
    var loginURL: URL {
        APIEndpoints.url(for: APIEndpoint.login)
    }
    
    var callbackURL: String {
        AppConfig.authCallbackURL
    }
}
