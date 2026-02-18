import SwiftUI

struct TimerView: View {
    @StateObject private var viewModel = TimerViewModel()
    @State private var showProjectPicker = false
    
    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.activeTimer == nil {
                    LoadingView()
                } else if let error = viewModel.error, viewModel.activeTimer == nil {
                    ErrorView(message: error) {
                        Task { await viewModel.loadData() }
                    }
                } else {
                    timerContent
                }
            }
            .navigationTitle("Timer")
            .task {
                await viewModel.loadData()
            }
            .sheet(isPresented: $showProjectPicker) {
                ProjectPickerSheet(
                    projects: viewModel.projects,
                    selectedProject: viewModel.selectedProject
                ) { project in
                    Task {
                        await viewModel.updateProject(project)
                    }
                }
            }
        }
    }
    
    private var timerContent: some View {
        VStack(spacing: 32) {
            Spacer()
            
            // Timer Display
            VStack(spacing: 8) {
                Text(viewModel.elapsedTime.formattedDuration)
                    .font(.system(size: 64, weight: .light, design: .monospaced))
                    .foregroundStyle(viewModel.activeTimer != nil ? .primary : .secondary)
                
                if let project = viewModel.selectedProject {
                    ProjectColorBadge(
                        color: project.color,
                        name: project.name
                    )
                } else if let timerProject = viewModel.activeTimer?.project {
                    ProjectColorBadge(
                        color: timerProject.color,
                        name: timerProject.name
                    )
                } else {
                    Text("No project selected")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
            
            Spacer()
            
            // Controls
            VStack(spacing: 16) {
                if viewModel.activeTimer == nil {
                    Button {
                        showProjectPicker = true
                    } label: {
                        HStack {
                            Image(systemName: "folder")
                            Text(viewModel.selectedProject?.name ?? "Select Project")
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.large)
                    
                    Button {
                        Task { await viewModel.startTimer() }
                    } label: {
                        HStack {
                            Image(systemName: "play.fill")
                            Text("Start Timer")
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                } else {
                    Button {
                        showProjectPicker = true
                    } label: {
                        HStack {
                            Image(systemName: "folder")
                            Text("Change Project")
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.large)
                    
                    Button {
                        Task { await viewModel.stopTimer() }
                    } label: {
                        HStack {
                            Image(systemName: "stop.fill")
                            Text("Stop Timer")
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.red)
                    .controlSize(.large)
                }
            }
            .padding(.horizontal, 24)
            
            Spacer()
        }
    }
}

struct ProjectPickerSheet: View {
    let projects: [Project]
    let selectedProject: Project?
    let onSelect: (Project?) -> Void
    
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationStack {
            List {
                Button {
                    onSelect(nil)
                    dismiss()
                } label: {
                    HStack {
                        Text("No Project")
                            .foregroundStyle(.primary)
                        if selectedProject == nil {
                            Image(systemName: "checkmark")
                                .foregroundStyle(Color.accentColor)
                        }
                    }
                }
                
                ForEach(projects) { project in
                    Button {
                        onSelect(project)
                        dismiss()
                    } label: {
                        HStack {
                            ProjectColorDot(color: project.color)
                            Text(project.name)
                                .foregroundStyle(.primary)
                            Text(project.client.name)
                                .foregroundStyle(.secondary)
                            if selectedProject?.id == project.id {
                                Image(systemName: "checkmark")
                                .foregroundStyle(Color.accentColor)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Select Project")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }
}
