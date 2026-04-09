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

        <aside id="sidebar" className="w-56 shrink-0 bg-white border-r border-gray-200 text-gray-700 flex flex-col h-full">
          <div className="p-3 border-b border-gray-200 flex items-center justify-between">
            <a href="/" className="text-sm font-semibold text-gray-900">Hyper Code</a>
            <a href="/session/new" data-action="new" className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded">+ New</a>
          </div>
          <div className="flex-1 overflow-y-auto p-2" hx-get="/sessions" hx-trigger="load, every 5s" hx-swap="innerHTML" hx-vals="js:{current: location.pathname.match(/\/session\/([^/]+)/)?.[1] || ''}">
          </div>
          <div className="p-3 border-t border-gray-200 text-xs">
            <a href="/settings" data-action="settings" className="text-gray-400 hover:text-gray-600">Settings</a>
          </div>
        </aside>

        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <header className="shrink-0 bg-white border-b border-gray-200 px-4 py-2">
            <div className="max-w-3xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                {modelName && (
                  <a href="/settings" className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded hover:bg-gray-200" data-role="model-name">{modelName}</a>
                )}
                <span id="nav-stats" className="text-xs text-gray-400"></span>
              </div>
            </div>
          </header>
          <div className="flex-1 min-h-0 flex flex-col" dangerouslySetInnerHTML={{ __html: body }} />
        </main>

      </body>
    </html>
  );
}
