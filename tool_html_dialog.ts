import type { AgentTool } from "./agent_type_Tool.ts";

let dialogCounter = 0;

export function tool_html_dialog(): AgentTool {
  return {
    name: "html_dialog",
    description: "Open a modal dialog for user input. Put form fields inside (inputs, checkboxes, selects). Dialog auto-wraps in <form> with dispatch and Submit/Cancel buttons. Closes after submit, result sent back to you.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Dialog title" },
        html: { type: "string", description: "Form content HTML: inputs, checkboxes, selects, labels. No <form> tag needed." },
        submit_label: { type: "string", description: "Submit button text. Default: 'Submit'" },
      },
      required: ["title", "html"],
    },
    execute: async (params: { title: string; html: string; submit_label?: string }) => {
      const id = `dlg-${Date.now()}-${++dialogCounter}`;
      const submitLabel = params.submit_label || "Submit";
      const html = `<dialog id="${id}" data-widget-id="${id}" class="rounded-lg shadow-xl border border-gray-200 p-0 max-w-md w-full backdrop:bg-black/30">
  <form hx-post="dispatch" hx-swap="none" class="p-5" onsubmit="setTimeout(()=>this.closest('dialog').remove(),0)">
    <h3 class="text-lg font-semibold text-gray-900 mb-4">${params.title}</h3>
    <div class="space-y-3 mb-5">${params.html}</div>
    <div class="flex justify-end gap-2">
      <button type="button" class="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700" onclick="this.closest('dialog').remove()">Cancel</button>
      <button type="submit" class="px-4 py-1.5 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700">${submitLabel}</button>
    </div>
  </form>
</dialog>
<script>document.getElementById('${id}')?.showModal?.()</script>`;
      return { content: [{ type: "html", html }] };
    },
  };
}
