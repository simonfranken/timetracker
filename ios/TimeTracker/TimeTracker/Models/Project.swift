import Foundation

struct Project: Codable, Identifiable, Equatable, Hashable {
    let id: String
    let name: String
    let description: String?
    let color: String?
    let clientId: String
    let client: ClientReference
    let createdAt: String
    let updatedAt: String
}

struct ClientReference: Codable, Equatable, Hashable {
    let id: String
    let name: String
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
