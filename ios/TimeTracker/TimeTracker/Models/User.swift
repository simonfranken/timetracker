import Foundation

struct User: Codable, Equatable {
    let id: String
    let username: String
    let fullName: String?
    let email: String
}

struct UserResponse: Codable {
    let id: String
    let username: String
    let fullName: String?
    let email: String
    
    func toUser() -> User {
        User(id: id, username: username, fullName: fullName, email: email)
    }
}
