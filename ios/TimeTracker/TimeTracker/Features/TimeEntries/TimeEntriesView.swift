import SwiftUI

struct TimeEntriesView: View {
    @StateObject private var viewModel = TimeEntriesViewModel()
    @State private var selectedDate: Date = Calendar.current.startOfDay(for: Date())
    
    // For infinite paging, we use an offset from 'today'
    @State private var dayOffset: Int = 0 
    
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
            .navigationBarTitleDisplayMode(.inline)
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
        
        // Place the DatePicker in the principal placement (center of nav bar)
        ToolbarItem(placement: .principal) {
            DatePicker(
                "",
                selection: Binding(
                    get: {
                        Calendar.current.date(byAdding: .day, value: dayOffset, to: Calendar.current.startOfDay(for: Date())) ?? Date()
                    },
                    set: { newDate in
                        let today = Calendar.current.startOfDay(for: Date())
                        let normalizedNewDate = Calendar.current.startOfDay(for: newDate)
                        let components = Calendar.current.dateComponents([.day], from: today, to: normalizedNewDate)
                        if let dayDifference = components.day {
                            dayOffset = dayDifference
                        }
                    }
                ),
                displayedComponents: .date
            )
            .datePickerStyle(.compact)
            .labelsHidden()
            .environment(\.locale, Locale.current) // Ensure correct start of week
        }
    }

    // MARK: - Main content

    private var mainContent: some View {
        // We use a wide range of offsets to simulate infinite paging.
        // -1000 days is roughly 2.7 years in the past.
        // 1000 days is roughly 2.7 years in the future.
        TabView(selection: $dayOffset) {
            ForEach(-1000...1000, id: \.self) { offset in
                let dayForPage = Calendar.current.date(byAdding: .day, value: offset, to: Calendar.current.startOfDay(for: Date())) ?? Date()
                
                ScrollView {
                    dayEntriesSection(for: dayForPage)
                }
                .tag(offset) // Important: tag must match the selection type (Int)
            }
        }
        .tabViewStyle(.page(indexDisplayMode: .never)) // Native swipe gesture
    }

    // MARK: - Day entries section

    private func dayEntriesSection(for day: Date) -> some View {
        let dayEntries = viewModel.entries(for: day)
        return VStack(alignment: .leading, spacing: 0) {
            
            // Optional: A small summary header for the day
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
        .padding(.bottom, 40) // Give some breathing room at the bottom of the scroll
    }

    // MARK: - Helpers

    private func dayTitle(_ date: Date) -> String {
        let cal = Calendar.current
        if cal.isDateInToday(date) { return "Today" }
        if cal.isDateInYesterday(date) { return "Yesterday" }
        if cal.isDateInTomorrow(date) { return "Tomorrow" }
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
