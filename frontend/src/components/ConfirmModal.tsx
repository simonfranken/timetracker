import { Modal } from '@/components/Modal';

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
  confirmLabel = 'Delete',
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  return (
    <Modal title={title} onClose={onClose} maxWidth="max-w-sm">
      <p className="text-sm text-gray-600">{message}</p>
      <div className="flex justify-end space-x-3 mt-6">
        <button type="button" onClick={onClose} className="btn-secondary">
          Cancel
        </button>
        <button
          type="button"
          onClick={() => { onConfirm(); onClose(); }}
          className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
