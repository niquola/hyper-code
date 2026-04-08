type InputProps = {
  name: string;
  label?: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  value?: string;
};

export function UI_Input({ name, label, type = "text", required, placeholder, value }: InputProps): string {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        value={value}
        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
      />
    </div>
  );
}
