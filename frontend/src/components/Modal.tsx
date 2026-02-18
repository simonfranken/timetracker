import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Optional override for the max-width of the modal panel (default: max-w-md) */
  maxWidth?: string;
}

/**
 * Generic modal overlay with a header and close button.
 * Render form content (or any JSX) as children.
 *
 * @example
 * <Modal title="Add Client" onClose={handleClose}>
 *   <form onSubmit={handleSubmit}>...</form>
 * </Modal>
 */
export function Modal({ title, onClose, children, maxWidth = 'max-w-md' }: ModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`bg-white rounded-lg shadow-xl ${maxWidth} w-full`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
