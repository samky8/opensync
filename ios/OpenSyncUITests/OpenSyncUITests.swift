import XCTest

final class OpenSyncUITests: XCTestCase {
    @MainActor func testDemoNavigationAndPublication() throws {
        let app = XCUIApplication()
        app.launch()
        app.buttons["Explore demo"].tap()
        XCTAssertTrue(app.staticTexts["Juniper & Oak"].waitForExistence(timeout: 5))
        app.tabBars.buttons["Hours"].tap()
        XCTAssertTrue(app.textFields["Business name"].exists)
        app.tabBars.buttons["Updates"].tap()
        XCTAssertTrue(app.buttons["Add announcement"].exists)
        app.tabBars.buttons["Today"].tap()
        app.buttons["Review & publish"].tap()
        let publish = app.buttons["Publish demo"]
        for _ in 0..<5 where !publish.isHittable { app.swipeUp() }
        publish.tap()
        XCTAssertTrue(app.alerts["OpenSync"].waitForExistence(timeout: 5))
        app.alerts.buttons["OK"].tap()
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = "OpenSync native demo"
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
