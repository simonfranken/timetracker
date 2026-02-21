import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var showLogoutConfirmation = false

    var body: some View {
        NavigationStack {
            List {
                // User info header
                if let user = authManager.currentUser {
                    Section {
                        HStack(spacing: 14) {
                            Circle()
                                .fill(Color.accentColor.opacity(0.15))
                                .frame(width: 50, height: 50)
                                .overlay(
                                    Text(user.username.prefix(1).uppercased())
                                        .font(.title3)
                                        .fontWeight(.semibold)
                                        .foregroundStyle(Color.accentColor)
                                )
                            VStack(alignment: .leading, spacing: 2) {
                                Text(user.fullName ?? user.username)
                                    .font(.headline)
                                Text(user.email)
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .padding(.vertical, 6)
                    }
                }

                // Navigation
                Section("Data") {
                    NavigationLink {
                        ClientsListView()
                    } label: {
                        Label("Clients", systemImage: "person.2")
                    }

                    NavigationLink {
                        ProjectsListView()
                    } label: {
                        Label("Projects", systemImage: "folder")
                    }
                }

                // Logout
                Section {
                    Button(role: .destructive) {
                        showLogoutConfirmation = true
                    } label: {
                        HStack {
                            Spacer()
                            Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                            Spacer()
                        }
                    }
                }
            }
            .navigationTitle("Settings")
            .alert("Sign Out?", isPresented: $showLogoutConfirmation) {
                Button("Cancel", role: .cancel) {}
                Button("Sign Out", role: .destructive) {
                    Task { try? await authManager.logout() }
                }
            } message: {
                Text("You will be signed out and need to sign in again to use the app.")
            }
        }
    }
}
