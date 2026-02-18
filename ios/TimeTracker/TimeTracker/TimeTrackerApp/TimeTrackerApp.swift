import SwiftUI

@main
struct TimeTrackerApp: App {
    @StateObject private var authManager = AuthManager.shared
    
    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(authManager)
        }
    }
}

struct RootView: View {
    @EnvironmentObject var authManager: AuthManager
    
    var body: some View {
        Group {
            if authManager.isAuthenticated {
                MainTabView()
            } else {
                LoginView()
            }
        }
        .task {
            await authManager.checkAuthState()
        }
    }
}

struct MainTabView: View {
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            DashboardView()
                .tabItem {
                    Label("Dashboard", systemImage: "chart.bar")
                }
                .tag(0)
            
            TimerView()
                .tabItem {
                    Label("Timer", systemImage: "timer")
                }
                .tag(1)
            
            TimeEntriesView()
                .tabItem {
                    Label("Entries", systemImage: "clock")
                }
                .tag(2)
            
            ProjectsView()
                .tabItem {
                    Label("Projects", systemImage: "folder")
                }
                .tag(3)
            
            ClientsView()
                .tabItem {
                    Label("Clients", systemImage: "person.2")
                }
                .tag(4)
        }
    }
}
