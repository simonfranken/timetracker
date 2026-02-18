import Foundation

struct Client: Codable, Identifiable, Equatable, Hashable {
    let id: String
    let name: String
    let description: String?
    let createdAt: String
    let updatedAt: String
}

struct ClientListResponse: Codable {
    let clients: [Client]
}

struct CreateClientInput: Codable {
    let name: String
    let description: String?
}

struct UpdateClientInput: Codable {
    let name: String?
    let description: String?
}
