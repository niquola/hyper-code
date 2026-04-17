export const name = "html_message";
export const description = "Show static HTML inline in chat. Use for tables, reports, status badges, results. Not interactive — for user input use html_dialog instead.";
export const parameters = {
  type: "object",
  properties: {
    html: { type: "string", description: "HTML to render. Wrapped in .hyper-ui container with default styles." },
  },
  required: ["html"],
};

export default async function html_message(ctx: Ctx, session: any, params: { html: string }) {
  return { content: [{ type: "html" as const, html: params.html }] };
}
