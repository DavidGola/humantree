type Variant = "primary" | "secondary" | "danger" | "success";

const variantStyles: Record<Variant, string> = {
  primary: "text-white bg-primary-700 hover:bg-primary-800 border border-primary-800",
  secondary: "text-gray-600 dark:text-slate-300 bg-transparent border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800",
  danger: "text-white bg-red-600 hover:bg-red-700 border border-red-700",
  success: "text-white bg-emerald-600 hover:bg-emerald-700 border border-emerald-700",
};

export const Button = ({
  variant,
  children,
  onClick,
  type = "button",
  disabled = false,
}: {
  variant: Variant;
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 text-sm rounded-lg font-display font-semibold transition-colors duration-150 ${variantStyles[variant]} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
};
