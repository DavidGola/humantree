import { useEffect } from "react";

const sizeClasses = {
  default: "max-w-md",
  large: "max-w-4xl max-h-[85vh] flex flex-col",
};

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
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
      onClick={onClose}
    >
      <div
        className={`relative rounded-xl shadow-lg p-6 w-full bg-white dark:bg-slate-800 ${sizeClasses[size]}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">
              {title}
            </h2>
            <button
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none transition-colors duration-200 text-2xl leading-none"
              onClick={onClose}
              aria-label="Fermer la modale"
            >
              &times;
            </button>
          </div>
        )}
        {!title && (
          <button
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none transition-colors duration-200 text-2xl leading-none"
            onClick={onClose}
            aria-label="Fermer la modale"
          >
            &times;
          </button>
        )}
        {children}
      </div>
    </div>
  );
};
