type SelectOption = { value: string; label: string };

type SelectProps = {
  name: string;
  label?: string;
  options: SelectOption[];
  value?: string;
  autosubmit?: boolean;
};

export function UI_Select({ name, label, options, value, autosubmit }: SelectProps): string {
  return (
    <div>
      {label && <div className="text-xs font-medium text-gray-500 uppercase mb-2">{label}</div>}
      <select
        name={name}
        className="w-full text-sm border border-gray-300 rounded px-2 py-1"
        onchange={autosubmit ? "this.form.submit()" : undefined}
      >
        {options.map((o) => (
          <option value={o.value} selected={o.value === value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
