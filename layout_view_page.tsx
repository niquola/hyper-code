import { PAGE_STATE_SCRIPT } from "./pageState_script.ts";
import { HYPER_UI_STYLES } from "./hyper_ui_styles.ts";

export function layout_view_page(title: string, body: string, modelName?: string): string {
  return (
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <script src="https://unpkg.com/htmx.org@2.0.4"></script>
        <script src="https://unpkg.com/htmx-ext-sse@2.2.2/sse.js"></script>
        <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
        <style dangerouslySetInnerHTML={{ __html: HYPER_UI_STYLES }} />
        <script dangerouslySetInnerHTML={{ __html: PAGE_STATE_SCRIPT }} />
      </head>
      <body className="bg-gray-50 min-h-screen">
        <nav className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm font-medium">
              <a href="/" className="text-gray-700 hover:text-gray-900">Hyper Code</a>
              {modelName && (
                <a href="/settings" className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded hover:bg-gray-200" data-role="model-name">{modelName}</a>
              )}
            </div>
            <div className="flex items-center gap-3">
              <a href="/settings" data-action="settings" className="text-xs text-gray-400 hover:text-gray-600">Settings</a>
              <form method="POST" action="/reset" className="m-0">
                <button type="submit" data-action="reset" className="text-xs text-gray-400 hover:text-gray-600">New Chat</button>
              </form>
            </div>
          </div>
        </nav>
        <div className="max-w-2xl mx-auto px-4 py-10" dangerouslySetInnerHTML={{ __html: body }} />
      </body>
    </html>
  );
}
