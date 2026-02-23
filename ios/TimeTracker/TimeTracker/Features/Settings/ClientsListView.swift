import SwiftUI

// MARK: - Clients List

struct ClientsListView: View {
    @State private var clients: [Client] = []
    @State private var isLoading = false
    @State private var error: String?
    @State private var showAddClient = false
    @State private var clientToDelete: Client?
    @State private var showDeleteConfirmation = false

    private let apiClient = APIClient()

    var body: some View {
        Group {
            if isLoading && clients.isEmpty {
                LoadingView()
            } else if let err = error, clients.isEmpty {
                ErrorView(message: err) { Task { await loadClients() } }
            } else if clients.isEmpty {
                EmptyView(icon: "person.2", title: "No Clients",
                          message: "Create a client to organise your projects.")
            } else {
                List {
                    ForEach(clients) { client in
                        NavigationLink {
                            ClientDetailView(client: client, onUpdate: { Task { await loadClients() } })
                        } label: {
                            ClientRow(client: client)
                        }
                    }
                    .onDelete { indexSet in
                        if let i = indexSet.first {
                            clientToDelete = clients[i]
                            showDeleteConfirmation = true
                        }
                    }
                }
                .refreshable { await loadClients() }
            }
        }
        .navigationTitle("Clients")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button { showAddClient = true } label: { Image(systemName: "plus") }
            }
        }
        .task { await loadClients() }
        .sheet(isPresented: $showAddClient) {
            ClientFormSheet(mode: .create) { Task { await loadClients() } }
        }
        .alert("Delete Client?", isPresented: $showDeleteConfirmation, presenting: clientToDelete) { client in
            Button("Cancel", role: .cancel) {}
            Button("Delete", role: .destructive) { Task { await deleteClient(client) } }
        } message: { client in
            Text("Deleting '\(client.name)' will also delete all its projects and time entries. This cannot be undone.")
        }
    }

    private func loadClients() async {
        isLoading = true; error = nil
        do {
            clients = try await apiClient.request(endpoint: APIEndpoint.clients, authenticated: true)
        } catch { self.error = error.localizedDescription }
        isLoading = false
    }

    private func deleteClient(_ client: Client) async {
        do {
            try await apiClient.requestVoid(endpoint: APIEndpoint.client(id: client.id),
                                            method: .delete, authenticated: true)
            clients.removeAll { $0.id == client.id }
        } catch { self.error = error.localizedDescription }
    }
}

struct ClientRow: View {
    let client: Client
    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(client.name).font(.headline)
            if let desc = client.description {
                Text(desc).font(.subheadline).foregroundStyle(.secondary).lineLimit(2)
            }
        }
        .padding(.vertical, 2)
    }
}

// MARK: - Client Detail / Edit + Target Management

struct ClientDetailView: View {
    let client: Client
    let onUpdate: () -> Void

    // Edit client fields
    @State private var name: String
    @State private var clientDescription: String
    @State private var isSavingClient = false
    @State private var clientSaveError: String?
    @State private var clientSaveSuccess = false

    // Client targets
    @State private var target: ClientTarget?
    @State private var isLoadingTarget = false
    @State private var targetError: String?

    // New target form
    @State private var showNewTargetForm = false
    @State private var newWeeklyHours = 40.0
    @State private var newStartDate = Date().nextMonday()
    @State private var isSavingTarget = false

    // Edit target inline
    @State private var editingWeeklyHours: Double?
    @State private var editingStartDate: Date?
    @State private var isEditingTarget = false

    // Balance correction
    @State private var showAddCorrection = false
    @State private var correctionDate = Date()
    @State private var correctionHours = 0.0
    @State private var correctionDescription = ""
    @State private var isSavingCorrection = false
    @State private var correctionToDelete: BalanceCorrection?
    @State private var showDeleteCorrection = false

    private let apiClient = APIClient()

    init(client: Client, onUpdate: @escaping () -> Void) {
        self.client = client
        self.onUpdate = onUpdate
        _name = State(initialValue: client.name)
        _clientDescription = State(initialValue: client.description ?? "")
    }

    var body: some View {
        Form {
            clientEditSection
            targetSection
            if let target { correctionsSection(target) }
        }
        .navigationTitle(client.name)
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadTarget() }
        .sheet(isPresented: $showAddCorrection) {
            addCorrectionSheet
        }
    }

    // MARK: - Client edit

    private var clientEditSection: some View {
        Section("Client Details") {
            TextField("Name", text: $name)
            TextField("Description (optional)", text: $clientDescription, axis: .vertical)
                .lineLimit(2...4)

            if let err = clientSaveError {
                Text(err).font(.caption).foregroundStyle(.red)
            }
            if clientSaveSuccess {
                Label("Saved", systemImage: "checkmark.circle").foregroundStyle(.green).font(.caption)
            }

            Button(isSavingClient ? "Saving…" : "Save Client Details") {
                Task { await saveClient() }
            }
            .disabled(name.isEmpty || isSavingClient)
        }
    }

    private func saveClient() async {
        isSavingClient = true; clientSaveError = nil; clientSaveSuccess = false
        do {
            let input = UpdateClientInput(
                name: name,
                description: clientDescription.isEmpty ? nil : clientDescription
            )
            let _: Client = try await apiClient.request(
                endpoint: APIEndpoint.client(id: client.id),
                method: .put,
                body: input,
                authenticated: true
            )
            clientSaveSuccess = true
            onUpdate()
        } catch { clientSaveError = error.localizedDescription }
        isSavingClient = false
    }

    // MARK: - Target section

    private var targetSection: some View {
        Section {
            if isLoadingTarget {
                HStack { Spacer(); ProgressView(); Spacer() }
            } else if let err = targetError {
                Text(err).font(.caption).foregroundStyle(.red)
            } else if let target {
                // Show existing target + balance
                targetSummaryRows(target)
                if isEditingTarget {
                    targetEditRows(target)
                } else {
                    Button("Edit Target") { startEditingTarget(target) }
                }
            } else {
                // No target yet
                if showNewTargetForm {
                    newTargetFormRows
                } else {
                    Button("Set Up Work Time Target") { showNewTargetForm = true }
                }
            }
        } header: {
            Text("Work Time Target")
        }
    }

    private func targetSummaryRows(_ t: ClientTarget) -> some View {
        Group {
            HStack {
                Text("Weekly hours")
                Spacer()
                Text("\(t.weeklyHours, specifier: "%.1f") h/week")
                    .foregroundStyle(.secondary)
            }
            HStack {
                Text("Tracking since")
                Spacer()
                Text(formatDate(t.startDate))
                    .foregroundStyle(.secondary)
            }
            HStack {
                Text("This week")
                Spacer()
                Text("\(TimeInterval(t.currentWeekTrackedSeconds).formattedShortDuration) / \(TimeInterval(t.currentWeekTargetSeconds).formattedShortDuration)")
                    .foregroundStyle(.secondary)
            }
            HStack {
                Text("Total balance")
                Spacer()
                let balance = TimeInterval(abs(t.totalBalanceSeconds))
                Text(t.totalBalanceSeconds >= 0 ? "+\(balance.formattedShortDuration)" : "-\(balance.formattedShortDuration)")
                    .fontWeight(.medium)
                    .foregroundStyle(t.totalBalanceSeconds >= 0 ? .green : .red)
            }
        }
    }

    private func targetEditRows(_ t: ClientTarget) -> some View {
        Group {
            HStack {
                Text("Weekly hours")
                Spacer()
                TextField("Hours", value: Binding(
                    get: { editingWeeklyHours ?? t.weeklyHours },
                    set: { editingWeeklyHours = $0 }
                ), format: .number)
                .keyboardType(.decimalPad)
                .multilineTextAlignment(.trailing)
                .frame(width: 80)
            }

            DatePicker("Start date (Monday)",
                       selection: Binding(
                           get: { editingStartDate ?? parseDate(t.startDate) ?? Date() },
                           set: { editingStartDate = $0 }
                       ),
                       displayedComponents: .date)

            HStack {
                Button("Cancel") { isEditingTarget = false; editingWeeklyHours = nil; editingStartDate = nil }
                    .foregroundStyle(.secondary)
                Spacer()
                Button(isSavingTarget ? "Saving…" : "Save Target") {
                    Task { await saveTarget(existingId: t.id) }
                }
                .disabled(isSavingTarget)
            }
        }
    }

    private var newTargetFormRows: some View {
        Group {
            HStack {
                Text("Weekly hours")
                Spacer()
                TextField("Hours", value: $newWeeklyHours, format: .number)
                    .keyboardType(.decimalPad)
                    .multilineTextAlignment(.trailing)
                    .frame(width: 80)
            }
            DatePicker("Start date (Monday)", selection: $newStartDate, displayedComponents: .date)

            HStack {
                Button("Cancel") { showNewTargetForm = false }
                    .foregroundStyle(.secondary)
                Spacer()
                Button(isSavingTarget ? "Saving…" : "Create Target") {
                    Task { await createTarget() }
                }
                .disabled(newWeeklyHours <= 0 || isSavingTarget)
            }
        }
    }

    private func startEditingTarget(_ t: ClientTarget) {
        editingWeeklyHours = t.weeklyHours
        editingStartDate = parseDate(t.startDate)
        isEditingTarget = true
    }

    // MARK: - Corrections section

    private func correctionsSection(_ t: ClientTarget) -> some View {
        Section {
            if t.corrections.isEmpty {
                Text("No corrections")
                    .foregroundStyle(.secondary)
                    .font(.subheadline)
            } else {
                ForEach(t.corrections) { correction in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(formatDate(correction.date))
                                .font(.subheadline)
                            if let desc = correction.description {
                                Text(desc).font(.caption).foregroundStyle(.secondary)
                            }
                        }
                        Spacer()
                        Text(correction.hours >= 0 ? "+\(correction.hours, specifier: "%.1f")h" : "\(correction.hours, specifier: "%.1f")h")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundStyle(correction.hours >= 0 ? .green : .red)
                    }
                }
                .onDelete { indexSet in
                    if let i = indexSet.first {
                        correctionToDelete = t.corrections[i]
                        showDeleteCorrection = true
                    }
                }
            }

            Button("Add Correction") { showAddCorrection = true }
        } header: {
            Text("Balance Corrections")
        }
        .alert("Delete Correction?", isPresented: $showDeleteCorrection, presenting: correctionToDelete) { correction in
            Button("Cancel", role: .cancel) {}
            Button("Delete", role: .destructive) {
                Task { await deleteCorrection(correction) }
            }
        } message: { correction in
            Text("Remove the \(correction.hours >= 0 ? "+" : "")\(correction.hours, specifier: "%.1f")h correction on \(formatDate(correction.date))?")
        }
    }

    // MARK: - Add correction sheet

    private var addCorrectionSheet: some View {
        NavigationStack {
            Form {
                Section("Date") {
                    DatePicker("Date", selection: $correctionDate, displayedComponents: .date)
                }
                Section("Hours adjustment") {
                    HStack {
                        TextField("Hours (positive = bonus, negative = penalty)",
                                  value: $correctionHours, format: .number)
                            .keyboardType(.numbersAndPunctuation)
                        Text("h").foregroundStyle(.secondary)
                    }
                    Text("Positive values reduce the weekly target; negative values increase it.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Section("Description (optional)") {
                    TextField("Note", text: $correctionDescription)
                }
            }
            .navigationTitle("Add Correction")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { showAddCorrection = false }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isSavingCorrection ? "Saving…" : "Add") {
                        Task { await addCorrection() }
                    }
                    .disabled(correctionHours == 0 || isSavingCorrection)
                }
            }
        }
    }

    // MARK: - API calls

    private func loadTarget() async {
        isLoadingTarget = true; targetError = nil
        do {
            let allTargets: [ClientTarget] = try await apiClient.request(
                endpoint: APIEndpoint.clientTargets, authenticated: true
            )
            target = allTargets.first { $0.clientId == client.id }
        } catch { targetError = error.localizedDescription }
        isLoadingTarget = false
    }

    private func createTarget() async {
        isSavingTarget = true
        do {
            let input = CreateClientTargetInput(
                clientId: client.id,
                weeklyHours: newWeeklyHours,
                startDate: newStartDate.iso8601FullDate
            )
            let created: ClientTarget = try await apiClient.request(
                endpoint: APIEndpoint.clientTargets,
                method: .post,
                body: input,
                authenticated: true
            )
            target = created
            showNewTargetForm = false
        } catch { targetError = error.localizedDescription }
        isSavingTarget = false
    }

    private func saveTarget(existingId: String) async {
        isSavingTarget = true
        do {
            let input = UpdateClientTargetInput(
                weeklyHours: editingWeeklyHours,
                startDate: editingStartDate?.iso8601FullDate
            )
            let _: ClientTarget = try await apiClient.request(
                endpoint: APIEndpoint.clientTarget(id: existingId),
                method: .put,
                body: input,
                authenticated: true
            )
            isEditingTarget = false
            editingWeeklyHours = nil
            editingStartDate = nil
            await loadTarget()        // reload to get fresh balance
        } catch { targetError = error.localizedDescription }
        isSavingTarget = false
    }

    private func addCorrection() async {
        guard let t = target else { return }
        isSavingCorrection = true
        do {
            let input = CreateBalanceCorrectionInput(
                date: correctionDate.iso8601FullDate,
                hours: correctionHours,
                description: correctionDescription.isEmpty ? nil : correctionDescription
            )
            try await apiClient.requestVoid(
                endpoint: APIEndpoint.clientTargetCorrections(targetId: t.id),
                method: .post,
                body: input,
                authenticated: true
            )
            correctionHours = 0
            correctionDescription = ""
            showAddCorrection = false
            await loadTarget()
        } catch { targetError = error.localizedDescription }
        isSavingCorrection = false
    }

    private func deleteCorrection(_ correction: BalanceCorrection) async {
        guard let t = target else { return }
        do {
            try await apiClient.requestVoid(
                endpoint: APIEndpoint.clientTargetCorrection(targetId: t.id, correctionId: correction.id),
                method: .delete,
                authenticated: true
            )
            await loadTarget()
        } catch { targetError = error.localizedDescription }
    }

    // MARK: - Helpers

    private func formatDate(_ string: String) -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        guard let d = f.date(from: string) else { return string }
        let out = DateFormatter()
        out.dateStyle = .medium
        return out.string(from: d)
    }

    private func parseDate(_ string: String) -> Date? {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f.date(from: string)
    }
}

// MARK: - Client Form Sheet (create / edit)

struct ClientFormSheet: View {
    enum Mode {
        case create
        case edit(Client)
    }

    @Environment(\.dismiss) private var dismiss

    let mode: Mode
    let onSave: () -> Void

    @State private var name = ""
    @State private var description = ""
    @State private var isSaving = false
    @State private var error: String?

    private let apiClient = APIClient()

    init(mode: Mode, onSave: @escaping () -> Void) {
        self.mode = mode
        self.onSave = onSave
        if case .edit(let client) = mode {
            _name = State(initialValue: client.name)
            _description = State(initialValue: client.description ?? "")
        }
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Name") {
                    TextField("Client name", text: $name)
                }
                Section("Description (optional)") {
                    TextField("Description", text: $description, axis: .vertical)
                        .lineLimit(3...6)
                }
                if let error {
                    Section { Text(error).font(.caption).foregroundStyle(.red) }
                }
            }
            .navigationTitle(isEditing ? "Edit Client" : "New Client")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isSaving ? "Saving…" : "Save") {
                        Task { await save() }
                    }
                    .disabled(name.isEmpty || isSaving)
                }
            }
        }
    }

    private var isEditing: Bool {
        if case .edit = mode { return true }
        return false
    }

    private func save() async {
        isSaving = true; error = nil
        do {
            switch mode {
            case .create:
                let input = CreateClientInput(name: name, description: description.isEmpty ? nil : description)
                let _: Client = try await apiClient.request(
                    endpoint: APIEndpoint.clients, method: .post, body: input, authenticated: true
                )
            case .edit(let client):
                let input = UpdateClientInput(name: name, description: description.isEmpty ? nil : description)
                let _: Client = try await apiClient.request(
                    endpoint: APIEndpoint.client(id: client.id), method: .put, body: input, authenticated: true
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

// MARK: - Date extension

private extension Date {
    func nextMonday() -> Date {
        let cal = Calendar.current
        var comps = DateComponents()
        comps.weekday = 2 // Monday
        return cal.nextDate(after: self, matching: comps, matchingPolicy: .nextTime) ?? self
    }
}
