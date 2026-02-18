import Foundation
import Network

@MainActor
final class SyncManager: ObservableObject {
    static let shared = SyncManager()
    
    @Published private(set) var isOnline = true
    @Published private(set) var isSyncing = false
    
    private let monitor = NWPathMonitor()
    private let monitorQueue = DispatchQueue(label: "com.timetracker.networkmonitor")
    private let apiClient = APIClient()
    private let database = DatabaseService.shared
    
    private init() {
        startNetworkMonitoring()
    }
    
    private func startNetworkMonitoring() {
        monitor.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async {
                self?.isOnline = path.status == .satisfied
                if path.status == .satisfied {
                    Task { await self?.syncPendingChanges() }
                }
            }
        }
        monitor.start(queue: monitorQueue)
    }
    
    func syncPendingChanges() async {
        guard isOnline, !isSyncing else { return }
        
        isSyncing = true
        
        do {
            let pending = try await database.fetchPendingSync()
            
            for item in pending {
                do {
                    try await processPendingItem(item)
                    try await database.removePendingSync(id: item.id)
                } catch {
                    print("Failed to sync item \(item.id): \(error)")
                }
            }
        } catch {
            print("Failed to fetch pending sync: \(error)")
        }
        
        isSyncing = false
    }
    
    private func processPendingItem(_ item: (id: String, type: String, action: String, payload: String)) async throws {
        let decoder = JSONDecoder()
        let encoder = JSONEncoder()
        
        switch item.type {
        case "timeEntry":
            let data = item.payload.data(using: .utf8)!
            
            switch item.action {
            case "create":
                let input = try decoder.decode(CreateTimeEntryInput.self, from: data)
                try await apiClient.requestVoid(
                    endpoint: APIEndpoint.timeEntries,
                    method: .post,
                    body: input,
                    authenticated: true
                )
            case "update":
                struct UpdateRequest: Codable {
                    let id: String
                    let input: UpdateTimeEntryInput
                }
                let request = try decoder.decode(UpdateRequest.self, from: data)
                try await apiClient.requestVoid(
                    endpoint: APIEndpoint.timeEntry(id: request.id),
                    method: .put,
                    body: request.input,
                    authenticated: true
                )
            case "delete":
                try await apiClient.requestVoid(
                    endpoint: APIEndpoint.timeEntry(id: item.id),
                    method: .delete,
                    authenticated: true
                )
            default:
                break
            }
        case "client":
            let data = item.payload.data(using: .utf8)!
            
            switch item.action {
            case "create":
                let input = try decoder.decode(CreateClientInput.self, from: data)
                try await apiClient.requestVoid(
                    endpoint: APIEndpoint.clients,
                    method: .post,
                    body: input,
                    authenticated: true
                )
            case "update":
                struct UpdateRequest: Codable {
                    let id: String
                    let input: UpdateClientInput
                }
                let request = try decoder.decode(UpdateRequest.self, from: data)
                try await apiClient.requestVoid(
                    endpoint: APIEndpoint.client(id: request.id),
                    method: .put,
                    body: request.input,
                    authenticated: true
                )
            case "delete":
                try await apiClient.requestVoid(
                    endpoint: APIEndpoint.client(id: item.id),
                    method: .delete,
                    authenticated: true
                )
            default:
                break
            }
        case "project":
            let data = item.payload.data(using: .utf8)!
            
            switch item.action {
            case "create":
                let input = try decoder.decode(CreateProjectInput.self, from: data)
                try await apiClient.requestVoid(
                    endpoint: APIEndpoint.projects,
                    method: .post,
                    body: input,
                    authenticated: true
                )
            case "update":
                struct UpdateRequest: Codable {
                    let id: String
                    let input: UpdateProjectInput
                }
                let request = try decoder.decode(UpdateRequest.self, from: data)
                try await apiClient.requestVoid(
                    endpoint: APIEndpoint.project(id: request.id),
                    method: .put,
                    body: request.input,
                    authenticated: true
                )
            case "delete":
                try await apiClient.requestVoid(
                    endpoint: APIEndpoint.project(id: item.id),
                    method: .delete,
                    authenticated: true
                )
            default:
                break
            }
        default:
            break
        }
    }
}
