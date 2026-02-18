import Foundation

struct TimeStatistics: Codable, Equatable {
    let totalSeconds: Int
    let entryCount: Int
    let byProject: [ProjectStatistics]
    let byClient: [ClientStatistics]
    let filters: StatisticsFilters
}

struct ProjectStatistics: Codable, Identifiable, Equatable {
    let projectId: String
    let projectName: String
    let projectColor: String?
    let totalSeconds: Int
    let entryCount: Int
    
    var id: String { projectId }
}

struct ClientStatistics: Codable, Identifiable, Equatable {
    let clientId: String
    let clientName: String
    let totalSeconds: Int
    let entryCount: Int
    
    var id: String { clientId }
}

struct StatisticsFilters: Codable, Equatable {
    let startDate: String?
    let endDate: String?
    let projectId: String?
    let clientId: String?
}

struct StatisticsFiltersInput: Codable {
    let startDate: String?
    let endDate: String?
    let projectId: String?
    let clientId: String?
    
    init(
        startDate: Date? = nil,
        endDate: Date? = nil,
        projectId: String? = nil,
        clientId: String? = nil
    ) {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withFullDate]
        
        self.startDate = startDate.map { formatter.string(from: $0) }
        self.endDate = endDate.map { formatter.string(from: $0) }
        self.projectId = projectId
        self.clientId = clientId
    }
}
