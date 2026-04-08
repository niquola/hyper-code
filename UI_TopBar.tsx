type TopBarProps = {
  title: string;
  rightElement?: string;
};

export function UI_TopBar({ title, rightElement }: TopBarProps): string {
  return (
    <div className="flex items-center justify-between mb-3 border-b border-gray-200 pb-3">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      {rightElement}
    </div>
  );
}
