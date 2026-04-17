export const name = "html_dialog";
export const description = "Open a blocking modal dialog for user input. Provide title + form fields. Blocks until user responds — their answer returned as tool result.";
export const parameters = {
  type: "object",
  properties: {
    title: { type: "string", description: "Dialog title" },
    html: { type: "string", description: "Form fields HTML: inputs, checkboxes, selects, labels. No <form> needed." },
    submit_label: { type: "string", description: "Submit button text. Default: 'Submit'" },
  },
  required: ["title", "html"],
};

export default async function html_dialog(ctx: Ctx, session: any, params: { title: string; html: string; submit_label?: string }) {
  const id = `dlg-${session.session_id}-${crypto.randomUUID()}`;
  const submitLabel = params.submit_label || "Submit";

  const dialogHtml = `<dialog id="${id}" data-widget-id="${id}" class="rounded-lg shadow-xl border border-gray-200 p-0 max-w-md w-full backdrop:bg-black/30">
  <form class="p-5" onsubmit="return submitDialog(event, this)">
    <h3 class="text-lg font-semibold text-gray-900 mb-4">${params.title}</h3>
    <div class="space-y-3 mb-5">${params.html}</div>
    <div class="flex justify-end gap-2">
      <button type="button" class="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700" onclick="this.closest('dialog').remove()">Cancel</button>
      <button type="submit" class="px-4 py-1.5 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700">${submitLabel}</button>
    </div>
  </form>
</dialog>
<script>var d=document.getElementById('${id}');if(d&&!d.open)d.showModal()</script>`;

  session.emitHtml?.(dialogHtml);

  const { promise, resolve } = Promise.withResolvers<string>();
  session.pendingDialogs.set(id, resolve);
  const userResponse = await promise;
  session.pendingDialogs.delete(id);

  return { content: [{ type: "text" as const, text: userResponse }] };
}
