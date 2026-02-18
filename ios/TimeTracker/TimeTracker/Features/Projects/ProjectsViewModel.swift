import Foundation
import SwiftUI

@MainActor
final class ProjectsViewModel: ObservableObject {
    @Published var projects: [Project] = []
    @Published var clients: [Client] = []
    @Published var isLoading = false
    @Published var error: String?
    
    private let apiClient = APIClient()
    private let database = DatabaseService.shared
    
    func loadData() async {
        isLoading = true
        error = nil
        
        do {
            let clientsResponse: ClientListResponse = try await apiClient.request(
                endpoint: APIEndpoint.clients,
                authenticated: true
            )
            clients = clientsResponse.clients
            
            let projectsResponse: ProjectListResponse = try await apiClient.request(
                endpoint: APIEndpoint.projects,
                authenticated: true
            )
            projects = projectsResponse.projects
            
            try await database.saveProjects(projects)
            
            isLoading = false
        } catch {
            isLoading = false
            self.error = error.localizedDescription
            
            // Load from cache
            projects = (try? await database.fetchProjects()) ?? []
        }
    }
    
    func createProject(name: String, description: String?, color: String?, clientId: String) async {
        isLoading = true
        
        do {
            let input = CreateProjectInput(
                name: name,
                description: description,
                color: color,
                clientId: clientId
            )
            _ = try await apiClient.request(
                endpoint: APIEndpoint.projects,
                method: .post,
                body: input,
                authenticated: true
            )
            
            await loadData()
        } catch {
            isLoading = false
            self.error = error.localizedDescription
        }
    }
    
    func updateProject(id: String, name: String, description: String?, color: String?, clientId: String) async {
        isLoading = true
        
        do {
            let input = UpdateProjectInput(
                name: name,
                description: description,
                color: color,
                clientId: clientId
            )
            _ = try await apiClient.request(
                endpoint: APIEndpoint.project(id: id),
                method: .put,
                body: input,
                authenticated: true
            )
            
            await loadData()
        } catch {
            isLoading = false
            self.error = error.localizedDescription
        }
    }
    
    func deleteProject(_ project: Project) async {
        do {
            try await apiClient.requestVoid(
                endpoint: APIEndpoint.project(id: project.id),
                method: .delete,
                authenticated: true
            )
            
            projects.removeAll { $0.id == project.id }
        } catch {
            self.error = error.localizedDescription
        }
    }
}
