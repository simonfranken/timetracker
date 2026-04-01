import { useState } from "react";
import { Modal } from "@/components/Modal";
import { useProjects } from "@/hooks/useProjects";
import { useTimer } from "@/contexts/TimerContext";

interface OngoingTimerEditModalProps {
  onClose: () => void;
}

function timeInputToIso(timeValue: string): string {
  const [hours, minutes] = timeValue.split(":").map(Number);
  const now = new Date();
  const candidate = new Date(now);
  candidate.setHours(hours, minutes, 0, 0);
  if (candidate > now) {
    candidate.setDate(candidate.getDate() - 1);
  }
  return candidate.toISOString();
}

function toTimeInputValue(dateValue: string): string {
  const date = new Date(dateValue);
  const hh = date.getHours().toString().padStart(2, "0");
  const mm = date.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

export function OngoingTimerEditModal({ onClose }: OngoingTimerEditModalProps) {
  const { projects } = useProjects();
  const { ongoingTimer, updateTimerProject, updateTimerStartTime } = useTimer();

  const [projectId, setProjectId] = useState<string>(ongoingTimer?.projectId ?? "");
  const [startTimeInput, setStartTimeInput] = useState<string>(
    ongoingTimer ? toTimeInputValue(ongoingTimer.startTime) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!ongoingTimer) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      if (projectId !== (ongoingTimer.projectId ?? "")) {
        await updateTimerProject(projectId || null);
      }

      const currentStartIso = new Date(ongoingTimer.startTime).toISOString();
      const nextStartIso = timeInputToIso(startTimeInput);

      if (nextStartIso !== currentStartIso) {
        await updateTimerStartTime(nextStartIso);
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update running timer");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal title="Edit Running Timer" onClose={onClose}>
      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Project</label>
          <select
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            className="input"
          >
            <option value="">No project</option>
            {projects?.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Start Time</label>
          <input
            type="time"
            value={startTimeInput}
            onChange={(event) => setStartTimeInput(event.target.value)}
            className="input"
            required
          />
        </div>

        <div className="flex justify-end space-x-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
