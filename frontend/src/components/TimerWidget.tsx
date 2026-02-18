import { useState } from "react";
import { Play, Square, ChevronDown } from "lucide-react";
import { useTimer } from "@/contexts/TimerContext";
import { useProjects } from "@/hooks/useProjects";
import { ProjectColorDot } from "@/components/ProjectColorDot";

function TimerDisplay({ totalSeconds }: { totalSeconds: number }) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <span className="text-2xl font-mono font-bold text-gray-900">
      {hours > 0 && (
        <>
          <span className="mr-0.5">{pad(hours)}</span>
          <span className="text-base font-normal text-gray-500 mr-1.5">h</span>
        </>
      )}
      <span className="mr-0.5">{pad(minutes)}</span>
      <span className="text-base font-normal text-gray-500 mr-1.5">m</span>
      <span className="mr-0.5">{pad(seconds)}</span>
      <span className="text-base font-normal text-gray-500">s</span>
    </span>
  );
}

export function TimerWidget() {
  const {
    ongoingTimer,
    isLoading,
    elapsedSeconds,
    startTimer,
    stopTimer,
    updateTimerProject,
  } = useTimer();
  const { projects } = useProjects();
  const [showProjectSelect, setShowProjectSelect] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    setError(null);
    try {
      await startTimer();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start timer");
    }
  };

  const handleStop = async () => {
    setError(null);
    try {
      await stopTimer();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop timer");
    }
  };

  const handleProjectChange = async (projectId: string) => {
    setError(null);
    try {
      await updateTimerProject(projectId);
      setShowProjectSelect(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update project");
    }
  };

  const handleClearProject = async () => {
    setError(null);
    try {
      await updateTimerProject(null);
      setShowProjectSelect(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear project");
    }
  };

  if (isLoading) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-50">
      <div className="max-w-7xl mx-auto flex flex-wrap sm:flex-nowrap items-center gap-2 sm:justify-between">
        {ongoingTimer ? (
          <>
            {/* Row 1 (mobile): timer + stop side by side. On sm+ dissolves into the parent flex row via contents. */}
            <div className="flex items-center justify-between w-full sm:contents">
              {/* Timer Display */}
              <div className="flex items-center space-x-2 shrink-0">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <TimerDisplay totalSeconds={elapsedSeconds} />
              </div>

              {/* Stop Button */}
              <button
                onClick={handleStop}
                className="flex items-center space-x-2 px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors shrink-0 sm:order-last"
              >
                <Square className="h-5 w-5 fill-current" />
                <span>Stop</span>
              </button>
            </div>

            {/* Project Selector — full width on mobile, auto on desktop */}
            <div className="relative w-full sm:w-auto sm:flex-1 sm:mx-4">
              <button
                onClick={() => setShowProjectSelect(!showProjectSelect)}
                className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors w-full sm:w-auto"
              >
                <span className="flex items-center space-x-2 min-w-0 flex-1">
                  {ongoingTimer.project ? (
                    <>
                      <ProjectColorDot color={ongoingTimer.project.color} />
                      <span className="text-sm font-medium text-gray-700 truncate">
                        {ongoingTimer.project.name}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm font-medium text-gray-500">
                      Select project...
                    </span>
                  )}
                </span>
                <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />
              </button>

              {showProjectSelect && (
                <div className="absolute bottom-full left-0 mb-2 w-64 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-lg border border-gray-200 max-h-64 overflow-y-auto">
                  <button
                    onClick={handleClearProject}
                    className="w-full px-4 py-2 text-left text-sm text-gray-500 hover:bg-gray-50 border-b border-gray-100"
                  >
                    No project
                  </button>
                  {projects?.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => handleProjectChange(project.id)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <ProjectColorDot color={project.color} />
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {project.name}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {project.client.name}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between w-full">
            {/* Stopped Timer Display */}
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">Ready to track time</span>
            </div>

            {/* Start Button */}
            <button
              onClick={handleStart}
              className="flex items-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              <Play className="h-5 w-5 fill-current" />
              <span>Start</span>
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="max-w-7xl mx-auto mt-2">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}
