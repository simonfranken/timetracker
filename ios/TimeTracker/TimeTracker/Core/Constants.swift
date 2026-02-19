import Foundation

enum AppConstants {
    static let appGroupIdentifier = "group.com.timetracker.app"
    static let authCallbackScheme = "timetracker"
    static let authCallbackHost = "oauth"
    
    enum UserDefaultsKeys {
        static let hasSeenOnboarding = "hasSeenOnboarding"
        static let cachedTimer = "cachedTimer"
        static let lastSyncDate = "lastSyncDate"
    }
    
    enum KeychainKeys {
        static let accessToken = "accessToken"
    }
}

struct AppConfig {
    static var apiBaseURL: URL {
        if let url = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String,
           let baseURL = URL(string: url) {
            return baseURL
        }
        return URL(string: "http://localhost:3001")!
    }
    
    static var authCallbackURL: String {
        "\(AppConstants.authCallbackScheme)://\(AppConstants.authCallbackHost)/callback"
    }
}
