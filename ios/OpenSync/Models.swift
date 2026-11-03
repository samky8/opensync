import Foundation

struct HoursPeriod: Codable, Equatable {
    var open: String
    var close: String
}
struct SpecialHours: Codable, Identifiable, Equatable {
    var id: String
    var start: String
    var end: String
    var label: String
    var intervals: [HoursPeriod]
}
struct Announcement: Codable, Identifiable, Equatable {
    var id: String
    var title: String
    var message: String
    var type: String
    var start: String
    var end: String
    var enabled: Bool
    var ctaText: String
    var ctaUrl: String
}
struct WidgetSettings: Codable, Equatable {
    var accent: String
    var theme: String
    var radius: Double
    var showName: Bool
    var compact: Bool
    var font: String
    var alignment: String
    var dismissible: Bool
    var placement: String
}
struct Schedule: Codable, Equatable {
    var name: String
    var category: String
    var website: String
    var address: String
    var logo: String
    var timezone: String
    var weekly: [[HoursPeriod]]
    var exceptions: [SpecialHours]
    var announcements: [Announcement]
    var widget: WidgetSettings
    static let days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    static func demo() throws -> Schedule {
        guard let url = Bundle.main.url(forResource: "demo", withExtension: "json") else {
            throw AppError.message("The demo resource is missing.")
        }
        return try JSONDecoder().decode(Schedule.self, from: Data(contentsOf: url))
    }
}
struct Location: Codable, Identifiable {
    var id: String
    var draft: Schedule
    var draftVersion: Int
    var publishedVersion: Int
}
struct Bootstrap: Decodable { var locations: [Location] }
struct SavedLocation: Decodable { var location: Location }
struct ActivityItem: Decodable, Identifiable { var id: String; var message: String }
struct PublishJob: Decodable, Identifiable {
    var id: String
    var destination: String
    var status: String
}
struct LocationDetail: Decodable {
    var location: Location
    var role: String
    var plan: String
    var history: [ActivityItem]
    var jobs: [PublishJob]
}
struct PublicStatus: Decodable {
    struct Status: Decodable { var open: Bool; var nextLabel: String }
    var status: Status
}
enum AppError: LocalizedError {
    case message(String)
    var errorDescription: String? { if case .message(let text) = self { return text }; return nil }
}

enum Wire {
    static func object<T: Encodable>(_ value: T) throws -> Any {
        try JSONSerialization.jsonObject(with: JSONEncoder().encode(value))
    }
    static func date(_ date: Date, timezone: String) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.timeZone = TimeZone(identifier: timezone)
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }
}
