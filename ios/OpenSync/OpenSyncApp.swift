import SwiftUI

@main
struct OpenSyncApp: App {
    @StateObject private var model = AppModel()
    var body: some Scene {
        WindowGroup {
            RootView().environmentObject(model).tint(.indigo)
                .task { await model.restore() }
                .alert("OpenSync", isPresented: Binding(get: { model.message != nil }, set: { if !$0 { model.message = nil } })) {
                    Button("OK") { model.message = nil }
                } message: { Text(model.message ?? "") }
        }
    }
}

struct RootView: View {
    @EnvironmentObject private var model: AppModel
    var body: some View {
        Group {
            if model.signedIn {
                TabView {
                    NavigationStack { OverviewView() }.tabItem { Label("Today", systemImage: "sun.max") }
                    NavigationStack { HoursHomeView() }.tabItem { Label("Hours", systemImage: "clock") }
                    NavigationStack { UpdatesHomeView() }.tabItem { Label("Updates", systemImage: "megaphone") }
                    NavigationStack { SettingsView() }.tabItem { Label("Settings", systemImage: "gearshape") }
                }
            } else { SignInView() }
        }
        .overlay(alignment: .top) {
            if model.busy { ProgressView().padding(12).background(.regularMaterial, in: Capsule()).accessibilityLabel("Working") }
        }
    }
}

struct SignInView: View {
    @EnvironmentObject private var model: AppModel
    @State private var email = ""
    @State private var password = ""
    var body: some View {
        NavigationStack {
            Form {
                Section {
                    VStack(alignment: .leading, spacing: 16) {
                        Image(systemName: "clock.badge.checkmark").font(.system(size: 52)).foregroundStyle(.indigo)
                        Text("Your hours.\nAlways in sync.").font(.largeTitle.bold())
                        Text("Manage your business hours and publish updates from wherever the day takes you.").foregroundStyle(.secondary)
                    }.padding(.vertical, 20)
                }
                Section("Sign in to your OpenSync account") {
                    TextField("Email", text: $email).textContentType(.username).keyboardType(.emailAddress).textInputAutocapitalization(.never).autocorrectionDisabled()
                    SecureField("Password", text: $password).textContentType(.password)
                    Button("Sign in") {
                        let enteredPassword = password
                        model.perform { try await model.login(email: email, password: enteredPassword); password = "" }
                    }.disabled(model.busy || email.isEmpty || password.isEmpty)
                }
                Section {
                    Button("Explore demo") { do { try model.demo() } catch { model.message = error.localizedDescription } }
                    Text("Demo changes stay in memory and never reach a real business. Sign in with an existing verified account to manage live locations.").font(.footnote).foregroundStyle(.secondary)
                }
            }.navigationTitle("OpenSync")
        }
    }
}

struct OverviewView: View {
    @EnvironmentObject private var model: AppModel
    @State private var review = false
    @State private var newName = ""
    var body: some View {
        List {
            if model.isDemo { Section { Label("Demo workspace • no live changes", systemImage: "sparkles").foregroundStyle(.indigo) } }
            if let detail = model.detail {
                Section {
                    Text(detail.location.draft.name).font(.title.bold())
                    Text(detail.location.draft.timezone).font(.subheadline).foregroundStyle(.secondary)
                    if let status = model.publicStatus?.status {
                        Label(status.open ? "Open" : "Closed", systemImage: status.open ? "checkmark.circle.fill" : "moon.fill")
                            .font(.title2.bold()).foregroundStyle(status.open ? .green : .secondary)
                        Text(status.nextLabel)
                    } else {
                        Text(model.isDemo ? "Demo preview" : "Live status unavailable").font(.headline)
                    }
                    if let time = model.refreshedAt {
                        Text("Last fetched \(time.formatted(date: .omitted, time: .shortened)). Pull to refresh.").font(.caption).foregroundStyle(.secondary)
                    }
                }
                Section("Publication") {
                    LabeledContent("Draft version", value: String(detail.location.draftVersion))
                    LabeledContent("Published revision", value: String(detail.location.publishedVersion))
                    Button("Review & publish") { review = true }.disabled(!model.canEdit || model.busy)
                }
                Section("Delivery status") {
                    if detail.jobs.isEmpty { Text("No live delivery jobs yet.").foregroundStyle(.secondary) }
                    ForEach(Array(detail.jobs.prefix(8))) { job in
                        LabeledContent(job.destination.capitalized, value: job.status)
                    }
                    Text("Google accepted means the API accepted the update, not that it is publicly visible. Announcements appear on website widgets only.").font(.footnote).foregroundStyle(.secondary)
                }
                Section("Recent activity") {
                    ForEach(Array(detail.history.prefix(10))) { item in Text(item.message) }
                }
            } else {
                Section("Your first location") {
                    TextField("Business name", text: $newName)
                    Button("Create location") { model.perform { try await model.create(name: newName) } }.disabled(newName.trimmingCharacters(in: .whitespaces).isEmpty || model.busy)
                    Text("Your device time zone will be used. Review it in Hours before publishing.").font(.footnote)
                }
            }
        }
        .navigationTitle("Today")
        .toolbar {
            if model.locations.count > 1 {
                Menu("Locations") {
                    ForEach(model.locations) { location in
                        Button(location.draft.name) { model.perform { try await model.select(location.id) } }
                    }
                }.disabled(model.busy)
            }
        }
        .refreshable { do { try await model.reload() } catch { model.message = error.localizedDescription } }
        .sheet(isPresented: $review) {
            NavigationStack {
                List {
                    Text("Publish the saved draft?").font(.title2.bold())
                    Text("Website widgets update immediately. Eligible connected Google profiles are queued. Unpublished edits in an open editor must be saved first.")
                    if let schedule = model.detail?.location.draft {
                        Text(schedule.name).font(.headline)
                        Text(schedule.timezone)
                        ForEach(0..<7, id: \.self) { day in
                            LabeledContent(Schedule.days[day], value: schedule.weekly[day].map { "\($0.open)–\($0.close)" }.joined(separator: ", ").nonempty("Closed"))
                        }
                        ForEach(schedule.exceptions) { item in
                            Text("\(item.label): \(item.start)–\(item.end), \(item.intervals.isEmpty ? "Closed" : item.intervals.map { "\($0.open)–\($0.close)" }.joined(separator: ", "))")
                        }
                        ForEach(schedule.announcements.filter(\.enabled)) { item in Text("Announcement: \(item.title) — \(item.message)") }
                    }
                    Button(model.isDemo ? "Publish demo" : "Publish now") { review = false; model.perform { try await model.publish() } }.buttonStyle(.borderedProminent)
                }.navigationTitle("Review").toolbar { Button("Cancel") { review = false } }
            }
        }
    }
}
extension String {
    func nonempty(_ fallback: String) -> String { isEmpty ? fallback : self }
}
