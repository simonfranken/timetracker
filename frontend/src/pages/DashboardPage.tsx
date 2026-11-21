import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { endOfDay, format, isSameDay, startOfDay } from "date-fns";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { useClientTargets } from "@/hooks/useClientTargets";
import { useProjects } from "@/hooks/useProjects";
import { useTimer } from "@/contexts/TimerContext";
import { TargetProgressItem } from "@/components/TargetProgressItem";
import { TimeEntryFormModal } from "@/components/TimeEntryFormModal";
import { StopTimerModal } from "@/components/StopTimerModal";
import { OngoingTimerEditModal } from "@/components/OngoingTimerEditModal";
import { ConfirmModal } from "@/components/ConfirmModal";
import { getMonday } from "@/utils/calendarUtils";
import { clientColor, DEFAULT_PROJECT_COLOR } from "@/utils/colorUtils";
import {
  calculateDuration,
  formatDurationHoursMinutes,
  formatTime,
} from "@/utils/dateUtils";
import type { TimeEntry } from "@/types";

function clockText(totalSeconds: number): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${pad(h)}:${pad(m)}:${pad(totalSeconds % 60)}`;
}

function entrySeconds(entry: TimeEntry): number {
  return Math.max(0, calculateDuration(entry.startTime, entry.endTime, entry.breakMinutes));
}

function EntryRow({
  entry,
  meta,
  onEdit,
}: {
  entry: TimeEntry;
  meta: string;
  onEdit: (entry: TimeEntry) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onEdit(entry)}
      className="row-divider flex w-full flex-wrap items-center gap-x-3.5 gap-y-1 py-3.5 text-left hover:bg-paper-sunken"
      aria-label={`Edit ${entry.project.name}, ${meta}`}
    >
      <span
        className="h-9 w-2.5 shrink-0 rounded-[5px]"
        style={{ backgroundColor: entry.project.color ?? DEFAULT_PROJECT_COLOR }}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{entry.project.name}</span>
        <span className="block truncate text-[13px] text-ink-muted">{meta}</span>
      </span>
      <span className="tabular text-sm text-ink-muted">
        {formatTime(entry.startTime)} – {formatTime(entry.endTime)}
      </span>
      <span className="tabular min-w-16 text-right font-bold">
        {formatDurationHoursMinutes(entrySeconds(entry)) || "0m"}
      </span>
    </button>
  );
}

export function DashboardPage() {
  const now = new Date();
  const weekStart = getMonday(now);

  const { data: weekData, createTimeEntry, updateTimeEntry, deleteTimeEntry } = useTimeEntries({
    startDate: startOfDay(weekStart).toISOString(),
    endDate: endOfDay(now).toISOString(),
    limit: 100,
  });
  const { targets } = useClientTargets();
  const { projects } = useProjects();
  const {
    ongoingTimer,
    isLoading,
    elapsedSeconds,
    startTimer,
    stopTimer,
    cancelTimer,
    updateTimerProject,
  } = useTimer();

  const [selectedProject, setSelectedProject] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [stopPromptOpen, setStopPromptOpen] = useState(false);
  const [editTimerOpen, setEditTimerOpen] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const running = !!ongoingTimer;
  const projectValue = running ? (ongoingTimer.projectId ?? "") : selectedProject;

  const entries = [...(weekData?.entries ?? [])].sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
  );
  const todayEntries = entries.filter((e) => isSameDay(new Date(e.startTime), now));
  const earlierEntries = entries.filter((e) => !isSameDay(new Date(e.startTime), now));
  const todaySeconds = todayEntries.reduce((sum, e) => sum + entrySeconds(e), 0);

  const handleProjectChange = async (projectId: string) => {
    setError(null);
    if (!running) {
      setSelectedProject(projectId);
      return;
    }
    try {
      await updateTimerProject(projectId || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update project");
    }
  };

  const handleToggle = async () => {
    setError(null);
    try {
      if (!running) {
        await startTimer(selectedProject || undefined);
      } else if (!ongoingTimer.projectId) {
        setStopPromptOpen(true);
      } else {
        const entry = await stopTimer();
        if (!entry) setError("Could not stop the timer. Check for overlapping entries.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const handleDiscard = async () => {
    try {
      await cancelTimer();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to discard timer");
    }
  };

  const openForm = (entry: TimeEntry | null) => {
    setEditingEntry(entry);
    setFormOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-ink-muted">{format(now, "EEEE")}</div>
          <h1 className="m-0 text-2xl font-bold sm:text-[32px]">{format(now, "d MMMM yyyy")}</h1>
        </div>
        <button type="button" className="btn" onClick={() => openForm(null)}>
          <Plus className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden="true" />
          Add entry manually
        </button>
      </header>

      {/* The timer is the one thing on this page */}
      <section
        className={`card flex flex-wrap items-center gap-6 px-6 py-6 sm:px-8 sm:py-7 ${
          running ? "border-danger-line bg-danger-wash" : ""
        }`}
        aria-label="Timer"
      >
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-2.5">
          <label htmlFor="timer-project" className="eyebrow">
            {running ? "Tracking now" : "What are you working on?"}
          </label>
          <select
            id="timer-project"
            value={projectValue}
            onChange={(e) => void handleProjectChange(e.target.value)}
            disabled={isLoading}
            className="input h-[52px] text-[17px] font-medium"
          >
            <option value="">
              {running ? "No project yet (choose when you stop)" : "Choose a project (optional while running)"}
            </option>
            {projects?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.client.name}
              </option>
            ))}
          </select>
          {running && (
            <div className="flex gap-4 text-sm font-semibold">
              <button
                type="button"
                className="text-primary-800 hover:underline"
                onClick={() => setEditTimerOpen(true)}
              >
                Adjust start time
              </button>
              <button
                type="button"
                className="text-danger hover:underline"
                onClick={() => setConfirmDiscard(true)}
              >
                Discard timer
              </button>
            </div>
          )}
        </div>
        <div
          className={`tabular min-w-0 text-center text-5xl font-bold leading-none tracking-[-0.03em] sm:min-w-[250px] sm:text-[64px] ${
            running ? "text-danger" : "text-ink"
          }`}
          role="timer"
          aria-live="off"
        >
          {clockText(running ? elapsedSeconds : 0)}
        </div>
        <button
          type="button"
          onClick={() => void handleToggle()}
          disabled={isLoading}
          className={`inline-flex min-h-16 items-center justify-center rounded-2xl px-9 text-lg font-semibold text-white ${
            running ? "bg-danger hover:bg-danger-ink" : "bg-primary-600 hover:bg-primary-700"
          } max-sm:w-full`}
        >
          {running ? "Stop" : "Start"}
        </button>
        {error && (
          <p className="m-0 basis-full text-sm font-semibold text-danger" role="alert">
            {error}
          </p>
        )}
      </section>

      <div className="flex flex-wrap items-start gap-6">
        <section className="card min-w-0 flex-[1.4_1_480px] px-5 py-6 sm:px-7">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="m-0 text-lg font-bold">Today</h2>
            <span className="tabular text-sm font-semibold text-ink-muted">
              {todayEntries.length > 0 ? formatDurationHoursMinutes(todaySeconds) || "0m" : "0m"}
            </span>
          </div>
          {todayEntries.length === 0 ? (
            <div className="py-7 text-[15px] leading-normal text-ink-muted">
              Nothing tracked yet. Press <b className="text-ink">Start</b> when you begin, or add a past
              entry manually.
            </div>
          ) : (
            todayEntries.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                meta={`${entry.project.client.name}${entry.breakMinutes ? ` · break ${entry.breakMinutes}m` : ""}`}
                onEdit={openForm}
              />
            ))
          )}

          {earlierEntries.length > 0 && (
            <>
              <h3 className="eyebrow mb-1 mt-6">Earlier this week</h3>
              {earlierEntries.map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  meta={`${entry.project.client.name} · ${format(new Date(entry.startTime), "EEE d MMM")}${
                    entry.breakMinutes ? ` · break ${entry.breakMinutes}m` : ""
                  }`}
                  onEdit={openForm}
                />
              ))}
            </>
          )}
          <Link
            to="/time-entries"
            className="mt-3 inline-block text-sm font-semibold text-primary-800 hover:underline"
          >
            Open timesheet →
          </Link>
        </section>

        <section className="flex min-w-0 flex-[1_1_340px] flex-col gap-4">
          <h2 className="m-0 text-lg font-bold">Targets</h2>
          {(targets?.length ?? 0) === 0 ? (
            <div className="card text-sm leading-normal text-ink-muted">
              No targets yet. Set an hourly target for a client under{" "}
              <Link to="/clients" className="font-semibold text-primary-800 hover:underline">
                Clients &amp; projects
              </Link>
              .
            </div>
          ) : (
            targets?.map((target) => (
              <TargetProgressItem
                key={target.id}
                target={target}
                color={clientColor(projects, target.clientId)}
              />
            ))
          )}
        </section>
      </div>

      {formOpen && (
        <TimeEntryFormModal
          entry={editingEntry}
          onClose={() => setFormOpen(false)}
          createTimeEntry={createTimeEntry}
          updateTimeEntry={updateTimeEntry}
          onDelete={async (entry) => {
            await deleteTimeEntry.mutateAsync(entry.id);
          }}
        />
      )}
      {stopPromptOpen && <StopTimerModal onClose={() => setStopPromptOpen(false)} />}
      {editTimerOpen && <OngoingTimerEditModal onClose={() => setEditTimerOpen(false)} />}
      {confirmDiscard && (
        <ConfirmModal
          title="Discard this timer?"
          message="The time tracked so far will not be saved."
          confirmLabel="Discard"
          onConfirm={() => void handleDiscard()}
          onClose={() => setConfirmDiscard(false)}
        />
      )}
    </div>
  );
}
