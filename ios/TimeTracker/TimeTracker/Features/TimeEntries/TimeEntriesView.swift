import SwiftUI

struct TimeEntriesView: View {
    @StateObject private var viewModel = TimeEntriesViewModel()
    @State private var showAddEntry = false
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
                } else if viewModel.entries.isEmpty {
                    EmptyView(
                        icon: "clock",
                        title: "No Time Entries",
                        message: "Start tracking your time to see entries here."
                    )
                } else {
                    entriesList
                }
            }
            .navigationTitle("Time Entries")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showAddEntry = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .task {
                await viewModel.loadEntries()
            }
            .sheet(isPresented: $showAddEntry) {
                TimeEntryFormView(onSave: {
                    Task { await viewModel.loadEntries() }
                })
            }
        }
    }
    
    private var entriesList: some View {
        List {
            ForEach(viewModel.entries) { entry in
                TimeEntryRow(entry: entry)
            }
            .onDelete { indexSet in
                if let index = indexSet.first {
                    entryToDelete = viewModel.entries[index]
                    showDeleteConfirmation = true
                }
            }
        }
        .alert("Delete Time Entry?", isPresented: $showDeleteConfirmation, presenting: entryToDelete) { entry in
            Button("Cancel", role: .cancel) {}
            Button("Delete", role: .destructive) {
                Task {
                    await viewModel.deleteEntry(entry)
                }
            }
        } message: { entry in
            Text("This will permanently delete the time entry for '\(entry.project.name)'. This action cannot be undone.")
        }
        .refreshable {
            await viewModel.loadEntries()
        }
    }
}

struct TimeEntryRow: View {
    let entry: TimeEntry
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                ProjectColorDot(color: entry.project.color)
                Text(entry.project.name)
                    .font(.headline)
                Spacer()
                Text(entry.duration.formattedHours)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            
            HStack {
                Text(formatDateRange(start: entry.startTime, end: entry.endTime))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Spacer()
                Text(entry.project.client.name)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            
            if let description = entry.description {
                Text(description)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
        }
        .padding(.vertical, 4)
    }
    
    private func formatDateRange(start: String, end: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, HH:mm"
        
        guard let startDate = Date.fromISO8601(start),
              let endDate = Date.fromISO8601(end) else {
            return ""
        }
        
        return "\(formatter.string(from: startDate)) - \(formatter.string(from: endDate))"
    }
}
