import SwiftUI

struct TimeEntriesView: View {
    @StateObject private var viewModel = TimeEntriesViewModel()
    @State private var selectedDay: Date? = Calendar.current.startOfDay(for: Date())
    @State private var visibleWeekStart: Date = Self.mondayOfWeek(containing: Date())
    @State private var showFilterSheet = false
    @State private var showAddEntry = false
    @State private var entryToEdit: TimeEntry?
    @State private var entryToDelete: TimeEntry?
    @State private var showDeleteConfirmation = false

    private static func mondayOfWeek(containing date: Date) -> Date {
        var cal = Calendar.current
        cal.firstWeekday = 2 // Monday
        let comps = cal.dateComponents([.yearForWeekOfYear, .weekOfYear], from: date)
        return cal.date(from: comps) ?? Calendar.current.startOfDay(for: date)
    }

    private var visibleWeekDays: [Date] {
        (0..<7).compactMap {
            Calendar.current.date(byAdding: .day, value: $0, to: visibleWeekStart)
        }
    }

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
        VStack(spacing: 0) {
            WeekStripView(
                weekDays: visibleWeekDays,
                selectedDay: $selectedDay,
                daysWithEntries: viewModel.daysWithEntries,
                onSwipeLeft: {
                    visibleWeekStart = Calendar.current.date(byAdding: .weekOfYear, value: 1, to: visibleWeekStart) ?? visibleWeekStart
                },
                onSwipeRight: {
                    visibleWeekStart = Calendar.current.date(byAdding: .weekOfYear, value: -1, to: visibleWeekStart) ?? visibleWeekStart
                }
            )

            Divider()

            ScrollView {
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

// MARK: - Week Strip View

struct WeekStripView: View {
    let weekDays: [Date]
    @Binding var selectedDay: Date?
    let daysWithEntries: Set<Date>
    let onSwipeLeft: () -> Void
    let onSwipeRight: () -> Void

    @GestureState private var dragOffset: CGFloat = 0

    private let cal = Calendar.current

    private var monthYearLabel: String {
        // Show the month/year of the majority of days in the strip
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        let midWeek = weekDays.count >= 4 ? weekDays[3] : (weekDays.first ?? Date())
        return formatter.string(from: midWeek)
    }

    var body: some View {
        VStack(spacing: 4) {
            // Month / year header with navigation arrows
            HStack {
                Button { onSwipeRight() } label: {
                    Image(systemName: "chevron.left")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(.secondary)
                        .frame(width: 32, height: 32)
                }
                Spacer()
                Text(monthYearLabel)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.primary)
                Spacer()
                Button { onSwipeLeft() } label: {
                    Image(systemName: "chevron.right")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(.secondary)
                        .frame(width: 32, height: 32)
                }
            }
            .padding(.horizontal, 8)
            .padding(.top, 6)

            // Day cells
            HStack(spacing: 0) {
                ForEach(weekDays, id: \.self) { day in
                    DayCell(
                        day: day,
                        isSelected: selectedDay.map { cal.isDate($0, inSameDayAs: day) } ?? false,
                        isToday: cal.isDateInToday(day),
                        hasDot: daysWithEntries.contains(cal.startOfDay(for: day))
                    )
                    .frame(maxWidth: .infinity)
                    .contentShape(Rectangle())
                    .onTapGesture {
                        let normalized = cal.startOfDay(for: day)
                        if let current = selectedDay, cal.isDate(current, inSameDayAs: normalized) {
                            selectedDay = nil
                        } else {
                            selectedDay = normalized
                        }
                    }
                }
            }
            .padding(.bottom, 6)
        }
        .gesture(
            DragGesture(minimumDistance: 40, coordinateSpace: .local)
                .onEnded { value in
                    if value.translation.width < -40 {
                        onSwipeLeft()
                    } else if value.translation.width > 40 {
                        onSwipeRight()
                    }
                }
        )
    }
}

// MARK: - Day Cell

private struct DayCell: View {
    let day: Date
    let isSelected: Bool
    let isToday: Bool
    let hasDot: Bool

    private static let weekdayFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "EEEEE" // Single letter: M T W T F S S
        return f
    }()

    private static let dayFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "d"
        return f
    }()

    var body: some View {
        VStack(spacing: 3) {
            Text(Self.weekdayFormatter.string(from: day))
                .font(.caption2)
                .foregroundStyle(.secondary)

            ZStack {
                if isSelected {
                    Circle()
                        .fill(Color.accentColor)
                        .frame(width: 32, height: 32)
                } else if isToday {
                    Circle()
                        .strokeBorder(Color.accentColor, lineWidth: 1.5)
                        .frame(width: 32, height: 32)
                }

                Text(Self.dayFormatter.string(from: day))
                    .font(.callout.weight(isToday || isSelected ? .semibold : .regular))
                    .foregroundStyle(isSelected ? .white : (isToday ? Color.accentColor : .primary))
            }
            .frame(width: 32, height: 32)

            // Dot indicator
            Circle()
                .fill(hasDot ? Color.accentColor.opacity(isSelected ? 0 : 0.7) : Color.clear)
                .frame(width: 4, height: 4)
        }
        .padding(.vertical, 4)
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
