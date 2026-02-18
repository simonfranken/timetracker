import Foundation
import SQLite

actor DatabaseService {
    static let shared = DatabaseService()
    
    private var db: Connection?
    
    private let clients = Table("clients")
    private let projects = Table("projects")
    private let timeEntries = Table("time_entries")
    private let pendingSync = Table("pending_sync")
    
    // Clients columns
    private let id = SQLite.Expression<String>("id")
    private let name = SQLite.Expression<String>("name")
    private let description = SQLite.Expression<String?>("description")
    private let createdAt = SQLite.Expression<String>("created_at")
    private let updatedAt = SQLite.Expression<String>("updated_at")
    
    // Projects columns
    private let projectClientId = SQLite.Expression<String>("client_id")
    private let clientName = SQLite.Expression<String>("client_name")
    private let color = SQLite.Expression<String?>("color")
    
    // Time entries columns
    private let startTime = SQLite.Expression<String>("start_time")
    private let endTime = SQLite.Expression<String>("end_time")
    private let projectId = SQLite.Expression<String>("project_id")
    private let projectName = SQLite.Expression<String>("project_name")
    private let projectColor = SQLite.Expression<String?>("project_color")
    private let entryDescription = SQLite.Expression<String?>("description")
    
    // Pending sync columns
    private let syncId = SQLite.Expression<String>("id")
    private let syncType = SQLite.Expression<String>("type")
    private let syncAction = SQLite.Expression<String>("action")
    private let syncPayload = SQLite.Expression<String>("payload")
    private let syncCreatedAt = SQLite.Expression<String>("created_at")
    
    private init() {
        setupDatabase()
    }
    
    private func setupDatabase() {
        do {
            let fileManager = FileManager.default
            let appGroupURL = fileManager.containerURL(
                forSecurityApplicationGroupIdentifier: AppConstants.appGroupIdentifier
            )
            let dbURL = appGroupURL?.appendingPathComponent("timetracker.sqlite3")
                ?? URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent("timetracker.sqlite3")
            
            db = try Connection(dbURL.path)
            
            try createTables()
        } catch {
            print("Database setup error: \(error)")
        }
    }
    
    private func createTables() throws {
        guard let db = db else { return }
        
        try db.run(clients.create(ifNotExists: true) { t in
            t.column(id, primaryKey: true)
            t.column(name)
            t.column(description)
            t.column(createdAt)
            t.column(updatedAt)
        })
        
        try db.run(projects.create(ifNotExists: true) { t in
            t.column(id, primaryKey: true)
            t.column(name)
            t.column(description)
            t.column(color)
            t.column(projectClientId)
            t.column(clientName)
            t.column(createdAt)
            t.column(updatedAt)
        })
        
        try db.run(timeEntries.create(ifNotExists: true) { t in
            t.column(id, primaryKey: true)
            t.column(startTime)
            t.column(endTime)
            t.column(entryDescription)
            t.column(projectId)
            t.column(projectName)
            t.column(projectColor)
            t.column(createdAt)
            t.column(updatedAt)
        })
        
        try db.run(pendingSync.create(ifNotExists: true) { t in
            t.column(syncId, primaryKey: true)
            t.column(syncType)
            t.column(syncAction)
            t.column(syncPayload)
            t.column(syncCreatedAt)
        })
    }
    
    // MARK: - Clients
    
    func saveClients(_ clientList: [Client]) throws {
        guard let db = db else { return }
        
        try db.run(clients.delete())
        
        for client in clientList {
            try db.run(clients.insert(
                id <- client.id,
                name <- client.name,
                description <- client.description,
                createdAt <- client.createdAt,
                updatedAt <- client.updatedAt
            ))
        }
    }
    
    func fetchClients() throws -> [Client] {
        guard let db = db else { return [] }
        
        return try db.prepare(clients).map { row in
            Client(
                id: row[id],
                name: row[name],
                description: row[description],
                createdAt: row[createdAt],
                updatedAt: row[updatedAt]
            )
        }
    }
    
    // MARK: - Projects
    
    func saveProjects(_ projectList: [Project]) throws {
        guard let db = db else { return }
        
        try db.run(projects.delete())
        
        for project in projectList {
            try db.run(projects.insert(
                id <- project.id,
                name <- project.name,
                description <- project.description,
                color <- project.color,
                projectClientId <- project.clientId,
                clientName <- project.client.name,
                createdAt <- project.createdAt,
                updatedAt <- project.updatedAt
            ))
        }
    }
    
    func fetchProjects() throws -> [Project] {
        guard let db = db else { return [] }
        
        return try db.prepare(projects).map { row in
            let client = ClientReference(id: row[projectClientId], name: row[clientName])
            let projectRef = ProjectReference(id: row[id], name: row[name], color: row[color], client: client)
            
            return Project(
                id: row[id],
                name: row[name],
                description: row[description],
                color: row[color],
                clientId: row[projectClientId],
                client: client,
                createdAt: row[createdAt],
                updatedAt: row[updatedAt]
            )
        }
    }
    
    // MARK: - Time Entries
    
    func saveTimeEntries(_ entries: [TimeEntry]) throws {
        guard let db = db else { return }
        
        try db.run(timeEntries.delete())
        
        for entry in entries {
            try db.run(timeEntries.insert(
                id <- entry.id,
                startTime <- entry.startTime,
                endTime <- entry.endTime,
                entryDescription <- entry.description,
                projectId <- entry.projectId,
                projectName <- entry.project.name,
                projectColor <- entry.project.color,
                createdAt <- entry.createdAt,
                updatedAt <- entry.updatedAt
            ))
        }
    }
    
    func fetchTimeEntries() throws -> [TimeEntry] {
        guard let db = db else { return [] }
        
        return try db.prepare(timeEntries).map { row in
            let client = ClientReference(id: "", name: "")
            let projectRef = ProjectReference(
                id: row[projectId],
                name: row[projectName],
                color: row[projectColor],
                client: client
            )
            
            return TimeEntry(
                id: row[id],
                startTime: row[startTime],
                endTime: row[endTime],
                description: row[entryDescription],
                projectId: row[projectId],
                project: projectRef,
                createdAt: row[createdAt],
                updatedAt: row[updatedAt]
            )
        }
    }
    
    // MARK: - Pending Sync
    
    func addPendingSync(type: String, action: String, payload: String) throws {
        guard let db = db else { return }
        
        try db.run(pendingSync.insert(
            syncId <- UUID().uuidString,
            syncType <- type,
            syncAction <- action,
            syncPayload <- payload,
            syncCreatedAt <- ISO8601DateFormatter().string(from: Date())
        ))
    }
    
    func fetchPendingSync() throws -> [(id: String, type: String, action: String, payload: String)] {
        guard let db = db else { return [] }
        
        return try db.prepare(pendingSync).map { row in
            (row[syncId], row[syncType], row[syncAction], row[syncPayload])
        }
    }
    
    func removePendingSync(id: String) throws {
        guard let db = db else { return }
        
        try db.run(pendingSync.filter(syncId == id).delete())
    }
    
    // MARK: - Timer Cache
    
    func cacheTimer(_ timer: OngoingTimer?) throws {
        guard let db = db else { return }
        
        let encoder = JSONEncoder()
        
        if let timer = timer {
            let data = try encoder.encode(timer)
            UserDefaults(suiteName: AppConstants.appGroupIdentifier)?.set(data, forKey: AppConstants.UserDefaultsKeys.cachedTimer)
        } else {
            UserDefaults(suiteName: AppConstants.appGroupIdentifier)?.removeObject(forKey: AppConstants.UserDefaultsKeys.cachedTimer)
        }
    }
    
    func getCachedTimer() throws -> OngoingTimer? {
        let data = UserDefaults(suiteName: AppConstants.appGroupIdentifier)?.data(forKey: AppConstants.UserDefaultsKeys.cachedTimer)
        
        guard let data = data else { return nil }
        
        let decoder = JSONDecoder()
        return try decoder.decode(OngoingTimer.self, from: data)
    }
}
