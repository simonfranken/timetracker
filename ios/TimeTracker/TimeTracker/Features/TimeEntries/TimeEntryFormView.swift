import SwiftUI

struct TimeEntryFormView: View {
    @Environment(\.dismiss) private var dismiss
    
    let entry: TimeEntry?
    let onSave: () -> Void
    
    @State private var startDate = Date()
    @State private var startTime = Date()
    @State private var endDate = Date()
    @State private var endTime = Date()
    @State private var description = ""
    @State private var selectedProject: Project?
    @State private var projects: [Project] = []
    @State private var isLoading = false
    @State private var error: String?
    
    private let apiClient = APIClient()
    
    init(entry: TimeEntry? = nil, onSave: @escaping () -> Void) {
        self.entry = entry
        self.onSave = onSave
    }
    
    var body: some View {
        NavigationStack {
            Form {
                Section("Project") {
                    Picker("Project", selection: $selectedProject) {
                        Text("Select Project").tag(nil as Project?)
                        ForEach(projects) { project in
                            HStack {
                                ProjectColorDot(color: project.color)
                                Text(project.name)
                            }
                            .tag(project as Project?)
                        }
                    }
                }
                
                Section("Start Time") {
                    DatePicker("Date", selection: $startDate, displayedComponents: .date)
                    DatePicker("Time", selection: $startTime, displayedComponents: .hourAndMinute)
                }
                
                Section("End Time") {
                    DatePicker("Date", selection: $endDate, displayedComponents: .date)
                    DatePicker("Time", selection: $endTime, displayedComponents: .hourAndMinute)
                }
                
                Section("Description (Optional)") {
                    TextField("Description", text: $description, axis: .vertical)
                        .lineLimit(3...6)
                }
            }
            .navigationTitle(entry == nil ? "New Entry" : "Edit Entry")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        save()
                    }
                    .disabled(selectedProject == nil || isLoading)
                }
            }
            .task {
                await loadProjects()
                if let entry = entry {
                    await loadEntry(entry)
                }
            }
        }
    }
    
    private func loadProjects() async {
        do {
            projects = try await apiClient.request(
                endpoint: APIEndpoint.projects,
                authenticated: true
            )
        } catch {
            self.error = error.localizedDescription
        }
    }
    
    private func loadEntry(_ entry: TimeEntry) async {
        let startFormatter = DateFormatter()
        startFormatter.dateFormat = "yyyy-MM-dd"
        let timeFormatter = DateFormatter()
        timeFormatter.dateFormat = "HH:mm"
        
        if let startDateObj = Date.fromISO8601(entry.startTime) {
            startDate = startDateObj
            startTime = startDateObj
        }
        
        if let endDateObj = Date.fromISO8601(entry.endTime) {
            endDate = endDateObj
            endTime = endDateObj
        }
        
        description = entry.description ?? ""
        selectedProject = projects.first { $0.id == entry.projectId }
    }
    
    private func save() {
        guard let project = selectedProject else { return }
        
        isLoading = true
        
        let calendar = Calendar.current
        let startDateTime = calendar.date(bySettingHour: calendar.component(.hour, from: startTime),
                                         minute: calendar.component(.minute, from: startTime),
                                         second: 0,
                                         of: startDate) ?? startDate
        let endDateTime = calendar.date(bySettingHour: calendar.component(.hour, from: endTime),
                                        minute: calendar.component(.minute, from: endTime),
                                        second: 0,
                                        of: endDate) ?? endDate
        
        Task {
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
                
                await MainActor.run {
                    isLoading = false
                    dismiss()
                    onSave()
                }
            } catch {
                let errorMessage = error.localizedDescription
                await MainActor.run {
                    isLoading = false
                    self.error = errorMessage
                }
            }
        }
    }
}
