import Foundation

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
                throw NetworkError.unauthorized
            }
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        if let body = body {
            request.httpBody = try encoder.encode(body)
        }
        
        do {
            let (data, response) = try await session.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw NetworkError.invalidResponse
            }
            
            if httpResponse.statusCode == 401 {
                let message = try? decoder.decode(ErrorResponse.self, from: data).error
                await MainActor.run {
                    AuthManager.shared.clearAuth()
                }
                throw NetworkError.httpError(statusCode: 401, message: message)
            }
            
            guard (200...299).contains(httpResponse.statusCode) else {
                let message = try? decoder.decode(ErrorResponse.self, from: data).error
                throw NetworkError.httpError(statusCode: httpResponse.statusCode, message: message)
            }
            
            if data.isEmpty {
                let empty: T? = nil
                return try decoder.decode(T.self, from: "{}".data(using: .utf8)!)
            }
            
            return try decoder.decode(T.self, from: data)
        } catch let error as NetworkError {
            throw error
        } catch let error as DecodingError {
            throw NetworkError.decodingError(error)
        } catch {
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
                throw NetworkError.unauthorized
            }
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        if let body = body {
            request.httpBody = try encoder.encode(body)
        }
        
        do {
            let (data, response) = try await session.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw NetworkError.invalidResponse
            }
            
            if httpResponse.statusCode == 401 {
                let message = try? decoder.decode(ErrorResponse.self, from: data).error
                await MainActor.run {
                    AuthManager.shared.clearAuth()
                }
                throw NetworkError.httpError(statusCode: 401, message: message)
            }
            
            guard (200...299).contains(httpResponse.statusCode) else {
                let message = try? decoder.decode(ErrorResponse.self, from: data).error
                throw NetworkError.httpError(statusCode: httpResponse.statusCode, message: message)
            }
        } catch let error as NetworkError {
            throw error
        } catch {
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
