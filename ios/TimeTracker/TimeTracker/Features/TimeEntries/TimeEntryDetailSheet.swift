import SwiftUI

/// Detail/edit sheet for a single time entry.  Used both for creating new entries
/// (pass `entry: nil`) and editing existing ones.
struct TimeEntryDetailSheet: View {
    @Environment(\.dismiss) private var dismiss

    // Pass an existing entry to edit it; pass nil to create a new one.
    let entry: TimeEntry?
    let onSave: () -> Void

    // Form state
    @State private var startDateTime = Date()
    @State private var endDateTime = Date()
    @State private var description = ""
    @State private var selectedProject: Project?

    // Supporting data
    @State private var projects: [Project] = []
    @State private var isLoading = false
    @State private var isSaving = false
    @State private var error: String?

    private let apiClient = APIClient()

    init(entry: TimeEntry? = nil, onSave: @escaping () -> Void) {
        self.entry = entry
        self.onSave = onSave
    }

    // MARK: - Body

    var body: some View {
        NavigationStack {
            Form {
                projectSection
                timeSection
                descriptionSection
                if let error { errorSection(error) }
            }
            .navigationTitle(entry == nil ? "New Entry" : "Edit Entry")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    if isSaving {
                        ProgressView().controlSize(.small)
                    } else {
                        Button("Save") { Task { await save() } }
                            .disabled(selectedProject == nil || endDateTime <= startDateTime)
                    }
                }
            }
            .task {
                await loadProjects()
                populateFromEntry()
            }
            .overlay { if isLoading { LoadingView() } }
        }
    }

    // MARK: - Sections

    private var projectSection: some View {
        Section("Project") {
            Picker("Project", selection: $selectedProject) {
                Text("Select Project").tag(nil as Project?)
                ForEach(projects) { project in
                    HStack {
                        ProjectColorDot(color: project.color, size: 10)
                        Text(project.name)
                        Text("· \(project.client.name)")
                            .foregroundStyle(.secondary)
                    }
                    .tag(project as Project?)
                }
            }
            .pickerStyle(.navigationLink)
        }
    }

    private var timeSection: some View {
        Section {
            DatePicker("Start", selection: $startDateTime)
            DatePicker("End", selection: $endDateTime, in: startDateTime...)
            if endDateTime > startDateTime {
                HStack {
                    Text("Duration")
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text(endDateTime.timeIntervalSince(startDateTime).formattedShortDuration)
                        .foregroundStyle(.secondary)
                }
            }
        } header: {
            Text("Time")
        }
    }

    private var descriptionSection: some View {
        Section("Description") {
            TextField("Optional notes…", text: $description, axis: .vertical)
                .lineLimit(3...8)
        }
    }

    private func errorSection(_ message: String) -> some View {
        Section {
            Text(message)
                .font(.caption)
                .foregroundStyle(.red)
        }
    }

    // MARK: - Data loading

    private func loadProjects() async {
        isLoading = true
        do {
            projects = try await apiClient.request(
                endpoint: APIEndpoint.projects,
                authenticated: true
            )
            // Re-apply project selection now that the list is populated
            matchProjectAfterLoad()
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    private func populateFromEntry() {
        guard let entry else {
            // Default: now rounded to minute, 1-hour window
            let now = Date().roundedToMinute()
            startDateTime = now
            endDateTime = now.addingTimeInterval(3600)
            return
        }
        startDateTime = Date.fromISO8601(entry.startTime) ?? Date()
        endDateTime = Date.fromISO8601(entry.endTime) ?? Date()
        description = entry.description ?? ""
        // Pre-select the project once projects are loaded
        if !projects.isEmpty {
            selectedProject = projects.first { $0.id == entry.projectId }
        }
    }

    // Called after projects load — re-apply the project selection if it wasn't
    // set yet (projects may have loaded after populateFromEntry ran).
    private func matchProjectAfterLoad() {
        guard let entry, selectedProject == nil else { return }
        selectedProject = projects.first { $0.id == entry.projectId }
    }

    // MARK: - Save

    private func save() async {
        guard let project = selectedProject else { return }
        isSaving = true
        error = nil

        do {
            if let existingEntry = entry {
                let input = UpdateTimeEntryInput(
                    startTime: startDateTime.iso8601String,
                    endTime: endDateTime.iso8601String,
                    description: description.isEmpty ? nil : description,
                    projectId: project.id
                )
                try await apiClient.requestVoid(
                    endpoint: APIEndpoint.timeEntry(id: existingEntry.id),
                    method: .put,
                    body: input,
                    authenticated: true
                )
            } else {
                let input = CreateTimeEntryInput(
                    startTime: startDateTime,
                    endTime: endDateTime,
                    description: description.isEmpty ? nil : description,
                    projectId: project.id
                )
                try await apiClient.requestVoid(
                    endpoint: APIEndpoint.timeEntries,
                    method: .post,
                    body: input,
                    authenticated: true
                )
            }
            isSaving = false
            dismiss()
            onSave()
        } catch {
            isSaving = false
            self.error = error.localizedDescription
        }
    }
}

// MARK: - Date rounding helper

private extension Date {
    func roundedToMinute() -> Date {
        let cal = Calendar.current
        var comps = cal.dateComponents([.year, .month, .day, .hour, .minute], from: self)
        comps.second = 0
        return cal.date(from: comps) ?? self
    }
}
