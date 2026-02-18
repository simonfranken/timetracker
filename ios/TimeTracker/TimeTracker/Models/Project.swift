import Foundation

struct Project: Codable, Identifiable, Equatable {
    let id: String
    let name: String
    let description: String?
    let color: String?
    let clientId: String
    let client: ClientReference
    let createdAt: String
    let updatedAt: String
}

struct ClientReference: Codable, Equatable {
    let id: String
    let name: String
}

struct ProjectListResponse: Codable {
    let projects: [Project]
}

struct CreateProjectInput: Codable {
    let name: String
    let description: String?
    let color: String?
    let clientId: String
}

struct UpdateProjectInput: Codable {
    let name: String?
    let description: String?
    let color: String?
    let clientId: String?
}
