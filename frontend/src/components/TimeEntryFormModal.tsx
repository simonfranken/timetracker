import { useState } from "react";
import { addDays, differenceInCalendarDays, format, startOfDay } from "date-fns";
import type { UseMutationResult } from "@tanstack/react-query";
import { Modal } from "@/components/Modal";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useProjects } from "@/hooks/useProjects";
import { formatDurationHoursMinutes } from "@/utils/dateUtils";
import type {
  CreateTimeEntryInput,
  TimeEntry,
  UpdateTimeEntryInput,
} from "@/types";

export interface NewEntryDefaults {
  /** Day the entry starts on */
  date: Date;
  /** HH:mm */
  start: string;
  /** HH:mm */
  end: string;
  projectId?: string;
}

interface TimeEntryFormModalProps {
  /** Entry being edited, or null when creating one */
  entry: TimeEntry | null;
  /** Prefilled values when creating (e.g. from a calendar selection) */
  defaults?: NewEntryDefaults;
  onClose: () => void;
  createTimeEntry: UseMutationResult<TimeEntry, Error, CreateTimeEntryInput>;
  updateTimeEntry: UseMutationResult<TimeEntry, Error, { id: string; input: UpdateTimeEntryInput }>;
  /** Shown as a Delete button when editing */
  onDelete?: (entry: TimeEntry) => Promise<void> | void;
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function describeDay(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? "" : format(parsed, "EEEE, d MMMM yyyy");
}

export function TimeEntryFormModal({
  entry,
  defaults,
  onClose,
  createTimeEntry,
  updateTimeEntry,
  onDelete,
}: TimeEntryFormModalProps) {
  const { projects } = useProjects();

  const initial = (() => {
    if (entry) {
      const start = new Date(entry.startTime);
      const end = new Date(entry.endTime);
      return {
        projectId: entry.projectId,
        date: format(start, "yyyy-MM-dd"),
        start: format(start, "HH:mm"),
        end: format(end, "HH:mm"),
        // Entries that run past midnight keep their end day when edited
        endDayOffset: Math.max(0, differenceInCalendarDays(startOfDay(end), startOfDay(start))),
        breakMinutes: String(entry.breakMinutes),
        description: entry.description ?? "",
      };
    }
    const date = defaults?.date ?? new Date();
    const now = new Date();
    return {
      projectId: defaults?.projectId ?? "",
      date: format(date, "yyyy-MM-dd"),
      start: defaults?.start ?? format(new Date(now.getTime() - 60 * 60 * 1000), "HH:mm"),
      end: defaults?.end ?? format(now, "HH:mm"),
      endDayOffset: 0,
      breakMinutes: "0",
      description: "",
    };
  })();

  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const projectId = form.projectId || projects?.[0]?.id || "";
  const breakMinutes = Math.max(0, parseInt(form.breakMinutes, 10) || 0);
  const grossMinutes =
    form.endDayOffset * 24 * 60 + toMinutes(form.end) - toMinutes(form.start);
  const timeError = grossMinutes <= 0 ? "End time must be after start time." : null;
  const breakError =
    !timeError && breakMinutes >= grossMinutes ? "Break must be shorter than the entry." : null;
  const validationError = timeError ?? breakError;
  const netSeconds = Math.max(0, grossMinutes - breakMinutes) * 60;
  const isSaving = createTimeEntry.isPending || updateTimeEntry.isPending;

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setError(null);
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!projectId) {
      setError("Please select a project.");
      return;
    }
    if (validationError || !form.date) {
      setError(validationError ?? "Please choose a date.");
      return;
    }

    const startDate = new Date(`${form.date}T${form.start}`);
    const endDay = addDays(new Date(`${form.date}T00:00:00`), form.endDayOffset);
    const endDate = new Date(`${format(endDay, "yyyy-MM-dd")}T${form.end}`);

    const input: CreateTimeEntryInput = {
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      breakMinutes,
      description: form.description,
      projectId,
    };

    try {
      if (entry) {
        await updateTimeEntry.mutateAsync({ id: entry.id, input });
      } else {
        await createTimeEntry.mutateAsync(input);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  };

  const handleDelete = async () => {
    if (!entry || !onDelete) return;
    try {
      await onDelete(entry);
      onClose();
    } catch (err) {
      setConfirmDelete(false);
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const shownError = error ?? validationError;

  return (
    <>
      <Modal
        title={entry ? "Edit entry" : "New entry"}
        description={describeDay(form.date) || "Add a past entry or change an existing one."}
        onClose={onClose}
      >
        <form onSubmit={handleSubmit} noValidate>
          <label className="label" htmlFor="entry-project">
            Project
          </label>
          <select
            id="entry-project"
            value={projectId}
            onChange={(e) => set("projectId", e.target.value)}
            className="input"
          >
            {projects?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.client.name}
              </option>
            ))}
          </select>

          <div className="mt-3.5 grid grid-cols-3 gap-3">
            <div className="col-span-3 sm:col-span-1">
              <label className="label" htmlFor="entry-date">
                Date
              </label>
              <input
                id="entry-date"
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                className="input tabular"
              />
            </div>
            <div className="col-span-1">
              <label className="label" htmlFor="entry-start">
                Start
              </label>
              <input
                id="entry-start"
                type="time"
                step={900}
                value={form.start}
                onChange={(e) => set("start", e.target.value)}
                className="input tabular"
              />
            </div>
            <div className="col-span-1">
              <label className="label" htmlFor="entry-end">
                End
              </label>
              <input
                id="entry-end"
                type="time"
                step={900}
                value={form.end}
                onChange={(e) => set("end", e.target.value)}
                className="input tabular"
              />
            </div>
            <div className="col-span-1 sm:col-span-3">
              <label className="label" htmlFor="entry-break">
                Break (minutes)
              </label>
              <input
                id="entry-break"
                type="number"
                min={0}
                inputMode="numeric"
                value={form.breakMinutes}
                onChange={(e) => set("breakMinutes", e.target.value)}
                className="input tabular"
              />
            </div>
          </div>

          {form.endDayOffset > 0 && (
            <p className="mb-0 mt-2 text-[13px] text-ink-muted">
              Ends {form.endDayOffset === 1 ? "the next day" : `${form.endDayOffset} days later`}.
            </p>
          )}

          {shownError ? (
            <div className="callout-error mt-3" role="alert">
              {shownError}
            </div>
          ) : (
            <div className="callout-ok mt-3">
              Total {formatDurationHoursMinutes(netSeconds)}
              {breakMinutes > 0 ? " after break" : ""}
            </div>
          )}

          <label className="label mt-3.5" htmlFor="entry-notes">
            Notes <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <textarea
            id="entry-notes"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            className="input"
            rows={2}
          />

          <div className="mt-[22px] flex items-center justify-between gap-2">
            <span>
              {entry && onDelete && (
                <button
                  type="button"
                  className="btn-ghost-danger"
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete
                </button>
              )}
            </span>
            <span className="flex gap-2">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={isSaving || !!validationError}>
                {isSaving ? "Saving…" : "Save"}
              </button>
            </span>
          </div>
        </form>
      </Modal>

      {confirmDelete && entry && (
        <ConfirmModal
          title="Delete this entry?"
          message={`${entry.project.name} · ${format(new Date(entry.startTime), "EEE d MMM")} · ${formatDurationHoursMinutes(
            Math.max(
              0,
              (new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / 1000 -
                entry.breakMinutes * 60,
            ),
          )}. This can't be undone.`}
          onConfirm={() => void handleDelete()}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
}
