import SwiftUI

struct DashboardView: View {
    @StateObject private var viewModel = DashboardViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.statistics == nil && viewModel.recentEntries.isEmpty {
                    LoadingView()
                } else {
                    scrollContent
                }
            }
            .navigationTitle("Dashboard")
            .refreshable { await viewModel.loadData() }
            .task { await viewModel.loadData() }
        }
    }

    // MARK: - Main scroll content

    private var scrollContent: some View {
        ScrollView {
            VStack(spacing: 24) {
                timerCard
                if let stats = viewModel.statistics { weeklyStatsSection(stats) }
                if !viewModel.clientTargets.isEmpty { workBalanceSection }
                recentEntriesSection
            }
            .padding()
        }
    }

    // MARK: - Active Timer Card

    private var timerCard: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                if let timer = viewModel.activeTimer {
                    Text("Timer Running")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Text(viewModel.elapsedTime.formattedDuration)
                        .font(.system(size: 32, weight: .medium, design: .monospaced))
                    if let project = timer.project {
                        ProjectColorBadge(color: project.color, name: project.name)
                    }
                } else {
                    Text("No Active Timer")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Text("Start tracking to see your time")
                        .font(.headline)
                }
            }
            Spacer()
            Image(systemName: "timer")
                .font(.title)
                .foregroundStyle(viewModel.activeTimer != nil ? .green : .secondary)
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    // MARK: - Weekly Stats

    private func weeklyStatsSection(_ stats: TimeStatistics) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("This Week")
                .font(.headline)

            HStack(spacing: 12) {
                StatCard(
                    title: "Hours Tracked",
                    value: TimeInterval(stats.totalSeconds).formattedShortDuration,
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
                            Text(TimeInterval(projectStat.totalSeconds).formattedShortDuration)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
            }
        }
    }

    // MARK: - Work Balance Section

    private var workBalanceSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Work Time Balance")
                .font(.headline)

            ForEach(viewModel.clientTargets) { target in
                WorkBalanceCard(target: target)
            }
        }
    }

    // MARK: - Recent Entries

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
                VStack(spacing: 0) {
                    ForEach(Array(viewModel.recentEntries.enumerated()), id: \.element.id) { index, entry in
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
                            Text(entry.duration.formattedShortDuration)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 8)
                        if index < viewModel.recentEntries.count - 1 {
                            Divider()
                        }
                    }
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

// MARK: - Work Balance Card

struct WorkBalanceCard: View {
    let target: ClientTarget
    @State private var expanded = false

    private var totalBalance: TimeInterval { TimeInterval(target.totalBalanceSeconds) }
    private var currentWeekTracked: TimeInterval { TimeInterval(target.currentWeekTrackedSeconds) }
    private var currentWeekTarget: TimeInterval { TimeInterval(target.currentWeekTargetSeconds) }

    private var balanceColor: Color {
        if target.totalBalanceSeconds >= 0 { return .green }
        return .red
    }

    private var balanceLabel: String {
        let abs = abs(totalBalance)
        return target.totalBalanceSeconds >= 0
            ? "+\(abs.formattedShortDuration) overtime"
            : "-\(abs.formattedShortDuration) undertime"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header row
            HStack {
                Text(target.clientName)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                Spacer()
                Text(balanceLabel)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(balanceColor)
            }

            // This-week progress
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text("This week")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text("\(currentWeekTracked.formattedShortDuration) / \(currentWeekTarget.formattedShortDuration)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                if currentWeekTarget > 0 {
                    ProgressView(value: min(currentWeekTracked / currentWeekTarget, 1.0))
                        .tint(currentWeekTracked >= currentWeekTarget ? .green : .blue)
                }
            }

            // Weekly breakdown (expandable)
            if !target.weeks.isEmpty {
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) { expanded.toggle() }
                } label: {
                    HStack(spacing: 4) {
                        Text(expanded ? "Hide weeks" : "Show weeks")
                            .font(.caption)
                        Image(systemName: expanded ? "chevron.up" : "chevron.down")
                            .font(.caption2)
                    }
                    .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)

                if expanded {
                    VStack(spacing: 6) {
                        ForEach(target.weeks.suffix(8).reversed()) { week in
                            WeekBalanceRow(week: week)
                        }
                    }
                    .transition(.opacity.combined(with: .move(edge: .top)))
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

// MARK: - Week Balance Row

struct WeekBalanceRow: View {
    let week: WeekBalance

    private var balance: TimeInterval { TimeInterval(week.balanceSeconds) }
    private var tracked: TimeInterval { TimeInterval(week.trackedSeconds) }
    private var target: TimeInterval { TimeInterval(week.targetSeconds) }
    private var balanceColor: Color { week.balanceSeconds >= 0 ? .green : .red }

    var body: some View {
        HStack {
            Text(weekLabel)
                .font(.caption)
                .foregroundStyle(.secondary)
            Spacer()
            Text(tracked.formattedShortDuration)
                .font(.caption)
            Text("/")
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(target.formattedShortDuration)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(balanceText)
                .font(.caption)
                .fontWeight(.medium)
                .foregroundStyle(balanceColor)
                .frame(width: 70, alignment: .trailing)
        }
    }

    private var weekLabel: String {
        guard let date = parseDate(week.weekStart) else { return week.weekStart }
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        return formatter.string(from: date)
    }

    private var balanceText: String {
        let abs = Swift.abs(balance)
        return week.balanceSeconds >= 0 ? "+\(abs.formattedShortDuration)" : "-\(abs.formattedShortDuration)"
    }

    private func parseDate(_ string: String) -> Date? {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f.date(from: string)
    }
}
