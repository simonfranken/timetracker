import Foundation

enum APIEndpoint {
    // Auth
    static let login = "/auth/login"
    static let callback = "/auth/callback"
    static let token = "/auth/token"
    static let logout = "/auth/logout"
    static let me = "/auth/me"
    
    // Clients
    static let clients = "/clients"
    static func client(id: String) -> String { "/clients/\(id)" }
    
    // Projects
    static let projects = "/projects"
    static func project(id: String) -> String { "/projects/\(id)" }
    
    // Time Entries
    static let timeEntries = "/time-entries"
    static let timeEntriesStatistics = "/time-entries/statistics"
    static func timeEntry(id: String) -> String { "/time-entries/\(id)" }
    
    // Timer
    static let timer = "/timer"
    static let timerStart = "/timer/start"
    static let timerStop = "/timer/stop"

    // Client Targets
    static let clientTargets = "/client-targets"
    static func clientTarget(id: String) -> String { "/client-targets/\(id)" }
    static func clientTargetCorrections(targetId: String) -> String { "/client-targets/\(targetId)/corrections" }
    static func clientTargetCorrection(targetId: String, correctionId: String) -> String {
        "/client-targets/\(targetId)/corrections/\(correctionId)"
    }
}

struct APIEndpoints {
    static func url(for endpoint: String) -> URL {
        // Use URL(string:relativeTo:) rather than appendingPathComponent so that
        // leading slashes in endpoint strings are handled correctly and don't
        // accidentally replace or duplicate the base URL path.
        let base = AppConfig.apiBaseURL.absoluteString.hasSuffix("/")
            ? AppConfig.apiBaseURL
            : URL(string: AppConfig.apiBaseURL.absoluteString + "/")!
        let relative = endpoint.hasPrefix("/") ? String(endpoint.dropFirst()) : endpoint
        return URL(string: relative, relativeTo: base)!.absoluteURL
    }
}
