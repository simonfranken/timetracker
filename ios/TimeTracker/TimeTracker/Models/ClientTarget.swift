import Foundation

// MARK: - Client Target

struct ClientTarget: Codable, Identifiable, Equatable {
    let id: String
    let clientId: String
    let clientName: String
    let userId: String
    let weeklyHours: Double
    let startDate: String            // "YYYY-MM-DD"
    let createdAt: String
    let updatedAt: String
    let corrections: [BalanceCorrection]

    // Computed balance fields returned by the API
    let totalBalanceSeconds: Int
    let currentWeekTrackedSeconds: Int
    let currentWeekTargetSeconds: Int
    let weeks: [WeekBalance]
}

// MARK: - Week Balance

struct WeekBalance: Codable, Identifiable, Equatable {
    var id: String { weekStart }
    let weekStart: String            // "YYYY-MM-DD"
    let weekEnd: String
    let trackedSeconds: Int
    let targetSeconds: Int
    let correctionHours: Double
    let balanceSeconds: Int
}

// MARK: - Balance Correction

struct BalanceCorrection: Codable, Identifiable, Equatable {
    let id: String
    let date: String                 // "YYYY-MM-DD"
    let hours: Double
    let description: String?
    let createdAt: String
}

// MARK: - Input Types

struct CreateClientTargetInput: Codable {
    let clientId: String
    let weeklyHours: Double
    let startDate: String            // "YYYY-MM-DD", must be a Monday
}

struct UpdateClientTargetInput: Codable {
    let weeklyHours: Double?
    let startDate: String?
}

struct CreateBalanceCorrectionInput: Codable {
    let date: String                 // "YYYY-MM-DD"
    let hours: Double
    let description: String?
}
