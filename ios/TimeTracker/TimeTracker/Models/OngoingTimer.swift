import Foundation

struct OngoingTimer: Codable, Identifiable, Equatable {
    let id: String
    let startTime: String
    let projectId: String?
    let project: ProjectReference?
    let createdAt: String
    let updatedAt: String
    
    var elapsedTime: TimeInterval {
        guard let start = Date.fromISO8601(startTime) else { return 0 }
        return Date().timeIntervalSince(start)
    }
}

struct StartTimerInput: Codable {
    let projectId: String?
    
    init(projectId: String? = nil) {
        self.projectId = projectId
    }
}

struct UpdateTimerInput: Codable {
    let projectId: String
    
    init(projectId: String) {
        self.projectId = projectId
    }
}

struct StopTimerInput: Codable {
    let projectId: String
    
    init(projectId: String) {
        self.projectId = projectId
    }
}
