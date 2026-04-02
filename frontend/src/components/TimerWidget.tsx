import { useState, useRef, useLayoutEffect } from "react";
import { Play, Square, ChevronDown, Pencil, Check, X, Trash2 } from "lucide-react";
import { useTimer } from "@/contexts/TimerContext";
import { useProjects } from "@/hooks/useProjects";
import { ProjectColorDot } from "@/components/ProjectColorDot";

function TimerDisplay({ totalSeconds }: { totalSeconds: number }) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <span className="text-2xl font-mono font-semibold text-slate-900 sm:text-3xl">
      {hours > 0 && (
        <>
          <span className="mr-0.5">{pad(hours)}</span>
          <span className="mr-1.5 text-base font-normal text-slate-500">h</span>
        </>
      )}
      <span className="mr-0.5">{pad(minutes)}</span>
      <span className="mr-1.5 text-base font-normal text-slate-500">m</span>
      <span className="mr-0.5">{pad(seconds)}</span>
      <span className="text-base font-normal text-slate-500">s</span>
    </span>
  );
}

/** Converts a HH:mm string to an ISO datetime, inferring the correct date.
 *  If the resulting time would be in the future, it is assumed to belong to the previous day.
 */
function timeInputToIso(timeValue: string): string {
  const [hours, minutes] = timeValue.split(":").map(Number);
  const now = new Date();
  const candidate = new Date(now);
  candidate.setHours(hours, minutes, 0, 0);
  // If the candidate is in the future, roll back one day
  if (candidate > now) {
    candidate.setDate(candidate.getDate() - 1);
  }
  return candidate.toISOString();
}

export function TimerWidget() {
  const {
    ongoingTimer,
    isLoading,
    elapsedSeconds,
    startTimer,
    stopTimer,
    cancelTimer,
    updateTimerProject,
    updateTimerStartTime,
  } = useTimer();
  const { projects } = useProjects();
  const [showProjectSelect, setShowProjectSelect] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start time editing state
  const [editingStartTime, setEditingStartTime] = useState(false);
  const [startTimeInput, setStartTimeInput] = useState("");
  const startTimeInputRef = useRef<HTMLInputElement>(null);
  const timerShellRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const target = timerShellRef.current;
    if (!target || typeof ResizeObserver === "undefined") {
      return;
    }

    const rootStyle = document.documentElement.style;
    const updateOffset = () => {
      const height = Math.ceil(target.getBoundingClientRect().height);
      rootStyle.setProperty("--tt-timer-offset", `${height + 16}px`);
    };

    updateOffset();

    const observer = new ResizeObserver(() => {
      updateOffset();
    });

    observer.observe(target);

    return () => {
      observer.disconnect();
      rootStyle.removeProperty("--tt-timer-offset");
    };
  }, [error, editingStartTime, ongoingTimer]);

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

  const handleCancelTimer = async () => {
    setError(null);
    try {
      await cancelTimer();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel timer");
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

  const handleStartEditStartTime = () => {
    if (!ongoingTimer) return;
    const start = new Date(ongoingTimer.startTime);
    const hh = start.getHours().toString().padStart(2, "0");
    const mm = start.getMinutes().toString().padStart(2, "0");
    setStartTimeInput(`${hh}:${mm}`);
    setEditingStartTime(true);
    // Focus the input on next render
    setTimeout(() => startTimeInputRef.current?.focus(), 0);
  };

  const handleCancelEditStartTime = () => {
    setEditingStartTime(false);
    setError(null);
  };

  const handleConfirmStartTime = async () => {
    if (!startTimeInput) return;
    setError(null);
    try {
      const iso = timeInputToIso(startTimeInput);
      await updateTimerStartTime(iso);
      setEditingStartTime(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update start time");
    }
  };

  const handleStartTimeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      void handleConfirmStartTime();
    } else if (e.key === "Escape") {
      handleCancelEditStartTime();
    }
  };

  if (isLoading) {
    return (
      <div ref={timerShellRef} className="pointer-events-none fixed inset-x-0 bottom-4 z-40 px-4">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-center rounded-2xl border border-white/60 bg-white/75 px-6 py-4 shadow-2xl shadow-slate-900/10 backdrop-blur-xl">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div ref={timerShellRef} className="fixed inset-x-0 bottom-4 z-40 px-4">
      <div className="glass-bar mx-auto flex w-full max-w-5xl flex-wrap items-center gap-3 rounded-3xl px-4 py-3 sm:flex-nowrap sm:gap-4 sm:px-5">
        {ongoingTimer ? (
          <>
            <div className="flex items-center justify-between w-full sm:contents">
              <div className="flex items-center space-x-2 shrink-0">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                {editingStartTime ? (
                  <div className="flex items-center space-x-1">
                    <span className="mr-1 text-xs text-slate-500">Started at</span>
                    <input
                      ref={startTimeInputRef}
                      type="time"
                      value={startTimeInput}
                      onChange={(e) => setStartTimeInput(e.target.value)}
                      onKeyDown={handleStartTimeKeyDown}
                      className="w-28 rounded-lg border border-indigo-300 bg-white px-2 py-0.5 font-mono text-lg font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      onClick={() => void handleConfirmStartTime()}
                      title="Confirm"
                      className="rounded p-1 text-emerald-600 transition hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleCancelEditStartTime}
                      title="Cancel"
                      className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <TimerDisplay totalSeconds={elapsedSeconds} />
                    <button
                      onClick={handleStartEditStartTime}
                      title="Adjust start time"
                      className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2 shrink-0 sm:order-last">
                <button
                  onClick={() => void handleCancelTimer()}
                  title="Discard timer"
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
                <button
                  onClick={handleStop}
                  disabled={!ongoingTimer.project}
                  title={!ongoingTimer.project ? "Select a project to stop the timer" : undefined}
                  className="flex items-center space-x-2 rounded-2xl bg-red-600 px-5 py-2.5 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-red-600"
                >
                  <Square className="h-4 w-4 fill-current" />
                  <span>Stop</span>
                </button>
              </div>
            </div>

            <div className="relative w-full sm:w-auto sm:flex-1 sm:mx-4">
              <button
                onClick={() => setShowProjectSelect(!showProjectSelect)}
                className="flex w-full items-center space-x-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 transition hover:border-indigo-200 hover:bg-indigo-50/40 sm:w-auto"
              >
                <span className="flex items-center space-x-2 min-w-0 flex-1">
                  {ongoingTimer.project ? (
                    <>
                      <ProjectColorDot color={ongoingTimer.project.color} />
                      <span className="truncate text-sm font-medium text-slate-700">
                        {ongoingTimer.project.name}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm font-medium text-slate-500">
                      Select project...
                    </span>
                  )}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
              </button>

              {showProjectSelect && (
                <div className="absolute bottom-full left-0 mb-2 max-h-64 w-64 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-xl">
                  <button
                    onClick={handleClearProject}
                    className="w-full rounded-xl border-b border-slate-100 px-4 py-2 text-left text-sm text-slate-500 transition hover:bg-slate-50"
                  >
                    No project
                  </button>
                  {projects?.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => handleProjectChange(project.id)}
                      className="flex w-full items-center space-x-2 rounded-xl px-4 py-2 text-left text-sm transition hover:bg-slate-50"
                    >
                      <ProjectColorDot color={project.color} />
                      <div className="min-w-0">
                        <div className="truncate font-medium text-slate-900">
                          {project.name}
                        </div>
                        <div className="truncate text-xs text-slate-500">
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
            <div className="flex items-center space-x-2">
              <span className="text-slate-600 text-sm font-medium">Ready to track time</span>
            </div>

            <button
              onClick={handleStart}
              className="btn-primary"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>Start</span>
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mx-auto mt-2 w-full max-w-5xl px-2">
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
