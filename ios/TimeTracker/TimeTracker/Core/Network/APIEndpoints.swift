import Foundation

enum APIEndpoint {
    // Auth
    static let login = "/auth/login"
    static let callback = "/auth/callback"
    static let token = "/auth/token"
    static let logout = "/auth/logout"
    static let me = "/auth/me"
    
    // Clients
    static let clients = "/api/clients"
    static func client(id: String) -> String { "/api/clients/\(id)" }
    
    // Projects
    static let projects = "/api/projects"
    static func project(id: String) -> String { "/api/projects/\(id)" }
    
    // Time Entries
    static let timeEntries = "/api/time-entries"
    static let timeEntriesStatistics = "/api/time-entries/statistics"
    static func timeEntry(id: String) -> String { "/api/time-entries/\(id)" }
    
    // Timer
    static let timer = "/api/timer"
    static let timerStart = "/api/timer/start"
    static let timerStop = "/api/timer/stop"
}

struct APIEndpoints {
    static func url(for endpoint: String) -> URL {
        AppConfig.apiBaseURL.appendingPathComponent(endpoint)
    }
}
