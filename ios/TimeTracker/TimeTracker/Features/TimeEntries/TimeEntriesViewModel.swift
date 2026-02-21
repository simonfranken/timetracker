import Foundation
import SwiftUI

// MARK: - Active Filters (UI state)

struct TimeEntryActiveFilters: Equatable {
    var startDate: Date?
    var endDate: Date?
    var projectId: String?
    var projectName: String?
    var clientId: String?
    var clientName: String?

    var isEmpty: Bool {
        startDate == nil && endDate == nil && projectId == nil && clientId == nil
    }
}

// MARK: - ViewModel

@MainActor
final class TimeEntriesViewModel: ObservableObject {
    // All loaded entries (flat list, accumulated across pages)
    @Published var entries: [TimeEntry] = []
    @Published var pagination: Pagination?
    @Published var isLoading = false
    @Published var isLoadingMore = false
    @Published var error: String?

    // Active filters driving the current fetch
    @Published var activeFilters = TimeEntryActiveFilters()

    // Projects and clients needed for filter sheet pickers
    @Published var projects: [Project] = []
    @Published var clients: [Client] = []

    private let apiClient = APIClient()

    // MARK: - Fetch

    func loadEntries(resetPage: Bool = true) async {
        if resetPage { entries = [] }
        isLoading = true
        error = nil

        do {
            let response: TimeEntryListResponse = try await apiClient.request(
                endpoint: APIEndpoint.timeEntries,
                queryItems: buildQueryItems(page: 1),
                authenticated: true
            )
            entries = response.entries
            pagination = response.pagination
            isLoading = false
        } catch {
            isLoading = false
            self.error = error.localizedDescription
        }
    }

    func loadMoreIfNeeded(currentEntry entry: TimeEntry) async {
        guard let pagination, !isLoadingMore,
              pagination.page < pagination.totalPages else { return }
        // Trigger when the last entry in the list becomes visible
        guard entries.last?.id == entry.id else { return }

        isLoadingMore = true
        let nextPage = pagination.page + 1

        do {
            let response: TimeEntryListResponse = try await apiClient.request(
                endpoint: APIEndpoint.timeEntries,
                queryItems: buildQueryItems(page: nextPage),
                authenticated: true
            )
            entries.append(contentsOf: response.entries)
            self.pagination = response.pagination
        } catch {
            self.error = error.localizedDescription
        }
        isLoadingMore = false
    }

    func deleteEntry(_ entry: TimeEntry) async {
        do {
            try await apiClient.requestVoid(
                endpoint: APIEndpoint.timeEntry(id: entry.id),
                method: .delete,
                authenticated: true
            )
            entries.removeAll { $0.id == entry.id }
        } catch {
            self.error = error.localizedDescription
        }
    }

    // MARK: - Supporting data for filter sheet

    func loadFilterSupportData() async {
        async let fetchProjects: [Project] = apiClient.request(
            endpoint: APIEndpoint.projects,
            authenticated: true
        )
        async let fetchClients: [Client] = apiClient.request(
            endpoint: APIEndpoint.clients,
            authenticated: true
        )
        projects = (try? await fetchProjects) ?? []
        clients = (try? await fetchClients) ?? []
    }

    // MARK: - Entries grouped by calendar day

    var entriesByDay: [(date: Date, entries: [TimeEntry])] {
        let calendar = Calendar.current
        let grouped = Dictionary(grouping: entries) { entry -> Date in
            guard let d = Date.fromISO8601(entry.startTime) else { return Date() }
            return calendar.startOfDay(for: d)
        }
        return grouped
            .sorted { $0.key > $1.key }
            .map { (date: $0.key, entries: $0.value.sorted {
                (Date.fromISO8601($0.startTime) ?? Date()) > (Date.fromISO8601($1.startTime) ?? Date())
            }) }
    }

    /// All calendar days that have at least one entry (for dot decorations)
    var daysWithEntries: Set<Date> {
        let calendar = Calendar.current
        return Set(entries.compactMap { entry in
            guard let d = Date.fromISO8601(entry.startTime) else { return nil }
            return calendar.startOfDay(for: d)
        })
    }

    /// Entries for a specific calendar day
    func entries(for day: Date) -> [TimeEntry] {
        let calendar = Calendar.current
        return entries.filter { entry in
            guard let d = Date.fromISO8601(entry.startTime) else { return false }
            return calendar.isDate(d, inSameDayAs: day)
        }.sorted {
            (Date.fromISO8601($0.startTime) ?? Date()) < (Date.fromISO8601($1.startTime) ?? Date())
        }
    }

    // MARK: - Helpers

    private func buildQueryItems(page: Int) -> [URLQueryItem] {
        var items: [URLQueryItem] = [
            URLQueryItem(name: "page", value: "\(page)"),
            URLQueryItem(name: "limit", value: "100")
        ]
        if let start = activeFilters.startDate {
            items.append(URLQueryItem(name: "startDate", value: start.iso8601String))
        }
        if let end = activeFilters.endDate {
            // Push to end-of-day so the full day is included
            let endOfDay = Calendar.current.date(bySettingHour: 23, minute: 59, second: 59, of: end) ?? end
            items.append(URLQueryItem(name: "endDate", value: endOfDay.iso8601String))
        }
        if let pid = activeFilters.projectId {
            items.append(URLQueryItem(name: "projectId", value: pid))
        }
        if let cid = activeFilters.clientId {
            items.append(URLQueryItem(name: "clientId", value: cid))
        }
        return items
    }
}
