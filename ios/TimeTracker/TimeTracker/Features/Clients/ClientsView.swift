import SwiftUI

struct ClientsView: View {
    @StateObject private var viewModel = ClientsViewModel()
    @State private var showAddClient = false
    @State private var clientToDelete: Client?
    @State private var showDeleteConfirmation = false
    
    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.clients.isEmpty {
                    LoadingView()
                } else if let error = viewModel.error, viewModel.clients.isEmpty {
                    ErrorView(message: error) {
                        Task { await viewModel.loadClients() }
                    }
                } else if viewModel.clients.isEmpty {
                    EmptyView(
                        icon: "person.2",
                        title: "No Clients",
                        message: "Create a client to organize your projects."
                    )
                } else {
                    clientsList
                }
            }
            .navigationTitle("Clients")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showAddClient = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .task {
                await viewModel.loadClients()
            }
            .sheet(isPresented: $showAddClient) {
                ClientFormView(onSave: { name, description in
                    Task {
                        await viewModel.createClient(name: name, description: description)
                    }
                })
            }
        }
    }
    
    private var clientsList: some View {
        List {
            ForEach(viewModel.clients) { client in
                ClientRow(client: client)
            }
            .onDelete { indexSet in
                if let index = indexSet.first {
                    clientToDelete = viewModel.clients[index]
                    showDeleteConfirmation = true
                }
            }
        }
        .alert("Delete Client?", isPresented: $showDeleteConfirmation, presenting: clientToDelete) { client in
            Button("Cancel", role: .cancel) {}
            Button("Delete", role: .destructive) {
                Task {
                    await viewModel.deleteClient(client)
                }
            }
        } message: { client in
            Text("This will permanently delete '\(client.name)' and all related projects and time entries. This action cannot be undone.")
        }
        .refreshable {
            await viewModel.loadClients()
        }
    }
}

struct ClientRow: View {
    let client: Client
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(client.name)
                .font(.headline)
            if let description = client.description {
                Text(description)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
        }
    }
}

struct ClientFormView: View {
    @Environment(\.dismiss) private var dismiss
    
    let onSave: (String, String?) -> Void
    
    @State private var name = ""
    @State private var description = ""
    
    var body: some View {
        NavigationStack {
            Form {
                Section("Name") {
                    TextField("Client name", text: $name)
                }
                
                Section("Description (Optional)") {
                    TextField("Description", text: $description, axis: .vertical)
                        .lineLimit(3...6)
                }
            }
            .navigationTitle("New Client")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        onSave(name, description.isEmpty ? nil : description)
                        dismiss()
                    }
                    .disabled(name.isEmpty)
                }
            }
        }
    }
}
