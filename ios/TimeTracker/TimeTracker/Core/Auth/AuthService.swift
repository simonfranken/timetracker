import Foundation
import AuthenticationServices
import CryptoKit
import OSLog

private let logger = Logger(subsystem: "com.timetracker.app", category: "AuthService")

final class AuthService: NSObject {
    static let shared = AuthService()
    
    private var authSession: ASWebAuthenticationSession?
    private var presentationAnchor: ASPresentationAnchor?
    
    private override init() {
        super.init()
    }
    
    func login(presentationAnchor: ASPresentationAnchor?) async throws {
        self.presentationAnchor = presentationAnchor
        
        // Only the redirect_uri is needed — the backend owns PKCE generation.
        var components = URLComponents(
            url: AppConfig.apiBaseURL.appendingPathComponent(APIEndpoint.login),
            resolvingAgainstBaseURL: true
        )
        
        components?.queryItems = [
            URLQueryItem(name: "redirect_uri", value: AppConfig.authCallbackURL)
        ]
        
        guard let authURL = components?.url else {
            throw AuthError.invalidURL
        }
        
        logger.info("Starting login — auth URL: \(authURL.absoluteString)")
        logger.info("Callback URL scheme: \(AppConfig.authCallbackURL)")
        
        let callbackScheme = URL(string: AppConfig.authCallbackURL)?.scheme ?? "timetracker"
        
        // Use an ephemeral session — we only need the redirect URL back with the
        // authorization code; no cookies or shared state are needed.
        let webAuthSession = ASWebAuthenticationSession(
            url: authURL,
            callbackURLScheme: callbackScheme
        ) { [weak self] callbackURL, error in
            if let error = error {
                let authError: AuthError
                if (error as? ASWebAuthenticationSessionError)?.code == .canceledLogin {
                    logger.info("Login cancelled by user")
                    authError = .cancelled
                } else {
                    logger.error("ASWebAuthenticationSession error: \(error)")
                    authError = .failed(error.localizedDescription)
                }
                DispatchQueue.main.async {
                    NotificationCenter.default.post(
                        name: .authError,
                        object: nil,
                        userInfo: ["error": authError]
                    )
                }
                return
            }
            
            guard let callbackURL = callbackURL else {
                logger.error("ASWebAuthenticationSession returned nil callbackURL")
                DispatchQueue.main.async {
                    NotificationCenter.default.post(
                        name: .authError,
                        object: nil,
                        userInfo: ["error": AuthError.noCallback]
                    )
                }
                return
            }
            
            self?.handleCallback(url: callbackURL)
        }
        
        webAuthSession.presentationContextProvider = self
        // Ephemeral session: no shared cookies or browsing data with Safari.
        webAuthSession.prefersEphemeralWebBrowserSession = true
        
        self.authSession = webAuthSession
        
        let started = webAuthSession.start()
        if !started {
            DispatchQueue.main.async {
                NotificationCenter.default.post(
                    name: .authError,
                    object: nil,
                    userInfo: ["error": AuthError.failed("Failed to start auth session")]
                )
            }
        }
    }
    
    private func handleCallback(url: URL) {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: true),
              let code = components.queryItems?.first(where: { $0.name == "code" })?.value,
              let state = components.queryItems?.first(where: { $0.name == "state" })?.value
        else {
            logger.error("Callback URL missing code or state: \(url.absoluteString)")
            DispatchQueue.main.async {
                NotificationCenter.default.post(
                    name: .authError,
                    object: nil,
                    userInfo: ["error": AuthError.noCallback]
                )
            }
            return
        }
        
        Task {
            do {
                logger.info("Exchanging code for tokens (state: \(state), redirect_uri: \(AppConfig.authCallbackURL))")
                let tokenResponse = try await exchangeCodeForTokens(
                    code: code,
                    state: state,
                    redirectUri: AppConfig.authCallbackURL
                )
                logger.info("Token exchange succeeded for user: \(tokenResponse.user.id)")
                
                await AuthManager.shared.handleTokenResponse(tokenResponse)
                
                DispatchQueue.main.async {
                    NotificationCenter.default.post(name: .authCallbackReceived, object: nil)
                }
            } catch {
                logger.error("Token exchange failed: \(error)")
                DispatchQueue.main.async {
                    NotificationCenter.default.post(
                        name: .authError,
                        object: nil,
                        userInfo: ["error": AuthError.failed(error.localizedDescription)]
                    )
                }
            }
        }
    }
    
    private func exchangeCodeForTokens(
        code: String,
        state: String,
        redirectUri: String
    ) async throws -> TokenResponse {
        let url = AppConfig.apiBaseURL.appendingPathComponent(APIEndpoint.token)
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // state is sent so the backend can look up the original PKCE session.
        // code_verifier is NOT sent — the backend holds it in the in-memory session.
        let body: [String: Any] = [
            "code": code,
            "state": state,
            "redirect_uri": redirectUri
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw AuthError.failed("Invalid response")
        }
        
        let bodyString = String(data: data, encoding: .utf8) ?? "(non-UTF8 body)"
        logger.debug("POST /auth/token — status \(httpResponse.statusCode), body: \(bodyString)")
        
        guard httpResponse.statusCode == 200 else {
            if let errorJson = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let errorMessage = errorJson["error"] as? String {
                logger.error("POST /auth/token — server error: \(errorMessage)")
                throw AuthError.failed(errorMessage)
            }
            logger.error("POST /auth/token — unexpected status \(httpResponse.statusCode): \(bodyString)")
            throw AuthError.failed("Token exchange failed with status \(httpResponse.statusCode): \(bodyString)")
        }
        
        return try JSONDecoder().decode(TokenResponse.self, from: data)
    }
}

extension AuthService: ASWebAuthenticationPresentationContextProviding {
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        presentationAnchor ?? ASPresentationAnchor()
    }
}

enum AuthError: LocalizedError {
    case invalidURL
    case cancelled
    case noCallback
    case failed(String)
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid authentication URL"
        case .cancelled:
            return "Login was cancelled"
        case .noCallback:
            return "No callback received"
        case .failed(let message):
            return "Authentication failed: \(message)"
        }
    }
}

extension Notification.Name {
    static let authCallbackReceived = Notification.Name("authCallbackReceived")
    static let authError = Notification.Name("authError")
}

struct TokenResponse: Codable {
    let accessToken: String
    let tokenType: String
    let expiresIn: Int?
    let user: User
    
    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case tokenType = "token_type"
        case expiresIn = "expires_in"
        case user
    }
}
