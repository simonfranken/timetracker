import SwiftUI

struct ProjectsView: View {
    @StateObject private var viewModel = ProjectsViewModel()
    @State private var showAddProject = false
    
    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.projects.isEmpty {
                    LoadingView()
                } else if let error = viewModel.error, viewModel.projects.isEmpty {
                    ErrorView(message: error) {
                        Task { await viewModel.loadData() }
                    }
                } else if viewModel.projects.isEmpty {
                    EmptyView(
                        icon: "folder",
                        title: "No Projects",
                        message: "Create a project to start tracking time."
                    )
                } else {
                    projectsList
                }
            }
            .navigationTitle("Projects")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showAddProject = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .task {
                await viewModel.loadData()
            }
            .sheet(isPresented: $showAddProject) {
                ProjectFormView(
                    clients: viewModel.clients,
                    onSave: { name, description, color, clientId in
                        Task {
                            await viewModel.createProject(
                                name: name,
                                description: description,
                                color: color,
                                clientId: clientId
                            )
                        }
                    }
                )
            }
        }
    }
    
    private var projectsList: some View {
        List {
            ForEach(viewModel.projects) { project in
                ProjectRow(project: project)
            }
            .onDelete { indexSet in
                Task {
                    for index in indexSet {
                        await viewModel.deleteProject(viewModel.projects[index])
                    }
                }
            }
        }
        .refreshable {
            await viewModel.loadData()
        }
    }
}

struct ProjectRow: View {
    let project: Project
    
    var body: some View {
        HStack {
            ProjectColorDot(color: project.color, size: 16)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(project.name)
                    .font(.headline)
                Text(project.client.name)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

struct ProjectFormView: View {
    @Environment(\.dismiss) private var dismiss
    
    let clients: [Client]
    let onSave: (String, String?, String?, String) -> Void
    
    @State private var name = ""
    @State private var description = ""
    @State private var selectedColor: String = "#3B82F6"
    @State private var selectedClient: Client?
    
    private let colors = ["#EF4444", "#F97316", "#EAB308", "#22C55E", "#14B8A6", 
                          "#06B6D4", "#3B82F6", "#6366F1", "#A855F7", "#EC4899"]
    
    var body: some View {
        NavigationStack {
            Form {
                Section("Name") {
                    TextField("Project name", text: $name)
                }
                
                Section("Description (Optional)") {
                    TextField("Description", text: $description, axis: .vertical)
                        .lineLimit(3...6)
                }
                
                Section("Color") {
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 5), spacing: 16) {
                        ForEach(colors, id: \.self) { color in
                            Circle()
                                .fill(Color(hex: color))
                                .frame(width: 44, height: 44)
                                .overlay(
                                    Circle()
                                        .strokeBorder(Color.primary, lineWidth: selectedColor == color ? 3 : 0)
                                )
                                .onTapGesture {
                                    selectedColor = color
                                }
                        }
                    }
                    .padding(.vertical, 8)
                }
                
                Section("Client") {
                    Picker("Client", selection: $selectedClient) {
                        Text("Select Client").tag(nil as Client?)
                        ForEach(clients) { client in
                            Text(client.name)
                                .tag(client as Client?)
                        }
                    }
                }
            }
            .navigationTitle("New Project")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        guard let client = selectedClient else { return }
                        onSave(name, description.isEmpty ? nil : description, selectedColor, client.id)
                        dismiss()
                    }
                    .disabled(name.isEmpty || selectedClient == nil)
                }
            }
        }
    }
}
