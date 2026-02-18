import Foundation
import AuthenticationServices
import CryptoKit

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
        
        let callbackScheme = URL(string: AppConfig.authCallbackURL)?.scheme ?? "timetracker"
        
        // Use a shared (non-ephemeral) session so the backend session cookie set during
        // /auth/login is automatically included in the /auth/token POST.
        let webAuthSession = ASWebAuthenticationSession(
            url: authURL,
            callbackURLScheme: callbackScheme
        ) { [weak self] callbackURL, error in
            if let error = error {
                let authError: AuthError
                if (error as? ASWebAuthenticationSessionError)?.code == .canceledLogin {
                    authError = .cancelled
                } else {
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
        // prefersEphemeralWebBrowserSession = false ensures the session cookie from
        // /auth/login is retained and sent with the subsequent /auth/token request.
        webAuthSession.prefersEphemeralWebBrowserSession = false
        
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
                let tokenResponse = try await exchangeCodeForTokens(
                    code: code,
                    state: state,
                    redirectUri: AppConfig.authCallbackURL
                )
                
                await AuthManager.shared.handleTokenResponse(tokenResponse)
                
                DispatchQueue.main.async {
                    NotificationCenter.default.post(name: .authCallbackReceived, object: nil)
                }
            } catch {
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
        
        // code_verifier is intentionally omitted — the backend uses its own verifier
        // that was generated during /auth/login and stored in the server-side session.
        // state is sent so the backend can look up and validate the original session.
        let body: [String: Any] = [
            "code": code,
            "state": state,
            "code_verifier": "", // kept for API compatibility; backend ignores it
            "redirect_uri": redirectUri
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw AuthError.failed("Invalid response")
        }
        
        guard httpResponse.statusCode == 200 else {
            if let errorJson = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let errorMessage = errorJson["error"] as? String {
                throw AuthError.failed(errorMessage)
            }
            throw AuthError.failed("Token exchange failed with status \(httpResponse.statusCode)")
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
    let idToken: String
    let tokenType: String
    let expiresIn: Int?
    let user: User
    
    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case idToken = "id_token"
        case tokenType = "token_type"
        case expiresIn = "expires_in"
        case user
    }
}
