import { useState } from "react";
import { Modal } from "@/components/Modal";
import { ProjectColorDot } from "@/components/ProjectColorDot";
import { useProjects } from "@/hooks/useProjects";
import { useTimer } from "@/contexts/TimerContext";
import { formatDurationHoursMinutes } from "@/utils/dateUtils";

interface StopTimerModalProps {
  onClose: () => void;
}

/** Shown when stopping a timer that has no project yet. */
export function StopTimerModal({ onClose }: StopTimerModalProps) {
  const { projects } = useProjects();
  const { elapsedSeconds, stopTimer, cancelTimer } = useTimer();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (projectId: string) => {
    setBusy(true);
    setError(null);
    const entry = await stopTimer(projectId);
    setBusy(false);
    if (entry) {
      onClose();
    } else {
      setError("Could not save the entry. Check for overlapping entries and try again.");
    }
  };

  const discard = async () => {
    setBusy(true);
    setError(null);
    try {
      await cancelTimer();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to discard timer");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Which project was this?"
      description={
        <>
          You tracked <b className="text-ink">{formatDurationHoursMinutes(elapsedSeconds) || "0m"}</b>. Pick a
          project to save the entry.
        </>
      }
      onClose={onClose}
    >
      <div className="flex flex-col gap-2">
        {projects?.length === 0 && (
          <p className="m-0 text-sm text-ink-muted">
            You have no projects yet. Create one under Clients &amp; projects first.
          </p>
        )}
        {projects?.map((project) => (
          <button
            key={project.id}
            type="button"
            disabled={busy}
            onClick={() => void pick(project.id)}
            className="btn min-h-[52px] justify-start gap-3"
          >
            <ProjectColorDot color={project.color} size="h-3.5 w-3.5" />
            <span className="truncate">
              {project.name}{" "}
              <span className="font-medium text-ink-muted">· {project.client.name}</span>
            </span>
          </button>
        ))}
      </div>
      {error && (
        <div className="callout-error mt-3" role="alert">
          {error}
        </div>
      )}
      <div className="mt-[18px] flex justify-between gap-2">
        <button type="button" className="btn-ghost-danger" disabled={busy} onClick={() => void discard()}>
          Discard timer
        </button>
        <button type="button" className="btn-secondary" onClick={onClose}>
          Keep running
        </button>
      </div>
    </Modal>
  );
}
