import SwiftUI

struct HoursHomeView: View {
    @EnvironmentObject private var model: AppModel
    var body: some View {
        Group {
            if let detail = model.detail {
                ScheduleEditor(location: detail.location, updatesOnly: false).id(detail.location.id)
            } else { ContentUnavailableView("Choose a location", systemImage: "clock", description: Text("Create or select a location in Today.")) }
        }.navigationTitle("Hours")
    }
}
struct UpdatesHomeView: View {
    @EnvironmentObject private var model: AppModel
    var body: some View {
        Group {
            if let detail = model.detail {
                ScheduleEditor(location: detail.location, updatesOnly: true).id(detail.location.id)
            } else { ContentUnavailableView("Choose a location", systemImage: "megaphone", description: Text("Create or select a location in Today.")) }
        }.navigationTitle("Updates")
    }
}
struct ScheduleEditor: View {
    @EnvironmentObject private var model: AppModel
    let location: Location
    let updatesOnly: Bool
    @State private var draft: Schedule
    @State private var baseline: Schedule
    @State private var baseVersion: Int
    private var editorKey: String { location.id + (updatesOnly ? ":updates" : ":hours") }
    @State private var discard = false
    init(location: Location, updatesOnly: Bool) {
        self.location = location
        self.updatesOnly = updatesOnly
        _draft = State(initialValue: location.draft)
        _baseline = State(initialValue: location.draft)
        _baseVersion = State(initialValue: location.draftVersion)
    }
    var body: some View {
        Form {
            if updatesOnly {
                Section {
                    Text("Announcements publish to website widgets. Google receives business hours only.").font(.footnote)
                    ForEach($draft.announcements) { $announcement in
                        NavigationLink {
                            AnnouncementEditor(announcement: $announcement)
                        } label: {
                            VStack(alignment: .leading) {
                                Text(announcement.title.nonempty("Untitled update"))
                                Text(announcement.enabled ? "Enabled" : "Hidden").font(.caption).foregroundStyle(.secondary)
                            }
                        }
                    }.onDelete { draft.announcements.remove(atOffsets: $0) }
                    Button("Add announcement") {
                        draft.announcements.append(Announcement(id: UUID().uuidString, title: "", message: "", type: "information", start: ISO8601DateFormatter().string(from: Date()), end: "", enabled: true, ctaText: "", ctaUrl: ""))
                    }.disabled(draft.announcements.count >= 50)
                }
            } else {
                Section("Business") {
                    TextField("Business name", text: $draft.name)
                    TextField("Category", text: $draft.category)
                    TextField("Address", text: $draft.address)
                    TextField("Website URL", text: $draft.website).keyboardType(.URL).textInputAutocapitalization(.never).autocorrectionDisabled()
                    Picker("Time zone", selection: $draft.timezone) {
                        ForEach(TimeZone.knownTimeZoneIdentifiers, id: \.self) { Text($0).tag($0) }
                    }
                }
                Section("Weekly hours") {
                    ForEach(0..<7, id: \.self) { day in
                        NavigationLink {
                            PeriodEditor(periods: $draft.weekly[day]).navigationTitle(Schedule.days[day])
                        } label: {
                            VStack(alignment: .leading) {
                                Text(Schedule.days[day])
                                Text(draft.weekly[day].map { "\($0.open)–\($0.close)" }.joined(separator: ", ").nonempty("Closed"))
                                    .font(.caption).foregroundStyle(.secondary)
                            }
                        }
                    }
                    Button("Copy Monday to weekdays") { for day in 1..<5 { draft.weekly[day] = draft.weekly[0] } }
                }
                Section("Special hours") {
                    ForEach($draft.exceptions) { $exception in
                        NavigationLink {
                            SpecialHoursEditor(exception: $exception, timezone: draft.timezone)
                        } label: {
                            VStack(alignment: .leading) {
                                Text(exception.label.nonempty("Special hours"))
                                Text("\(exception.start) – \(exception.end)").font(.caption).foregroundStyle(.secondary)
                            }
                        }
                    }.onDelete { draft.exceptions.remove(atOffsets: $0) }
                    Button("Add special hours") {
                        let date = Wire.date(Date(), timezone: draft.timezone)
                        draft.exceptions.append(SpecialHours(id: UUID().uuidString, start: date, end: date, label: "Special hours", intervals: []))
                    }.disabled(draft.exceptions.count >= 100)
                    Text("An empty day is closed. Earlier closing times mean overnight hours. All times use the business time zone.").font(.footnote).foregroundStyle(.secondary)
                }
            }
            Section {
                Button("Save draft") {
                    let edited = draft
                    model.perform {
                        try await model.save(edited, locationID: location.id, version: baseVersion)
                        baseline = edited
                        baseVersion = model.detail?.location.draftVersion ?? baseVersion
                        model.dirtyEditors.remove(editorKey)
                    }
                }.disabled(model.busy || draft == baseline)
                Button("Discard edits", role: .destructive) { discard = true }.disabled(draft == baseline)
                Text("Save changes before refreshing, switching locations, or publishing. Concurrent changes are checked by the server; discard and reapply your edits if your draft version is out of date.").font(.footnote).foregroundStyle(.secondary)
            }
        }
        .disabled(!model.canEdit || model.busy)
        .onChange(of: draft) { _, value in
            if value == baseline { model.dirtyEditors.remove(editorKey) }
            else { model.dirtyEditors.insert(editorKey) }
        }
        .onChange(of: location.draftVersion) { _, version in
            if draft == baseline { draft = location.draft; baseline = location.draft; baseVersion = version }
        }
        .confirmationDialog("Discard unsaved edits?", isPresented: $discard, titleVisibility: .visible) {
            Button("Discard", role: .destructive) {
                draft = location.draft; baseline = location.draft; baseVersion = location.draftVersion
                model.dirtyEditors.remove(editorKey)
            }
        }
    }
}

struct PeriodEditor: View {
    @Binding var periods: [HoursPeriod]
    var body: some View {
        Form {
            Section {
                if periods.isEmpty { Text("Closed all day").foregroundStyle(.secondary) }
                ForEach(periods.indices, id: \.self) { index in
                    VStack {
                        ClockPicker(title: "Opens", value: $periods[index].open)
                        ClockPicker(title: "Closes", value: $periods[index].close)
                    }
                }.onDelete { periods.remove(atOffsets: $0) }
                Button("Add opening period") { periods.append(HoursPeriod(open: "09:00", close: "17:00")) }.disabled(periods.count >= 8)
                Button("Closed all day", role: .destructive) { periods = [] }
            } footer: {
                Text("Times are in the business time zone. A closing time earlier than opening continues into the next day. Overlapping or equal times are rejected when saving.")
            }
        }
    }
}
struct ClockPicker: View {
    let title: String
    @Binding var value: String
    private var calendar: Calendar { var c = Calendar(identifier: .gregorian); c.timeZone = TimeZone(secondsFromGMT: 0)!; return c }
    var body: some View {
        DatePicker(title, selection: Binding(get: {
            let parts = value.split(separator: ":").compactMap { Int($0) }
            return calendar.date(from: DateComponents(year: 2001, month: 1, day: 1, hour: parts.first ?? 9, minute: parts.last ?? 0))!
        }, set: {
            let c = calendar.dateComponents([.hour, .minute], from: $0)
            value = String(format: "%02d:%02d", c.hour ?? 0, c.minute ?? 0)
        }), displayedComponents: .hourAndMinute).environment(\.timeZone, TimeZone(secondsFromGMT: 0)!)
    }
}
struct SpecialHoursEditor: View {
    @Binding var exception: SpecialHours
    let timezone: String
    var body: some View {
        Form {
            TextField("Label", text: $exception.label)
            BusinessDatePicker(title: "From", value: $exception.start, timezone: timezone)
            BusinessDatePicker(title: "Through", value: $exception.end, timezone: timezone)
            NavigationLink("Opening periods (\(exception.intervals.count))") { PeriodEditor(periods: $exception.intervals).navigationTitle("Special hours") }
            Text("Date ranges cannot overlap another exception. Remove or adjust existing ranges before saving.").font(.footnote)
        }.navigationTitle("Special hours")
    }
}
struct BusinessDatePicker: View {
    let title: String
    @Binding var value: String
    let timezone: String
    var body: some View {
        DatePicker(title, selection: Binding(get: {
            let f = DateFormatter(); f.locale = Locale(identifier: "en_US_POSIX"); f.calendar = Calendar(identifier: .gregorian)
            f.timeZone = TimeZone(identifier: timezone); f.dateFormat = "yyyy-MM-dd"
            return f.date(from: value) ?? Date()
        }, set: { value = Wire.date($0, timezone: timezone) }), displayedComponents: .date)
            .environment(\.timeZone, TimeZone(identifier: timezone) ?? .current)
    }
}
struct AnnouncementEditor: View {
    @Binding var announcement: Announcement
    private func instant(_ field: Binding<String>) -> Binding<Date> {
        Binding(get: {
            let f = ISO8601DateFormatter()
            if let date = f.date(from: field.wrappedValue) { return date }
            f.formatOptions.insert(.withFractionalSeconds)
            return f.date(from: field.wrappedValue) ?? Date()
        }, set: { field.wrappedValue = ISO8601DateFormatter().string(from: $0) })
    }
    var body: some View {
        Form {
            TextField("Title", text: $announcement.title)
            TextField("Message", text: $announcement.message, axis: .vertical).lineLimit(3...8)
            Picker("Type", selection: $announcement.type) {
                ForEach(["information", "warning", "closure", "special hours"], id: \.self) { Text($0.capitalized).tag($0) }
            }
            Toggle("Enabled", isOn: $announcement.enabled)
            DatePicker("Starts", selection: instant($announcement.start))
            Toggle("Expires", isOn: Binding(get: { !announcement.end.isEmpty }, set: {
                announcement.end = $0 ? ISO8601DateFormatter().string(from: Date().addingTimeInterval(86400)) : ""
            }))
            if !announcement.end.isEmpty { DatePicker("Ends", selection: instant($announcement.end)) }
            Text("Announcement dates are displayed in your device time zone. Scheduled announcements depend on your account’s existing plan.").font(.footnote)
            TextField("Link label (optional)", text: $announcement.ctaText)
            TextField("Link URL (optional)", text: $announcement.ctaUrl).keyboardType(.URL).textInputAutocapitalization(.never).autocorrectionDisabled()
        }.navigationTitle("Announcement")
    }
}
