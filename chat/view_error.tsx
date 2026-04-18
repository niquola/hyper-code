export default function chat_view_error(error: string): string {
  return (
    <div data-entity="message" data-status="error" className="mb-4">
      <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm" data-role="content">{error}</div>
    </div>
  );
}
