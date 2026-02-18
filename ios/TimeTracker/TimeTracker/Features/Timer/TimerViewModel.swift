import Foundation
import SwiftUI

@MainActor
final class TimerViewModel: ObservableObject {
    @Published var activeTimer: OngoingTimer?
    @Published var projects: [Project] = []
    @Published var selectedProject: Project?
    @Published var isLoading = false
    @Published var error: String?
    @Published var elapsedTime: TimeInterval = 0
    
    private let apiClient = APIClient()
    private let database = DatabaseService.shared
    private var timerTask: Task<Void, Never>?
    
    init() {
        startElapsedTimeUpdater()
    }
    
    deinit {
        timerTask?.cancel()
    }
    
    func loadData() async {
        isLoading = true
        error = nil
        
        do {
            // Fetch active timer
            activeTimer = try await apiClient.request(
                endpoint: APIEndpoint.timer,
                authenticated: true
            )
            
            // Cache timer for widget
            try await database.cacheTimer(activeTimer)
            
            // Fetch projects
            let response: ProjectListResponse = try await apiClient.request(
                endpoint: APIEndpoint.projects,
                authenticated: true
            )
            projects = response.projects
            
            // Set selected project if timer has one
            if let timerProject = activeTimer?.project {
                selectedProject = projects.first { $0.id == timerProject.id }
            }
            
            // Calculate elapsed time
            if let timer = activeTimer {
                elapsedTime = timer.elapsedTime
            }
            
            isLoading = false
        } catch {
            isLoading = false
            self.error = error.localizedDescription
            
            // Try to load cached data
            if let cachedTimer = try? await database.getCachedTimer() {
                activeTimer = cachedTimer
                elapsedTime = cachedTimer.elapsedTime
            }
        }
    }
    
    func startTimer() async {
        isLoading = true
        error = nil
        
        do {
            let input = StartTimerInput(projectId: selectedProject?.id)
            activeTimer = try await apiClient.request(
                endpoint: APIEndpoint.timerStart,
                method: .post,
                body: input,
                authenticated: true
            )
            
            try await database.cacheTimer(activeTimer)
            
            if let timer = activeTimer {
                elapsedTime = timer.elapsedTime
            }
            
            isLoading = false
        } catch {
            isLoading = false
            self.error = error.localizedDescription
        }
    }
    
    func stopTimer() async {
        guard let timer = activeTimer else { return }
        
        isLoading = true
        error = nil
        
        let projectId = selectedProject?.id ?? timer.projectId ?? ""
        
        do {
            let input = StopTimerInput(projectId: projectId)
            try await apiClient.requestVoid(
                endpoint: APIEndpoint.timerStop,
                method: .post,
                body: input,
                authenticated: true
            )
            
            activeTimer = nil
            selectedProject = nil
            elapsedTime = 0
            
            try await database.cacheTimer(nil)
            
            isLoading = false
        } catch {
            isLoading = false
            self.error = error.localizedDescription
        }
    }
    
    func updateProject(_ project: Project?) async {
        selectedProject = project
        
        guard let timer = activeTimer else { return }
        
        do {
            guard let projectId = project?.id else { return }
            
            let input = UpdateTimerInput(projectId: projectId)
            activeTimer = try await apiClient.request(
                endpoint: APIEndpoint.timer,
                method: .put,
                body: input,
                authenticated: true
            )
            
            try await database.cacheTimer(activeTimer)
        } catch {
            self.error = error.localizedDescription
        }
    }
    
    private func startElapsedTimeUpdater() {
        timerTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 1_000_000_000)
                
                guard let self = self, self.activeTimer != nil else { continue }
                
                await MainActor.run {
                    self.elapsedTime = self.activeTimer?.elapsedTime ?? 0
                }
            }
        }
    }
}
