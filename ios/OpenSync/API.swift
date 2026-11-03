import Foundation
import Security

// Authentication endpoints must not redirect tokens or passwords to another origin.
final class NoRedirects: NSObject, URLSessionTaskDelegate, @unchecked Sendable {
    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse,
                    newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) {
        completionHandler(nil)
    }
}

struct AppConfiguration {
    let apiURL: URL
    let authURL: URL
    let anonKey: String
    init(bundle: Bundle = .main) throws {
        func https(_ key: String) throws -> URL {
            guard let value = bundle.object(forInfoDictionaryKey: key) as? String,
                  !value.contains("YOUR-"), let url = URL(string: value),
                  url.scheme == "https", url.host != nil, url.user == nil, url.password == nil,
                  url.query == nil, url.fragment == nil else {
                throw AppError.message("Set your deployed HTTPS backend and Supabase public configuration in Config/Local.xcconfig. Demo works without a server.")
            }
            return url
        }
        apiURL = try https("OpenSyncAPIURL")
        authURL = try https("SupabaseURL")
        guard let key = bundle.object(forInfoDictionaryKey: "SupabaseAnonKey") as? String,
              !key.isEmpty, !key.contains("YOUR-") else { throw AppError.message("Supabase public key setup required.") }
        anonKey = key
    }
}
struct AuthSession: Codable {
    var access_token: String
    var refresh_token: String
    var expires_in: Double
    var expires_at: Double?
    var expiration: Date { Date(timeIntervalSince1970: expires_at ?? 0) }
}
enum SessionVault {
    static var query: [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrService as String: (Bundle.main.bundleIdentifier ?? "OpenSync") + ".session",
         kSecAttrAccount as String: "supabase"]
    }
    static func read() throws -> AuthSession? {
        var request = query
        request[kSecReturnData as String] = true
        request[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
        let status = SecItemCopyMatching(request as CFDictionary, &result)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess, let data = result as? Data else {
            throw AppError.message("Unlock your device to access your saved session.")
        }
        return try JSONDecoder().decode(AuthSession.self, from: data)
    }
    static func save(_ session: AuthSession) throws {
        let data = try JSONEncoder().encode(session)
        let update = SecItemUpdate(query as CFDictionary, [kSecValueData as String: data] as CFDictionary)
        if update == errSecSuccess { return }
        guard update == errSecItemNotFound else { throw AppError.message("Unable to securely save your session.") }
        var request = query
        request[kSecValueData as String] = data
        request[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        guard SecItemAdd(request as CFDictionary, nil) == errSecSuccess else {
            throw AppError.message("Unable to securely save your session.")
        }
    }
    static func clear() { SecItemDelete(query as CFDictionary) }
}

// One actor owns refresh rotation. Concurrent API requests share the same refresh task.
actor API {
    private let config: AppConfiguration
    private var session: AuthSession?
    private var refresh: Task<AuthSession, Error>?
    private let transport: URLSession
    init(config: AppConfiguration) throws {
        self.config = config
        session = try SessionVault.read()
        let settings = URLSessionConfiguration.ephemeral
        settings.timeoutIntervalForRequest = 25
        settings.httpCookieStorage = nil
        settings.urlCache = nil
        transport = URLSession(configuration: settings, delegate: NoRedirects(), delegateQueue: nil)
    }
    var hasSession: Bool { session != nil }
    private func send(_ url: URL, method: String = "GET", body: [String: Any]? = nil, token: String? = nil, auth: Bool = false) async throws -> Data {
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        if auth { request.setValue(config.anonKey, forHTTPHeaderField: "apikey") }
        if let body { request.httpBody = try JSONSerialization.data(withJSONObject: body) }
        let (data, response) = try await transport.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw AppError.message("No server response.") }
        guard (200..<300).contains(http.statusCode) else {
            let payload = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
            let message = payload?["error_description"] as? String ?? payload?["msg"] as? String ?? payload?["error"] as? String
            throw AppError.message(message ?? "Request failed (\(http.statusCode)). Try again.")
        }
        return data
    }
    private func grant(_ type: String, body: [String: Any]) async throws -> AuthSession {
        let url = config.authURL.appendingPathComponent("auth/v1/token").appending(queryItems: [URLQueryItem(name: "grant_type", value: type)])
        let data = try await send(url, method: "POST", body: body, auth: true)
        var result = try JSONDecoder().decode(AuthSession.self, from: data)
        if result.expires_at == nil { result.expires_at = Date().timeIntervalSince1970 + result.expires_in }
        try SessionVault.save(result)
        session = result
        return result
    }
    func signIn(email: String, password: String) async throws {
        _ = try await grant("password", body: ["email": email, "password": password])
    }
    private func accessToken() async throws -> String {
        guard let session else { throw AppError.message("Please sign in.") }
        if session.expiration.timeIntervalSinceNow > 60 { return session.access_token }
        if let refresh { return try await refresh.value.access_token }
        let task = Task { try await self.grant("refresh_token", body: ["refresh_token": session.refresh_token]) }
        refresh = task
        defer { refresh = nil }
        return try await task.value.access_token
    }
    func request<T: Decodable>(_ path: String, body: [String: Any]? = nil, as type: T.Type = T.self) async throws -> T {
        let data = try await raw(path, body: body)
        return try JSONDecoder().decode(T.self, from: data)
    }
    func raw(_ path: String, body: [String: Any]? = nil) async throws -> Data {
        guard path.hasPrefix("/api/"), let url = URL(string: path, relativeTo: config.apiURL)?.absoluteURL,
              url.host == config.apiURL.host else { throw AppError.message("Invalid API path.") }
        let token = try await accessToken()
        return try await send(url, method: body == nil ? "GET" : "POST", body: body, token: token)
    }
    func signOut() async {
        refresh?.cancel()
        _ = try? await refresh?.value
        if let token = session?.access_token {
            let url = config.authURL.appendingPathComponent("auth/v1/logout").appending(queryItems: [URLQueryItem(name: "scope", value: "local")])
            _ = try? await send(url, method: "POST", token: token, auth: true)
        }
        session = nil
        SessionVault.clear()
    }
}
