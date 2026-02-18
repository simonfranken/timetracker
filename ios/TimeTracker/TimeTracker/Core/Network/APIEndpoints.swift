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
}

struct APIEndpoints {
    static func url(for endpoint: String) -> URL {
        AppConfig.apiBaseURL.appendingPathComponent(endpoint)
    }
}
