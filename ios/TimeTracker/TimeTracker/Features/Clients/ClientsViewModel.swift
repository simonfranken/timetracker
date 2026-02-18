import Foundation
import SwiftUI

@MainActor
final class ClientsViewModel: ObservableObject {
    @Published var clients: [Client] = []
    @Published var isLoading = false
    @Published var error: String?
    
    private let apiClient = APIClient()
    private let database = DatabaseService.shared
    
    func loadClients() async {
        isLoading = true
        error = nil
        
        do {
            let response: ClientListResponse = try await apiClient.request(
                endpoint: APIEndpoint.clients,
                authenticated: true
            )
            clients = response.clients
            
            try await database.saveClients(clients)
            
            isLoading = false
        } catch {
            isLoading = false
            self.error = error.localizedDescription
            
            // Load from cache
            clients = (try? await database.fetchClients()) ?? []
        }
    }
    
    func createClient(name: String, description: String?) async {
        isLoading = true
        
        do {
            let input = CreateClientInput(name: name, description: description)
            _ = try await apiClient.request(
                endpoint: APIEndpoint.clients,
                method: .post,
                body: input,
                authenticated: true
            )
            
            await loadClients()
        } catch {
            isLoading = false
            self.error = error.localizedDescription
        }
    }
    
    func updateClient(id: String, name: String, description: String?) async {
        isLoading = true
        
        do {
            let input = UpdateClientInput(name: name, description: description)
            _ = try await apiClient.request(
                endpoint: APIEndpoint.client(id: id),
                method: .put,
                body: input,
                authenticated: true
            )
            
            await loadClients()
        } catch {
            isLoading = false
            self.error = error.localizedDescription
        }
    }
    
    func deleteClient(_ client: Client) async {
        do {
            try await apiClient.requestVoid(
                endpoint: APIEndpoint.client(id: client.id),
                method: .delete,
                authenticated: true
            )
            
            clients.removeAll { $0.id == client.id }
        } catch {
            self.error = error.localizedDescription
        }
    }
}
