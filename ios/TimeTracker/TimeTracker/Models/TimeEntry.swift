import Foundation

struct TimeEntry: Codable, Identifiable, Equatable {
    let id: String
    let startTime: String
    let endTime: String
    let description: String?
    let projectId: String
    let project: ProjectReference
    let createdAt: String
    let updatedAt: String
    
    var duration: TimeInterval {
        guard let start = ISO8601DateFormatter().date(from: startTime),
              let end = ISO8601DateFormatter().date(from: endTime) else {
            return 0
        }
        return end.timeIntervalSince(start)
    }
}

struct ProjectReference: Codable, Equatable {
    let id: String
    let name: String
    let color: String?
    let client: ClientReference
}

struct TimeEntryListResponse: Codable {
    let entries: [TimeEntry]
    let pagination: Pagination
}

struct Pagination: Codable, Equatable {
    let page: Int
    let limit: Int
    let total: Int
    let totalPages: Int
}

struct TimeEntryFilters: Codable {
    var startDate: String?
    var endDate: String?
    var projectId: String?
    var clientId: String?
    var page: Int?
    var limit: Int?
    
    init(
        startDate: Date? = nil,
        endDate: Date? = nil,
        projectId: String? = nil,
        clientId: String? = nil,
        page: Int = 1,
        limit: Int = 20
    ) {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withFullDate]
        
        self.startDate = startDate.map { formatter.string(from: $0) }
        self.endDate = endDate.map { formatter.string(from: $0) }
        self.projectId = projectId
        self.clientId = clientId
        self.page = page
        self.limit = limit
    }
}

struct CreateTimeEntryInput: Codable {
    let startTime: String
    let endTime: String
    let description: String?
    let projectId: String
    
    init(startTime: Date, endTime: Date, description: String? = nil, projectId: String) {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        
        self.startTime = formatter.string(from: startTime)
        self.endTime = formatter.string(from: endTime)
        self.description = description
        self.projectId = projectId
    }
}

struct UpdateTimeEntryInput: Codable {
    let startTime: String?
    let endTime: String?
    let description: String?
    let projectId: String?
}
