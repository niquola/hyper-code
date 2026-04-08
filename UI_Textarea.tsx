type TextareaProps = {
  name: string;
  label?: string;
  rows?: number;
  required?: boolean;
  placeholder?: string;
  value?: string;
};

export function UI_Textarea({ name, label, rows = 4, required, placeholder, value }: TextareaProps): string {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <textarea
        name={name}
        rows={String(rows)}
        required={required}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
      >{value}</textarea>
    </div>
  );
}
