import { useEffect, useRef, useId } from "react";

const sizeClasses = {
  default: "max-w-md",
  large: "max-w-4xl max-h-[85vh] flex flex-col",
};

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export const Modal = ({
  title,
  children,
  onClose,
  size = "default",
}: {
  title?: string;
  children: React.ReactNode;
  onClose: () => void;
  size?: "default" | "large";
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    // Sauvegarder l'élément actif avant l'ouverture
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Focus sur le premier élément focusable
    const firstFocusable = modalRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    firstFocusable?.focus();

    // Restaurer le focus à la fermeture
    return () => {
      previousActiveElement.current?.focus();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      // Focus trap: Tab navigation
      if (e.key === "Tab" && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-[60]"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={`relative rounded-2xl p-6 w-full surface-strong overflow-hidden animate-modal-enter shadow-xl ${sizeClasses[size]}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient top bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600" />

        {/* Close button - always top right */}
        <button
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-primary-200/30 dark:hover:bg-slate-700 focus:outline-none transition-all duration-200"
          onClick={onClose}
          aria-label="Fermer la modale"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {title && (
          <h2
            id={titleId}
            className="text-xl font-display font-bold text-gray-800 dark:text-white mb-5 pt-1 pr-8"
          >
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
};
