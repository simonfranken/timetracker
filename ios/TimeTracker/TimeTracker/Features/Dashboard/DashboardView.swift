import SwiftUI

struct DashboardView: View {
    @StateObject private var viewModel = DashboardViewModel()
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Active Timer Card
                    timerCard
                    
                    // Weekly Stats
                    if let stats = viewModel.statistics {
                        statsSection(stats)
                    }
                    
                    // Recent Entries
                    recentEntriesSection
                }
                .padding()
            }
            .navigationTitle("Dashboard")
            .refreshable {
                await viewModel.loadData()
            }
            .task {
                await viewModel.loadData()
            }
        }
    }
    
    private var timerCard: some View {
        VStack(spacing: 16) {
            if let timer = viewModel.activeTimer {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Timer Running")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        
                        Text(viewModel.elapsedTime.formattedDuration)
                            .font(.system(size: 32, weight: .medium, design: .monospaced))
                        
                        if let project = timer.project {
                            ProjectColorBadge(color: project.color, name: project.name)
                        }
                    }
                    
                    Spacer()
                    
                    Image(systemName: "timer")
                        .font(.title)
                        .foregroundStyle(.green)
                }
            } else {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("No Active Timer")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        
                        Text("Start tracking to see your time")
                            .font(.headline)
                    }
                    
                    Spacer()
                    
                    Image(systemName: "timer")
                        .font(.title)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
    
    private func statsSection(_ stats: TimeStatistics) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("This Week")
                .font(.headline)
            
            HStack(spacing: 12) {
                StatCard(
                    title: "Hours Tracked",
                    value: TimeInterval(stats.totalSeconds).formattedHours,
                    icon: "clock.fill",
                    color: .blue
                )
                
                StatCard(
                    title: "Entries",
                    value: "\(stats.entryCount)",
                    icon: "list.bullet",
                    color: .green
                )
            }
            
            if !stats.byProject.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("By Project")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    
                    ForEach(stats.byProject.prefix(5)) { projectStat in
                        HStack {
                            if let color = projectStat.projectColor {
                                ProjectColorDot(color: color)
                            }
                            Text(projectStat.projectName)
                                .font(.subheadline)
                            Spacer()
                            Text(TimeInterval(projectStat.totalSeconds).formattedHours)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
    }
    
    private var recentEntriesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Recent Entries")
                .font(.headline)
            
            if viewModel.recentEntries.isEmpty {
                Text("No entries yet")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding()
            } else {
                ForEach(viewModel.recentEntries) { entry in
                    HStack {
                        ProjectColorDot(color: entry.project.color, size: 10)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(entry.project.name)
                                .font(.subheadline)
                            Text(formatDate(entry.startTime))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        Text(entry.duration.formattedHours)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 4)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
    
    private func formatDate(_ isoString: String) -> String {
        guard let date = Date.fromISO8601(isoString) else { return "" }
        return date.formattedDateTime()
    }
}
