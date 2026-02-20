type Variant = "primary" | "secondary" | "danger" | "success";

const variantStyles: Record<Variant, string> = {
  primary: "text-white font-medium bg-blue-600 hover:bg-blue-700",
  secondary:
    "text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600",
  danger: "text-white font-medium bg-red-600 hover:bg-red-700",
  success: "text-white font-medium bg-emerald-500 hover:bg-emerald-600",
};

export const Button = ({
  variant,
  children,
  onClick,
  type = "button",
}: {
  variant: Variant;
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`px-4 py-2 text-sm rounded-lg transition-colors duration-200 ${variantStyles[variant]}`}
    >
      {children}
    </button>
  );
};
