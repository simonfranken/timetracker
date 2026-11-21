import { useRef, useState } from "react";
import { format } from "date-fns";
import { Modal } from "@/components/Modal";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useClientTargets } from "@/hooks/useClientTargets";
import { formatSignedDuration, parseHoursInput } from "@/utils/dateUtils";
import type { BalanceCorrection, ClientTargetWithBalance } from "@/types";

export interface CorrectionModalProps {
  targets: ClientTargetWithBalance[];
  /** Existing correction to edit (identified by target + correction id) */
  editing?: { targetId: string; correction: BalanceCorrection } | null;
  /** Prefill when creating */
  defaults?: { targetId?: string; date?: string };
  onClose: () => void;
}

function periodLabel(target: ClientTargetWithBalance): string {
  return `${target.targetHours}h/${target.periodType === "weekly" ? "week" : "month"}`;
}

export function CorrectionModal({ targets, editing, defaults, onClose }: CorrectionModalProps) {
  const { addCorrection, deleteCorrection } = useClientTargets();

  const [targetId, setTargetId] = useState(
    editing?.targetId ?? defaults?.targetId ?? targets[0]?.id ?? "",
  );
  const [date, setDate] = useState(
    editing?.correction.date ?? defaults?.date ?? format(new Date(), "yyyy-MM-dd"),
  );
  const [hours, setHours] = useState(
    editing ? String(Math.abs(editing.correction.hours)) : "3",
  );
  const [sign, setSign] = useState<1 | -1>(editing && editing.correction.hours < 0 ? -1 : 1);
  const [note, setNote] = useState(editing?.correction.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Set once the replacement has been saved, so a retry only has to remove the old one
  const replacementAdded = useRef(false);

  const target = targets.find((t) => t.id === targetId);
  const amount = parseHoursInput(hours);
  const amountValid = Number.isFinite(amount) && amount > 0 && amount <= 1000;
  const signed = amountValid ? sign * amount : 0;

  // When editing, the old value is replaced, so take it out of the preview baseline.
  const baseline =
    (target?.totalBalanceSeconds ?? 0) -
    (editing && editing.targetId === targetId ? editing.correction.hours * 3600 : 0);
  const after = baseline + Math.round(signed * 3600);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!target) {
      setError("Choose a client target.");
      return;
    }
    if (!amountValid) {
      setError("Enter an amount of hours greater than 0.");
      return;
    }
    if (!date) {
      setError("Choose a date.");
      return;
    }

    setSaving(true);
    try {
      // The API has no update endpoint: add the new value first, then remove the old one,
      // so a failure never loses data.
      if (!replacementAdded.current) {
        await addCorrection.mutateAsync({
          targetId: target.id,
          input: { date, hours: signed, description: note.trim() || undefined },
        });
        replacementAdded.current = true;
      }
      if (editing) {
        await deleteCorrection.mutateAsync({
          targetId: editing.targetId,
          correctionId: editing.correction.id,
        });
      }
      onClose();
    } catch (err) {
      const reason = err instanceof Error ? err.message : "Failed to save correction";
      setError(
        replacementAdded.current
          ? `The new value was saved, but the old correction could not be removed (${reason}). Press Save to try again.`
          : reason,
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    try {
      await deleteCorrection.mutateAsync({
        targetId: editing.targetId,
        correctionId: editing.correction.id,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete correction");
    }
  };

  if (targets.length === 0) {
    return (
      <Modal title="Add balance correction" onClose={onClose}>
        <p className="m-0 text-sm text-ink-muted">
          Corrections belong to a client target. Set a target for a client under Clients &amp;
          projects first.
        </p>
        <div className="mt-[18px] flex justify-end">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <>
      <Modal
        title={editing ? "Edit balance correction" : "Add balance correction"}
        description="Adds or removes hours on a client's target balance, e.g. for vacation or carried-over overtime."
        onClose={onClose}
      >
        <form onSubmit={handleSave} noValidate>
          <label className="label" htmlFor="corr-target">
            Client target
          </label>
          <select
            id="corr-target"
            className="input"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            disabled={!!editing}
          >
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.clientName} · {periodLabel(t)}
              </option>
            ))}
          </select>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="corr-date">
                Date
              </label>
              <input
                id="corr-date"
                type="date"
                className="input tabular"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="corr-hours">
                Hours
              </label>
              <input
                id="corr-hours"
                inputMode="decimal"
                className="input tabular"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-3 segmented" role="group" aria-label="Direction">
            <button
              type="button"
              aria-pressed={sign === 1}
              className={`segmented-item ${sign === 1 ? "segmented-item-on" : ""}`}
              onClick={() => setSign(1)}
            >
              Add hours
            </button>
            <button
              type="button"
              aria-pressed={sign === -1}
              className={`segmented-item ${sign === -1 ? "segmented-item-on" : ""}`}
              onClick={() => setSign(-1)}
            >
              Remove hours
            </button>
          </div>

          <label className="label mt-4" htmlFor="corr-note">
            Note <span className="font-normal text-ink-muted">(optional, shown on the calendar)</span>
          </label>
          <input
            id="corr-note"
            className="input"
            placeholder="e.g. Vacation"
            maxLength={255}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          {target && (
            <div className="tabular mt-[18px] rounded-xl bg-correction-soft px-4 py-3.5 text-sm text-correction">
              {target.clientName} balance: {formatSignedDuration(baseline)} →{" "}
              <b>{formatSignedDuration(after)}</b>
            </div>
          )}

          {error && (
            <div className="callout-error mt-3" role="alert">
              {error}
            </div>
          )}

          <div className="mt-[22px] flex items-center justify-between gap-2">
            <span>
              {editing && (
                <button type="button" className="btn-ghost-danger" onClick={() => setConfirmDelete(true)}>
                  Delete
                </button>
              )}
            </span>
            <span className="flex gap-2">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Save correction"}
              </button>
            </span>
          </div>
        </form>
      </Modal>

      {confirmDelete && editing && (
        <ConfirmModal
          title="Delete this correction?"
          message={`${editing.correction.description || "Correction"} · ${format(
            new Date(`${editing.correction.date}T00:00:00`),
            "EEE d MMM",
          )} · ${formatSignedDuration(editing.correction.hours * 3600)}. This can't be undone.`}
          onConfirm={() => void handleDelete()}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
}
