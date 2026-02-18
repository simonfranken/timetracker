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
        
        let codeVerifier = generateCodeVerifier()
        let codeChallenge = generateCodeChallenge(from: codeVerifier)
        
        let session = UUID().uuidString
        UserDefaults.standard.set(codeVerifier, forKey: "oidc_code_verifier_\(session)")
        
        var components = URLComponents(
            url: AppConfig.apiBaseURL.appendingPathComponent(APIEndpoint.login),
            resolvingAgainstBaseURL: true
        )
        
        components?.queryItems = [
            URLQueryItem(name: "session", value: session),
            URLQueryItem(name: "code_challenge", value: codeChallenge),
            URLQueryItem(name: "code_challenge_method", value: "S256"),
            URLQueryItem(name: "redirect_uri", value: AppConfig.authCallbackURL)
        ]
        
        guard let authURL = components?.url else {
            throw AuthError.invalidURL
        }
        
        let callbackScheme = URL(string: AppConfig.authCallbackURL)?.scheme ?? "timetracker"
        
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
            
            self?.handleCallback(url: callbackURL, session: session)
        }
        
        webAuthSession.presentationContextProvider = self
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
    
    private func handleCallback(url: URL, session: String) {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: true),
              let code = components.queryItems?.first(where: { $0.name == "code" })?.value else {
            return
        }
        
        let codeVerifier = UserDefaults.standard.string(forKey: "oidc_code_verifier_\(session)")
        
        DispatchQueue.main.async {
            NotificationCenter.default.post(
                name: .authCallbackReceived,
                object: nil,
                userInfo: [
                    "code": code,
                    "codeVerifier": codeVerifier ?? ""
                ]
            )
        }
    }
    
    private func generateCodeVerifier() -> String {
        var buffer = [UInt8](repeating: 0, count: 32)
        _ = SecRandomCopyBytes(kSecRandomDefault, buffer.count, &buffer)
        return Data(buffer).base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
    
    private func generateCodeChallenge(from verifier: String) -> String {
        guard let data = verifier.data(using: .ascii) else { return "" }
        let hash = SHA256.hash(data: data)
        return Data(hash).base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
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
