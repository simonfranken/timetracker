import { Modal } from "@/components/Modal";

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmModal({
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  return (
    <Modal title={title} onClose={onClose} maxWidth="max-w-sm">
      <p className="m-0 text-sm text-ink-muted">{message}</p>
      <div className="mt-[18px] flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-secondary">
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className="btn-danger"
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
