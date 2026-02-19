import Foundation
import OSLog

private let logger = Logger(subsystem: "com.timetracker.app", category: "APIClient")

actor APIClient {
    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder
    
    init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        self.session = URLSession(configuration: config)
        
        self.decoder = JSONDecoder()
        self.encoder = JSONEncoder()
    }
    
    func request<T: Decodable>(
        endpoint: String,
        method: HTTPMethod = .get,
        body: Encodable? = nil,
        queryItems: [URLQueryItem]? = nil,
        authenticated: Bool = true
    ) async throws -> T {
        var urlComponents = URLComponents(
            url: APIEndpoints.url(for: endpoint),
            resolvingAgainstBaseURL: true
        )
        
        if let queryItems = queryItems, !queryItems.isEmpty {
            urlComponents?.queryItems = queryItems
        }
        
        guard let url = urlComponents?.url else {
            throw NetworkError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        
        if authenticated {
            let token = await MainActor.run { AuthManager.shared.accessToken }
            guard let token = token else {
                logger.warning("\(method.rawValue) \(endpoint) — no access token in keychain, throwing .unauthorized")
                throw NetworkError.unauthorized
            }
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            logger.debug("\(method.rawValue) \(endpoint) — Authorization header set (token: \(token.prefix(20))…)")
        }
        
        if let body = body {
            request.httpBody = try encoder.encode(body)
        }
        
        do {
            logger.debug("\(method.rawValue) \(url.absoluteString) — sending request")
            let (data, response) = try await session.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw NetworkError.invalidResponse
            }
            
            logger.debug("\(method.rawValue) \(endpoint) — status \(httpResponse.statusCode)")
            
            if httpResponse.statusCode == 401 {
                let serverMessage = (try? decoder.decode(ErrorResponse.self, from: data))?.error
                logger.error("\(method.rawValue) \(endpoint) — 401 Unauthorized. Server: \(serverMessage ?? "(no message)")")
                await MainActor.run { AuthManager.shared.clearAuth() }
                throw NetworkError.httpError(statusCode: 401, message: serverMessage)
            }
            
            guard (200...299).contains(httpResponse.statusCode) else {
                let serverMessage = (try? decoder.decode(ErrorResponse.self, from: data))?.error
                logger.error("\(method.rawValue) \(endpoint) — HTTP \(httpResponse.statusCode). Server: \(serverMessage ?? "(no message)")")
                throw NetworkError.httpError(statusCode: httpResponse.statusCode, message: serverMessage)
            }
            
            if data.isEmpty {
                return try decoder.decode(T.self, from: "{}".data(using: .utf8)!)
            }
            
            return try decoder.decode(T.self, from: data)
        } catch let error as NetworkError {
            throw error
        } catch let error as DecodingError {
            logger.error("\(method.rawValue) \(endpoint) — decoding error: \(error)")
            throw NetworkError.decodingError(error)
        } catch {
            logger.error("\(method.rawValue) \(endpoint) — network error: \(error)")
            throw NetworkError.networkError(error)
        }
    }
    
    func requestVoid(
        endpoint: String,
        method: HTTPMethod = .get,
        body: Encodable? = nil,
        queryItems: [URLQueryItem]? = nil,
        authenticated: Bool = true
    ) async throws {
        var urlComponents = URLComponents(
            url: APIEndpoints.url(for: endpoint),
            resolvingAgainstBaseURL: true
        )
        
        if let queryItems = queryItems, !queryItems.isEmpty {
            urlComponents?.queryItems = queryItems
        }
        
        guard let url = urlComponents?.url else {
            throw NetworkError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        
        if authenticated {
            let token = await MainActor.run { AuthManager.shared.accessToken }
            guard let token = token else {
                logger.warning("\(method.rawValue) \(endpoint) — no access token in keychain, throwing .unauthorized")
                throw NetworkError.unauthorized
            }
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            logger.debug("\(method.rawValue) \(endpoint) — Authorization header set (token: \(token.prefix(20))…)")
        }
        
        if let body = body {
            request.httpBody = try encoder.encode(body)
        }
        
        do {
            logger.debug("\(method.rawValue) \(url.absoluteString) — sending request")
            let (data, response) = try await session.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw NetworkError.invalidResponse
            }
            
            logger.debug("\(method.rawValue) \(endpoint) — status \(httpResponse.statusCode)")
            
            if httpResponse.statusCode == 401 {
                let serverMessage = (try? decoder.decode(ErrorResponse.self, from: data))?.error
                logger.error("\(method.rawValue) \(endpoint) — 401 Unauthorized. Server: \(serverMessage ?? "(no message)")")
                await MainActor.run { AuthManager.shared.clearAuth() }
                throw NetworkError.httpError(statusCode: 401, message: serverMessage)
            }
            
            guard (200...299).contains(httpResponse.statusCode) else {
                let serverMessage = (try? decoder.decode(ErrorResponse.self, from: data))?.error
                logger.error("\(method.rawValue) \(endpoint) — HTTP \(httpResponse.statusCode). Server: \(serverMessage ?? "(no message)")")
                throw NetworkError.httpError(statusCode: httpResponse.statusCode, message: serverMessage)
            }
        } catch let error as NetworkError {
            throw error
        } catch {
            logger.error("\(method.rawValue) \(endpoint) — network error: \(error)")
            throw NetworkError.networkError(error)
        }
    }
}

enum HTTPMethod: String {
    case get = "GET"
    case post = "POST"
    case put = "PUT"
    case delete = "DELETE"
    case patch = "PATCH"
}

struct ErrorResponse: Codable {
    let error: String?
}
