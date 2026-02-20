import WidgetKit
import SwiftUI

struct TimerEntry: TimelineEntry {
    let date: Date
    let timer: WidgetTimer?
    let projectName: String?
    let projectColor: String?
}

struct WidgetTimer: Codable {
    let id: String
    let startTime: String
    let projectId: String?
    let project: WidgetProjectReference?
    let createdAt: String
    let updatedAt: String
    
    var elapsedTime: TimeInterval {
        guard let start = ISO8601DateFormatter().date(from: startTime) else {
            return 0
        }
        return Date().timeIntervalSince(start)
    }
}

struct WidgetProjectReference: Codable {
    let id: String
    let name: String
    let color: String?
}

struct Provider: TimelineProvider {
    private let appGroupIdentifier = "group.com.timetracker.app"
    
    func placeholder(in context: Context) -> TimerEntry {
        TimerEntry(
            date: Date(),
            timer: nil,
            projectName: nil,
            projectColor: nil
        )
    }
    
    func getSnapshot(in context: Context, completion: @escaping (TimerEntry) -> Void) {
        let entry = loadTimerEntry()
        completion(entry)
    }
    
    func getTimeline(in context: Context, completion: @escaping (Timeline<TimerEntry>) -> Void) {
        let entry = loadTimerEntry()
        
        // Update every minute to show live timer countdown
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 1, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        
        completion(timeline)
    }
    
    private func loadTimerEntry() -> TimerEntry {
        guard let userDefaults = UserDefaults(suiteName: appGroupIdentifier),
              let data = userDefaults.data(forKey: "cachedTimer") else {
            return TimerEntry(
                date: Date(),
                timer: nil,
                projectName: nil,
                projectColor: nil
            )
        }
        
        do {
            let timer = try JSONDecoder().decode(WidgetTimer.self, from: data)
            return TimerEntry(
                date: Date(),
                timer: timer,
                projectName: timer.project?.name ?? timer.projectId,
                projectColor: timer.project?.color
            )
        } catch {
            return TimerEntry(
                date: Date(),
                timer: nil,
                projectName: nil,
                projectColor: nil
            )
        }
    }
}

struct TimerWidgetEntryView: View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family
    
    var body: some View {
        switch family {
        case .systemSmall:
            smallWidget
        case .systemMedium:
            mediumWidget
        default:
            smallWidget
        }
    }
    
    private var smallWidget: some View {
        VStack(spacing: 8) {
            if let timer = entry.timer {
                Image(systemName: "timer")
                    .font(.title2)
                    .foregroundStyle(.green)
                
                Text(timer.elapsedTime.formattedDuration)
                    .font(.system(size: 24, weight: .medium, design: .monospaced))
                
                if let projectId = entry.projectName {
                    Text(projectId)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            } else {
                Image(systemName: "timer")
                    .font(.title2)
                    .foregroundStyle(.secondary)
                
                Text("No timer")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .containerBackground(for: .widget) {
            Color(.systemBackground)
        }
    }
    
    private var mediumWidget: some View {
        HStack(spacing: 16) {
            if let timer = entry.timer {
                VStack(spacing: 4) {
                    Image(systemName: "timer")
                        .font(.title)
                        .foregroundStyle(.green)
                    
                    Text(timer.elapsedTime.formattedDuration)
                        .font(.system(size: 28, weight: .medium, design: .monospaced))
                }
                
                VStack(alignment: .leading, spacing: 4) {
                    if let projectId = entry.projectName {
                        Text(projectId)
                            .font(.headline)
                    }
                    Text("Tap to open")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            } else {
                VStack(spacing: 8) {
                    Image(systemName: "timer")
                        .font(.title)
                        .foregroundStyle(.secondary)
                    
                    Text("No active timer")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .containerBackground(for: .widget) {
            Color(.systemBackground)
        }
    }
}

extension TimeInterval {
    var formattedDuration: String {
        let hours = Int(self) / 3600
        let minutes = (Int(self) % 3600) / 60
        let seconds = Int(self) % 60
        
        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, seconds)
        } else {
            return String(format: "%02d:%02d", minutes, seconds)
        }
    }
}

struct TimeTrackerWidget: Widget {
    let kind: String = "TimeTrackerWidget"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            TimerWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Timer")
        .description("Shows your active timer.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
