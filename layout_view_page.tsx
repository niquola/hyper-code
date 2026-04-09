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
      <body className="bg-gray-50 h-screen flex overflow-hidden">

        <aside id="sidebar" className="w-56 shrink-0 bg-gray-900 text-gray-300 flex flex-col h-full">
          <div className="p-3 border-b border-gray-700 flex items-center justify-between">
            <a href="/" className="text-sm font-semibold text-white">Hyper Code</a>
            <form method="POST" action="/reset" className="m-0">
              <button type="submit" data-action="reset" className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded">+ New</button>
            </form>
          </div>
          <div className="flex-1 overflow-y-auto p-2" hx-get="/sessions" hx-trigger="load" hx-swap="innerHTML">
          </div>
          <div className="p-3 border-t border-gray-700 text-xs">
            <a href="/settings" data-action="settings" className="text-gray-400 hover:text-gray-200">Settings</a>
          </div>
        </aside>

        <main className="flex-1 min-w-0 flex flex-col">
          <header className="shrink-0 bg-white border-b border-gray-200 px-4 py-2">
            <div className="max-w-3xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                {modelName && (
                  <a href="/settings" className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded hover:bg-gray-200" data-role="model-name">{modelName}</a>
                )}
                <span id="nav-stats" className="text-xs text-gray-400" hx-get="/stats" hx-trigger="load" hx-swap="outerHTML"></span>
              </div>
            </div>
          </header>
          <div className="flex-1 min-h-0 flex flex-col max-w-3xl w-full mx-auto px-4" dangerouslySetInnerHTML={{ __html: body }} />
        </main>

      </body>
    </html>
  );
}
