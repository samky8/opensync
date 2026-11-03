import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var model: AppModel
    @State private var supportMessage = ""
    @State private var deleteConfirmation = ""
    @State private var deleteReview = false
    @State private var exported: String?
    @State private var signOutReview = false
    var body: some View {
        Form {
            Section("Workspace") {
                if let detail = model.detail {
                    LabeledContent("Access", value: detail.role.capitalized)
                    LabeledContent("Plan", value: detail.plan.capitalized)
                    Text("Existing account permissions apply. Manage your hours, announcements, and connected publishing destinations here.").font(.footnote)
                }
                Button(model.isDemo ? "Leave demo" : "Sign out") { signOutReview = true }
            }
            Section("Support") {
                TextField("How can we help?", text: $supportMessage, axis: .vertical).lineLimit(3...8)
                Button("Send support request") { model.perform { try await model.support(supportMessage); supportMessage = "" } }
                    .disabled(supportMessage.trimmingCharacters(in: .whitespacesAndNewlines).count < 10 || supportMessage.count > 3000)
            }
            Section("Your data") {
                Button("Prepare data export") { model.perform { exported = try await model.export() } }
                if let exported { ShareLink("Share exported JSON", item: exported) }
                if let config = try? AppConfiguration() {
                    Link("Privacy policy", destination: config.apiURL.appendingPathComponent("privacy"))
                    Link("Terms of service", destination: config.apiURL.appendingPathComponent("terms"))
                }
                Button("Delete account", role: .destructive) { deleteReview = true }
            }
            Section {
                Text("OpenSync 1.0 • Native iOS companion").font(.footnote).foregroundStyle(.secondary)
            }
        }
        .disabled(model.busy)
        .navigationTitle("Settings")
        .confirmationDialog("Sign out? Unsaved edits will be discarded.", isPresented: $signOutReview, titleVisibility: .visible) {
            Button("Sign out", role: .destructive) { model.perform { await model.logout() } }
        }
        .sheet(isPresented: $deleteReview) {
            NavigationStack {
                Form {
                    Text("Delete your account permanently?").font(.title2.bold())
                    Text("This cancels active OpenSync web subscriptions immediately and deletes your account, owned businesses, schedules, and stored connections. It affects your whole account, including other devices. This cannot be undone. Refunds are not issued by this action.")
                    TextField("Type DELETE", text: $deleteConfirmation).textInputAutocapitalization(.characters).autocorrectionDisabled()
                    Button("Cancel subscriptions & delete account", role: .destructive) {
                        deleteReview = false
                        model.perform { try await model.deleteAccount() }
                    }.disabled(deleteConfirmation != "DELETE")
                }.navigationTitle("Delete account").toolbar { Button("Keep account") { deleteReview = false; deleteConfirmation = "" } }
            }
        }
    }
}
