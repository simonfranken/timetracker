import { useEffect, useId } from "react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Short explanation shown under the title */
  description?: React.ReactNode;
  /** Optional override for the max-width of the dialog (default: max-w-[480px]) */
  maxWidth?: string;
}

/**
 * Generic dialog overlay. Closes on Escape or backdrop click.
 *
 * @example
 * <Modal title="Add client" onClose={handleClose}>
 *   <form onSubmit={handleSubmit}>...</form>
 * </Modal>
 */
export function Modal({
  title,
  onClose,
  children,
  description,
  maxWidth = "max-w-[480px]",
}: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/35 p-4 sm:pt-[10vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`my-auto w-full rounded-[20px] bg-white p-6 shadow-[0_20px_50px_rgba(0,0,0,0.25)] sm:my-0 sm:p-7 ${maxWidth}`}
      >
        <h2 id={titleId} className="m-0 text-[22px] font-bold text-ink">
          {title}
        </h2>
        {description && <div className="mt-1 text-sm text-ink-muted">{description}</div>}
        <div className="mt-[18px]">{children}</div>
      </div>
    </div>
  );
}
