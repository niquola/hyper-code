type AlertProps = {
  message: string;
  variant?: "error" | "success" | "info";
};

const VARIANT_CLASSES = {
  error: "bg-red-50 text-red-700",
  success: "bg-green-50 text-green-700",
  info: "bg-blue-50 text-blue-700",
};

export function UI_Alert({ message, variant = "error" }: AlertProps): string {
  return (
    <div data-role="error" className={`${VARIANT_CLASSES[variant]} px-4 py-3 rounded mb-4`}>
      {message}
    </div>
  );
}
