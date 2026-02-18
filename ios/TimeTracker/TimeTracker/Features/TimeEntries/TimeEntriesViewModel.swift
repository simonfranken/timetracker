import Foundation
import SwiftUI

@MainActor
final class TimeEntriesViewModel: ObservableObject {
    @Published var entries: [TimeEntry] = []
    @Published var pagination: Pagination?
    @Published var isLoading = false
    @Published var error: String?
    @Published var filters = TimeEntryFilters()
    
    private let apiClient = APIClient()
    
    func loadEntries() async {
        isLoading = true
        error = nil
        
        do {
            var queryItems: [URLQueryItem] = []
            
            if let startDate = filters.startDate {
                queryItems.append(URLQueryItem(name: "startDate", value: startDate))
            }
            if let endDate = filters.endDate {
                queryItems.append(URLQueryItem(name: "endDate", value: endDate))
            }
            if let projectId = filters.projectId {
                queryItems.append(URLQueryItem(name: "projectId", value: projectId))
            }
            if let page = filters.page {
                queryItems.append(URLQueryItem(name: "page", value: String(page)))
            }
            if let limit = filters.limit {
                queryItems.append(URLQueryItem(name: "limit", value: String(limit)))
            }
            
            let response: TimeEntryListResponse = try await apiClient.request(
                endpoint: APIEndpoint.timeEntries,
                queryItems: queryItems.isEmpty ? nil : queryItems,
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
    
    func nextPage() async {
        guard let pagination = pagination,
              pagination.page < pagination.totalPages else { return }
        
        filters.page = pagination.page + 1
        await loadEntries()
    }
    
    func previousPage() async {
        guard let pagination = pagination,
              pagination.page > 1 else { return }
        
        filters.page = pagination.page - 1
        await loadEntries()
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
}
