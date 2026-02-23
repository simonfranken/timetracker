import Foundation
import SwiftUI

@MainActor
final class DashboardViewModel: ObservableObject {
    @Published var activeTimer: OngoingTimer?
    @Published var statistics: TimeStatistics?
    @Published var recentEntries: [TimeEntry] = []
    @Published var clientTargets: [ClientTarget] = []
    @Published var isLoading = false
    @Published var error: String?
    @Published var elapsedTime: TimeInterval = 0

    private let apiClient = APIClient()
    private let database = DatabaseService.shared
    private var timerTask: Task<Void, Never>?

    init() {
        startElapsedTimeUpdater()
    }

    deinit {
        timerTask?.cancel()
    }

    func loadData() async {
        isLoading = true
        error = nil

        do {
            // Fetch active timer
            activeTimer = try await apiClient.request(
                endpoint: APIEndpoint.timer,
                authenticated: true
            )

            // Statistics for this week
            let calendar = Calendar.current
            let today = Date()
            let startOfWeek = calendar.date(
                from: calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: today)
            )!
            let endOfWeek = calendar.date(byAdding: .day, value: 6, to: startOfWeek)!

            statistics = try await apiClient.request(
                endpoint: APIEndpoint.timeEntriesStatistics,
                queryItems: [
                    URLQueryItem(name: "startDate", value: startOfWeek.iso8601FullDate),
                    URLQueryItem(name: "endDate", value: endOfWeek.iso8601FullDate)
                ],
                authenticated: true
            )

            // Recent entries (last 5)
            let entriesResponse: TimeEntryListResponse = try await apiClient.request(
                endpoint: APIEndpoint.timeEntries,
                queryItems: [URLQueryItem(name: "limit", value: "5")],
                authenticated: true
            )
            recentEntries = entriesResponse.entries

            // Client targets (for overtime/undertime)
            clientTargets = try await apiClient.request(
                endpoint: APIEndpoint.clientTargets,
                authenticated: true
            )

            if let timer = activeTimer {
                elapsedTime = timer.elapsedTime
            }

            isLoading = false
        } catch {
            isLoading = false
            self.error = error.localizedDescription

            // Fallback to cached timer
            if let cachedTimer = try? await database.getCachedTimer() {
                activeTimer = cachedTimer
                elapsedTime = cachedTimer.elapsedTime
            }
        }
    }

    private func startElapsedTimeUpdater() {
        timerTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 1_000_000_000)
                guard let self = self, self.activeTimer != nil else { continue }
                await MainActor.run {
                    self.elapsedTime = self.activeTimer?.elapsedTime ?? 0
                }
            }
        }
    }
}
