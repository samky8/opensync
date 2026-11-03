import XCTest
@testable import OpenSync

final class OpenSyncTests: XCTestCase {
    func testBusinessDateUsesBusinessTimezoneRatherThanDevice() {
        let instant = ISO8601DateFormatter().date(from: "2026-11-04T02:30:00Z")!
        XCTAssertEqual(Wire.date(instant, timezone: "America/Toronto"), "2026-11-03")
        XCTAssertEqual(Wire.date(instant, timezone: "Asia/Tokyo"), "2026-11-04")
    }
    func testExistingWebScheduleRoundTripsWithoutLosingFields() throws {
        let original = try Schedule.demo()
        XCTAssertEqual(original.weekly.count, 7)
        XCTAssertEqual(original.name, "Juniper & Oak")
        let decoded = try JSONDecoder().decode(Schedule.self, from: JSONEncoder().encode(original))
        XCTAssertEqual(original, decoded)
        XCTAssertEqual(decoded.exceptions.first?.intervals, [])
        XCTAssertEqual(decoded.announcements.first?.type, "information")
    }
    func testSessionExpiryDoesNotTrustMissingTimestamp() throws {
        let session = AuthSession(access_token: "a", refresh_token: "r", expires_in: 3600, expires_at: nil)
        XCTAssertLessThan(session.expiration.timeIntervalSinceNow, 0)
    }
}
