import SwiftUI

struct TimeEntriesView: View {
    @StateObject private var viewModel = TimeEntriesViewModel()
    @State private var selectedDay: Date? = Calendar.current.startOfDay(for: Date())
    @State private var showFilterSheet = false
    @State private var showAddEntry = false
    @State private var entryToEdit: TimeEntry?
    @State private var entryToDelete: TimeEntry?
    @State private var showDeleteConfirmation = false

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.entries.isEmpty {
                    LoadingView()
                } else if let error = viewModel.error, viewModel.entries.isEmpty {
                    ErrorView(message: error) {
                        Task { await viewModel.loadEntries() }
                    }
                } else {
                    mainContent
                }
            }
            .navigationTitle("Entries")
            .toolbar { toolbarContent }
            .task { await viewModel.loadEntries() }
            .refreshable { await viewModel.loadEntries() }
            .sheet(isPresented: $showFilterSheet) {
                TimeEntriesFilterSheet(viewModel: viewModel) {
                    Task { await viewModel.loadEntries() }
                }
            }
            .sheet(isPresented: $showAddEntry) {
                TimeEntryDetailSheet(entry: nil) {
                    Task { await viewModel.loadEntries() }
                }
            }
            .sheet(item: $entryToEdit) { entry in
                TimeEntryDetailSheet(entry: entry) {
                    Task { await viewModel.loadEntries() }
                }
            }
            .alert("Delete Entry?", isPresented: $showDeleteConfirmation, presenting: entryToDelete) { entry in
                Button("Cancel", role: .cancel) {}
                Button("Delete", role: .destructive) {
                    Task { await viewModel.deleteEntry(entry) }
                }
            } message: { entry in
                Text("Delete the time entry for '\(entry.project.name)'? This cannot be undone.")
            }
        }
    }

    // MARK: - Toolbar

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        ToolbarItem(placement: .primaryAction) {
            Button { showAddEntry = true } label: { Image(systemName: "plus") }
        }
        ToolbarItem(placement: .topBarLeading) {
            Button {
                Task { await viewModel.loadFilterSupportData() }
                showFilterSheet = true
            } label: {
                Image(systemName: viewModel.activeFilters.isEmpty ? "line.3.horizontal.decrease.circle" : "line.3.horizontal.decrease.circle.fill")
            }
        }
    }

    // MARK: - Main content

    private var mainContent: some View {
        ScrollView {
            VStack(spacing: 0) {
                // Month calendar
                CalendarGridView(
                    daysWithEntries: viewModel.daysWithEntries,
                    selectedDay: $selectedDay
                )
                .padding(.horizontal)
                .padding(.top, 8)

                Divider().padding(.top, 8)

                // Day detail — entries for the selected day
                if let day = selectedDay {
                    dayEntriesSection(for: day)
                } else {
                    allEntriesSection
                }
            }
        }
    }

    // MARK: - Day entries section

    private func dayEntriesSection(for day: Date) -> some View {
        let dayEntries = viewModel.entries(for: day)
        return VStack(alignment: .leading, spacing: 0) {
            // Section header
            HStack {
                Text(dayTitle(day))
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(.primary)
                Spacer()
                Text(dayEntries.isEmpty ? "No entries" : "\(dayEntries.count) \(dayEntries.count == 1 ? "entry" : "entries")")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal)
            .padding(.vertical, 12)

            if dayEntries.isEmpty {
                Text("No entries for this day")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 32)
            } else {
                ForEach(Array(dayEntries.enumerated()), id: \.element.id) { index, entry in
                    EntryRow(entry: entry)
                        .contentShape(Rectangle())
                        .onTapGesture { entryToEdit = entry }
                        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                            Button(role: .destructive) {
                                entryToDelete = entry
                                showDeleteConfirmation = true
                            } label: {
                                Label("Delete", systemImage: "trash")
                            }
                        }
                    if index < dayEntries.count - 1 {
                        Divider().padding(.leading, 56)
                    }
                }
            }
        }
    }

    // MARK: - All entries (no day selected) — grouped by day

    private var allEntriesSection: some View {
        LazyVStack(alignment: .leading, pinnedViews: .sectionHeaders) {
            ForEach(viewModel.entriesByDay, id: \.date) { group in
                Section {
                    ForEach(Array(group.entries.enumerated()), id: \.element.id) { index, entry in
                        EntryRow(entry: entry)
                            .contentShape(Rectangle())
                            .onTapGesture { entryToEdit = entry }
                            .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                                Button(role: .destructive) {
                                    entryToDelete = entry
                                    showDeleteConfirmation = true
                                } label: {
                                    Label("Delete", systemImage: "trash")
                                }
                            }
                        if index < group.entries.count - 1 {
                            Divider().padding(.leading, 56)
                        }
                    }
                } header: {
                    Text(dayTitle(group.date))
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .padding(.horizontal)
                        .padding(.vertical, 8)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(.regularMaterial)
                }
            }
        }
    }

    // MARK: - Helpers

    private func dayTitle(_ date: Date) -> String {
        let cal = Calendar.current
        if cal.isDateInToday(date) { return "Today" }
        if cal.isDateInYesterday(date) { return "Yesterday" }
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE, MMM d"
        return formatter.string(from: date)
    }
}

// MARK: - Entry Row

struct EntryRow: View {
    let entry: TimeEntry

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            // Color dot
            ProjectColorDot(color: entry.project.color, size: 12)
                .padding(.top, 4)

            VStack(alignment: .leading, spacing: 3) {
                Text(entry.project.name)
                    .font(.subheadline)
                    .fontWeight(.medium)

                HStack(spacing: 6) {
                    Text(timeRange)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text("·")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(entry.project.client.name)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                if let desc = entry.description, !desc.isEmpty {
                    Text(desc)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }
            }

            Spacer()

            Text(entry.duration.formattedShortDuration)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding(.horizontal)
        .padding(.vertical, 10)
    }

    private var timeRange: String {
        let fmt = DateFormatter()
        fmt.dateFormat = "HH:mm"
        let start = Date.fromISO8601(entry.startTime).map { fmt.string(from: $0) } ?? ""
        let end = Date.fromISO8601(entry.endTime).map { fmt.string(from: $0) } ?? ""
        return "\(start) – \(end)"
    }
}

// MARK: - Calendar Grid View (UICalendarView wrapper)

struct CalendarGridView: UIViewRepresentable {
    let daysWithEntries: Set<Date>
    @Binding var selectedDay: Date?

    func makeUIView(context: Context) -> UICalendarView {
        let view = UICalendarView()
        view.calendar = .current
        view.locale = .current
        view.fontDesign = .rounded
        view.delegate = context.coordinator

        let selection = UICalendarSelectionSingleDate(delegate: context.coordinator)
        if let day = selectedDay {
            selection.selectedDate = Calendar.current.dateComponents([.year, .month, .day], from: day)
        }
        view.selectionBehavior = selection

        // Show current month
        let today = Date()
        let comps = Calendar.current.dateComponents([.year, .month], from: today)
        if let startOfMonth = Calendar.current.date(from: comps) {
            view.visibleDateComponents = Calendar.current.dateComponents(
                [.year, .month, .day], from: startOfMonth
            )
        }
        return view
    }

    func updateUIView(_ uiView: UICalendarView, context: Context) {
        // Reload all decorations when daysWithEntries changes
        uiView.reloadDecorations(forDateComponents: Array(daysWithEntries.map {
            Calendar.current.dateComponents([.year, .month, .day], from: $0)
        }), animated: false)
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(parent: self)
    }

    final class Coordinator: NSObject, UICalendarViewDelegate, UICalendarSelectionSingleDateDelegate {
        var parent: CalendarGridView

        init(parent: CalendarGridView) {
            self.parent = parent
        }

        // Dot decorations for days that have entries
        func calendarView(_ calendarView: UICalendarView,
                          decorationFor dateComponents: DateComponents) -> UICalendarView.Decoration? {
            guard let date = Calendar.current.date(from: dateComponents) else { return nil }
            let normalized = Calendar.current.startOfDay(for: date)
            guard parent.daysWithEntries.contains(normalized) else { return nil }
            return .default(color: .systemBlue, size: .small)
        }

        // Date selection
        func dateSelection(_ selection: UICalendarSelectionSingleDate,
                           didSelectDate dateComponents: DateComponents?) {
            guard let comps = dateComponents,
                  let date = Calendar.current.date(from: comps) else {
                parent.selectedDay = nil
                return
            }
            let normalized = Calendar.current.startOfDay(for: date)
            // Tap same day again to deselect
            if let current = parent.selectedDay, Calendar.current.isDate(current, inSameDayAs: normalized) {
                parent.selectedDay = nil
                selection.selectedDate = nil
            } else {
                parent.selectedDay = normalized
            }
        }

        func dateSelection(_ selection: UICalendarSelectionSingleDate,
                           canSelectDate dateComponents: DateComponents?) -> Bool { true }
    }
}

// MARK: - Filter Sheet

struct TimeEntriesFilterSheet: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var viewModel: TimeEntriesViewModel
    let onApply: () -> Void

    @State private var startDate: Date = Calendar.current.date(byAdding: .month, value: -1, to: Date()) ?? Date()
    @State private var endDate: Date = Date()
    @State private var useStartDate = false
    @State private var useEndDate = false
    @State private var selectedProjectId: String?
    @State private var selectedProjectName: String?
    @State private var selectedClientId: String?
    @State private var selectedClientName: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("Date Range") {
                    Toggle("From", isOn: $useStartDate)
                    if useStartDate {
                        DatePicker("", selection: $startDate, displayedComponents: .date)
                            .labelsHidden()
                    }
                    Toggle("To", isOn: $useEndDate)
                    if useEndDate {
                        DatePicker("", selection: $endDate, displayedComponents: .date)
                            .labelsHidden()
                    }
                }

                Section("Project") {
                    Picker("Project", selection: $selectedProjectId) {
                        Text("Any Project").tag(nil as String?)
                        ForEach(viewModel.projects) { project in
                            HStack {
                                ProjectColorDot(color: project.color, size: 10)
                                Text(project.name)
                            }
                            .tag(project.id as String?)
                        }
                    }
                    .pickerStyle(.navigationLink)
                    .onChange(of: selectedProjectId) { _, newId in
                        selectedProjectName = viewModel.projects.first { $0.id == newId }?.name
                    }
                }

                Section("Client") {
                    Picker("Client", selection: $selectedClientId) {
                        Text("Any Client").tag(nil as String?)
                        ForEach(viewModel.clients) { client in
                            Text(client.name).tag(client.id as String?)
                        }
                    }
                    .pickerStyle(.navigationLink)
                    .onChange(of: selectedClientId) { _, newId in
                        selectedClientName = viewModel.clients.first { $0.id == newId }?.name
                    }
                }

                Section {
                    Button("Clear All Filters", role: .destructive) {
                        useStartDate = false
                        useEndDate = false
                        selectedProjectId = nil
                        selectedClientId = nil
                    }
                }
            }
            .navigationTitle("Filter Entries")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Apply") { applyAndDismiss() }
                }
            }
            .onAppear { loadCurrentFilters() }
        }
    }

    private func loadCurrentFilters() {
        let f = viewModel.activeFilters
        if let s = f.startDate { startDate = s; useStartDate = true }
        if let e = f.endDate { endDate = e; useEndDate = true }
        selectedProjectId = f.projectId
        selectedClientId = f.clientId
    }

    private func applyAndDismiss() {
        viewModel.activeFilters = TimeEntryActiveFilters(
            startDate: useStartDate ? startDate : nil,
            endDate: useEndDate ? endDate : nil,
            projectId: selectedProjectId,
            projectName: selectedProjectName,
            clientId: selectedClientId,
            clientName: selectedClientName
        )
        dismiss()
        onApply()
    }
}
