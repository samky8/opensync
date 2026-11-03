import SwiftUI

@MainActor
final class AppModel: ObservableObject {
    @Published var signedIn = false
    @Published var isDemo = false
    @Published var busy = false
    @Published var message: String?
    @Published var locations: [Location] = []
    @Published var detail: LocationDetail?
    @Published var publicStatus: PublicStatus?
    @Published var refreshedAt: Date?
    @Published var dirtyEditors: Set<String> = []
    private var api: API?
    private var publishKey: String?
    var canEdit: Bool { isDemo || ["owner", "admin", "editor"].contains(detail?.role ?? "") }

    func perform(_ operation: @escaping @MainActor () async throws -> Void) {
        guard !busy else { return }
        busy = true
        Task {
            defer { busy = false }
            do { try await operation() }
            catch { message = error.localizedDescription }
        }
    }
    func restore() async {
        do {
            let client = try API(config: AppConfiguration())
            api = client
            if await client.hasSession {
                signedIn = true
                try await reload()
            }
        } catch {
            // Unconfigured installations can still enter the clearly labeled demo.
            if signedIn { message = error.localizedDescription }
        }
    }
    func login(email: String, password: String) async throws {
        let client = try API(config: AppConfiguration())
        try await client.signIn(email: email.trimmingCharacters(in: .whitespacesAndNewlines), password: password)
        api = client
        signedIn = true
        isDemo = false
        try await reload()
    }
    func demo() throws {
        let location = Location(id: "demo", draft: try Schedule.demo(), draftVersion: 1, publishedVersion: 0)
        locations = [location]
        detail = LocationDetail(location: location, role: "owner", plan: "demo", history: [], jobs: [])
        isDemo = true
        signedIn = true
        refreshedAt = Date()
    }
    private func client() throws -> API {
        guard let api, !isDemo else { throw AppError.message("Please sign in.") }
        return api
    }
    func reload() async throws {
        guard !isDemo else { return }
        guard dirtyEditors.isEmpty else { throw AppError.message("Save or discard your editor changes before refreshing or switching locations.") }
        let client = try client()
        let result: Bootstrap = try await client.request("/api/mobile/bootstrap")
        locations = result.locations
        if let selected = locations.first(where: { $0.id == detail?.location.id }) ?? locations.first {
            try await select(selected.id)
        } else { detail = nil; publicStatus = nil }
    }
    func select(_ id: String) async throws {
        guard !isDemo else { return }
        guard dirtyEditors.isEmpty else { throw AppError.message("Save or discard your editor changes before switching locations.") }
        let client = try client()
        let result: LocationDetail = try await client.request("/api/manage?id=\(id)")
        detail = result
        publicStatus = nil
        if result.location.publishedVersion > 0 {
            // Never infer live customer status from an unpublished draft.
            publicStatus = try? await client.request("/api/public/\(id)")
        }
        refreshedAt = Date()
        publishKey = nil
    }
    func create(name: String) async throws {
        let saved: SavedLocation = try await client().request("/api/manage", body: ["op": "create", "name": name, "timezone": TimeZone.current.identifier])
        try await reload()
        try await select(saved.location.id)
    }
    func save(_ schedule: Schedule, locationID: String, version: Int) async throws {
        if isDemo {
            detail?.location.draft = schedule
            detail?.location.draftVersion += 1
        } else {
            let saved: SavedLocation = try await client().request("/api/manage", body: ["op": "save", "id": locationID, "version": version, "draft": Wire.object(schedule)])
            detail?.location = saved.location
        }
        publishKey = nil
        message = "Draft saved. Review and publish when you’re ready."
    }
    func publish() async throws {
        guard let detail else { return }
        guard dirtyEditors.isEmpty else { throw AppError.message("Save or discard your editor changes before publishing.") }
        if isDemo {
            self.detail?.location.publishedVersion += 1
            self.detail?.history.insert(ActivityItem(id: UUID().uuidString, message: "Demo publication — no live data changed"), at: 0)
        } else {
            // Keep the same key after a timeout so retrying does not create duplicate revisions.
            let key = publishKey ?? UUID().uuidString
            publishKey = key
            _ = try await client().raw("/api/manage", body: ["op": "publish", "id": detail.location.id, "version": detail.location.draftVersion, "key": key])
            try await reload()
        }
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        message = isDemo ? "Demo published. No live channels were changed." : "Published to your website. Connected Google updates are queued; check delivery status below."
    }
    func support(_ text: String) async throws {
        if !isDemo { _ = try await client().raw("/api/manage", body: ["op": "support", "message": text]) }
        message = isDemo ? "Demo request — nothing sent." : "Support request received."
    }
    func export() async throws -> String {
        if let detail, isDemo {
            return String(decoding: try JSONEncoder().encode(detail.location.draft), as: UTF8.self)
        }
        return String(decoding: try await client().raw("/api/export"), as: UTF8.self)
    }
    func deleteAccount() async throws {
        if !isDemo {
            _ = try await client().raw("/api/manage", body: ["op": "delete", "confirmation": "DELETE", "cancelSubscriptions": true])
        }
        await logout()
    }
    func logout() async {
        if !isDemo { await api?.signOut() }
        signedIn = false
        isDemo = false
        detail = nil
        locations = []
        publicStatus = nil
        refreshedAt = nil
        publishKey = nil
        api = nil
        dirtyEditors = []
    }
}
