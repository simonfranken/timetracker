import Foundation

extension Date {
    var startOfDay: Date {
        Calendar.current.startOfDay(for: self)
    }
    
    var endOfDay: Date {
        var components = DateComponents()
        components.day = 1
        components.second = -1
        return Calendar.current.date(byAdding: components, to: startOfDay) ?? self
    }
    
    var startOfWeek: Date {
        let calendar = Calendar.current
        let components = calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: self)
        return calendar.date(from: components) ?? self
    }
    
    var endOfWeek: Date {
        var components = DateComponents()
        components.day = 7
        components.second = -1
        return Calendar.current.date(byAdding: components, to: startOfWeek) ?? self
    }
    
    func formatted(style: DateFormatter.Style) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = style
        formatter.timeStyle = .none
        return formatter.string(from: self)
    }
    
    func formattedTime() -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .none
        formatter.timeStyle = .short
        return formatter.string(from: self)
    }
    
    func formattedDateTime() -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: self)
    }
    
    var iso8601String: String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.string(from: self)
    }
    
    var iso8601FullDate: String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withFullDate]
        return formatter.string(from: self)
    }
    
    static func fromISO8601(_ string: String) -> Date? {
        // Try with fractional seconds first (e.g. "2026-02-20T09:00:00.000Z" from
        // Prisma/Node.js JSON serialisation), then fall back to whole seconds.
        let withFractional = ISO8601DateFormatter()
        withFractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = withFractional.date(from: string) { return date }

        let wholeSec = ISO8601DateFormatter()
        wholeSec.formatOptions = [.withInternetDateTime]
        return wholeSec.date(from: string)
    }
}
