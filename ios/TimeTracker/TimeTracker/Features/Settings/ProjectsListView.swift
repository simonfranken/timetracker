import SwiftUI

// MARK: - Projects List (under Settings)

struct ProjectsListView: View {
    @State private var projects: [Project] = []
    @State private var clients: [Client] = []
    @State private var isLoading = false
    @State private var error: String?
    @State private var showAddProject = false
    @State private var projectToDelete: Project?
    @State private var showDeleteConfirmation = false

    private let apiClient = APIClient()

    var body: some View {
        Group {
            if isLoading && projects.isEmpty {
                LoadingView()
            } else if let err = error, projects.isEmpty {
                ErrorView(message: err) { Task { await loadData() } }
            } else if projects.isEmpty {
                EmptyView(icon: "folder", title: "No Projects",
                          message: "Create a project to start tracking time.")
            } else {
                projectList
            }
        }
        .navigationTitle("Projects")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button { showAddProject = true } label: { Image(systemName: "plus") }
            }
        }
        .task { await loadData() }
        .sheet(isPresented: $showAddProject) {
            ProjectFormSheet(mode: .create, clients: clients) {
                Task { await loadData() }
            }
        }
        .alert("Delete Project?", isPresented: $showDeleteConfirmation, presenting: projectToDelete) { project in
            Button("Cancel", role: .cancel) {}
            Button("Delete", role: .destructive) { Task { await deleteProject(project) } }
        } message: { project in
            Text("Deleting '\(project.name)' will also delete all its time entries. This cannot be undone.")
        }
    }

    // Group projects by client
    private var projectsByClient: [(clientName: String, projects: [Project])] {
        let grouped = Dictionary(grouping: projects) { $0.client.name }
        return grouped.sorted { $0.key < $1.key }
                      .map { (clientName: $0.key, projects: $0.value.sorted { $0.name < $1.name }) }
    }

    private var projectList: some View {
        List {
            ForEach(projectsByClient, id: \.clientName) { group in
                Section(group.clientName) {
                    ForEach(group.projects) { project in
                        NavigationLink {
                            ProjectDetailView(project: project, clients: clients) {
                                Task { await loadData() }
                            }
                        } label: {
                            ProjectListRow(project: project)
                        }
                    }
                    .onDelete { indexSet in
                        let deleteTargets = indexSet.map { group.projects[$0] }
                        if let first = deleteTargets.first {
                            projectToDelete = first
                            showDeleteConfirmation = true
                        }
                    }
                }
            }
        }
        .refreshable { await loadData() }
    }

    private func loadData() async {
        isLoading = true; error = nil
        do {
            async let fetchProjects: [Project] = apiClient.request(endpoint: APIEndpoint.projects, authenticated: true)
            async let fetchClients: [Client] = apiClient.request(endpoint: APIEndpoint.clients, authenticated: true)
            projects = try await fetchProjects
            clients = try await fetchClients
        } catch { self.error = error.localizedDescription }
        isLoading = false
    }

    private func deleteProject(_ project: Project) async {
        do {
            try await apiClient.requestVoid(endpoint: APIEndpoint.project(id: project.id),
                                            method: .delete, authenticated: true)
            projects.removeAll { $0.id == project.id }
        } catch { self.error = error.localizedDescription }
    }
}

// MARK: - Project list row

struct ProjectListRow: View {
    let project: Project
    var body: some View {
        HStack(spacing: 12) {
            ProjectColorDot(color: project.color, size: 14)
            VStack(alignment: .leading, spacing: 2) {
                Text(project.name).font(.headline)
                if let desc = project.description {
                    Text(desc).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                }
            }
        }
        .padding(.vertical, 2)
    }
}

// MARK: - Project Detail / Edit

struct ProjectDetailView: View {
    let project: Project
    let clients: [Client]
    let onUpdate: () -> Void

    @State private var name: String
    @State private var projectDescription: String
    @State private var selectedColor: String
    @State private var selectedClient: Client?
    @State private var isSaving = false
    @State private var saveError: String?
    @State private var saveSuccess = false

    private let colorPalette = ["#EF4444", "#F97316", "#EAB308", "#22C55E", "#14B8A6",
                                "#06B6D4", "#3B82F6", "#6366F1", "#A855F7", "#EC4899"]
    private let apiClient = APIClient()

    init(project: Project, clients: [Client], onUpdate: @escaping () -> Void) {
        self.project = project
        self.clients = clients
        self.onUpdate = onUpdate
        _name = State(initialValue: project.name)
        _projectDescription = State(initialValue: project.description ?? "")
        _selectedColor = State(initialValue: project.color ?? "#3B82F6")
        _selectedClient = State(initialValue: clients.first { $0.id == project.clientId })
    }

    var body: some View {
        Form {
            Section("Name") {
                TextField("Project name", text: $name)
            }

            Section("Description (optional)") {
                TextField("Description", text: $projectDescription, axis: .vertical)
                    .lineLimit(2...5)
            }

            Section("Colour") {
                LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 5), spacing: 16) {
                    ForEach(colorPalette, id: \.self) { color in
                        Circle()
                            .fill(Color(hex: color))
                            .frame(width: 44, height: 44)
                            .overlay(
                                Circle().strokeBorder(
                                    Color.primary,
                                    lineWidth: selectedColor == color ? 3 : 0
                                )
                            )
                            .onTapGesture { selectedColor = color }
                    }
                }
                .padding(.vertical, 8)
            }

            Section("Client") {
                Picker("Client", selection: $selectedClient) {
                    Text("Select Client").tag(nil as Client?)
                    ForEach(clients) { client in
                        Text(client.name).tag(client as Client?)
                    }
                }
                .pickerStyle(.navigationLink)
            }

            if let err = saveError {
                Section { Text(err).font(.caption).foregroundStyle(.red) }
            }
            if saveSuccess {
                Section { Label("Saved", systemImage: "checkmark.circle").foregroundStyle(.green) }
            }

            Section {
                Button(isSaving ? "Saving…" : "Save Project") {
                    Task { await save() }
                }
                .disabled(name.isEmpty || selectedClient == nil || isSaving)
            }
        }
        .navigationTitle(project.name)
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            // Ensure selectedClient resolves correctly once clients are available
            if selectedClient == nil {
                selectedClient = clients.first { $0.id == project.clientId }
            }
        }
    }

    private func save() async {
        guard let client = selectedClient else { return }
        isSaving = true; saveError = nil; saveSuccess = false
        do {
            let input = UpdateProjectInput(
                name: name,
                description: projectDescription.isEmpty ? nil : projectDescription,
                color: selectedColor,
                clientId: client.id
            )
            let _: Project = try await apiClient.request(
                endpoint: APIEndpoint.project(id: project.id),
                method: .put,
                body: input,
                authenticated: true
            )
            saveSuccess = true
            onUpdate()
        } catch { saveError = error.localizedDescription }
        isSaving = false
    }
}

// MARK: - Project Form Sheet (create)

struct ProjectFormSheet: View {
    enum Mode { case create }

    @Environment(\.dismiss) private var dismiss

    let mode: Mode
    let clients: [Client]
    let onSave: () -> Void

    @State private var name = ""
    @State private var description = ""
    @State private var selectedColor = "#3B82F6"
    @State private var selectedClient: Client?
    @State private var isSaving = false
    @State private var error: String?

    private let colorPalette = ["#EF4444", "#F97316", "#EAB308", "#22C55E", "#14B8A6",
                                "#06B6D4", "#3B82F6", "#6366F1", "#A855F7", "#EC4899"]
    private let apiClient = APIClient()

    var body: some View {
        NavigationStack {
            Form {
                Section("Name") {
                    TextField("Project name", text: $name)
                }
                Section("Description (optional)") {
                    TextField("Description", text: $description, axis: .vertical)
                        .lineLimit(2...5)
                }
                Section("Colour") {
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 5), spacing: 16) {
                        ForEach(colorPalette, id: \.self) { color in
                            Circle()
                                .fill(Color(hex: color))
                                .frame(width: 44, height: 44)
                                .overlay(
                                    Circle().strokeBorder(
                                        Color.primary,
                                        lineWidth: selectedColor == color ? 3 : 0
                                    )
                                )
                                .onTapGesture { selectedColor = color }
                        }
                    }
                    .padding(.vertical, 8)
                }
                Section("Client") {
                    Picker("Client", selection: $selectedClient) {
                        Text("Select Client").tag(nil as Client?)
                        ForEach(clients) { client in
                            Text(client.name).tag(client as Client?)
                        }
                    }
                    .pickerStyle(.navigationLink)
                }
                if let error {
                    Section { Text(error).font(.caption).foregroundStyle(.red) }
                }
            }
            .navigationTitle("New Project")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isSaving ? "Saving…" : "Save") {
                        Task { await save() }
                    }
                    .disabled(name.isEmpty || selectedClient == nil || isSaving)
                }
            }
        }
    }

    private func save() async {
        guard let client = selectedClient else { return }
        isSaving = true; error = nil
        do {
            let input = CreateProjectInput(
                name: name,
                description: description.isEmpty ? nil : description,
                color: selectedColor,
                clientId: client.id
            )
            let _: Project = try await apiClient.request(
                endpoint: APIEndpoint.projects, method: .post, body: input, authenticated: true
            )
            isSaving = false
            dismiss()
            onSave()
        } catch {
            isSaving = false
            self.error = error.localizedDescription
        }
    }
}
