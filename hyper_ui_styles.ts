// Default styles for .hyper-ui containers — nice defaults for forms, tables,
// buttons, inputs without needing Tailwind classes on every element.
// Injected into layout <head> as <style>.

export const HYPER_UI_STYLES = `
/* hyper-ui widget defaults */
.hyper-ui { font-size: 14px; line-height: 1.6; color: #1f2937; }

/* Headings */
.hyper-ui h1 { font-size: 1.25rem; font-weight: 700; margin: 0 0 0.5rem; }
.hyper-ui h2 { font-size: 1.1rem; font-weight: 600; margin: 0 0 0.5rem; }
.hyper-ui h3 { font-size: 1rem; font-weight: 600; margin: 0 0 0.4rem; }

/* Paragraphs */
.hyper-ui p { margin: 0 0 0.5rem; }

/* Forms */
.hyper-ui form { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: end; }

.hyper-ui input[type="text"],
.hyper-ui input[type="number"],
.hyper-ui input[type="email"],
.hyper-ui input[type="password"],
.hyper-ui input[type="url"],
.hyper-ui input[type="search"],
.hyper-ui input:not([type]),
.hyper-ui textarea,
.hyper-ui select {
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  background: white;
  outline: none;
  transition: border-color 0.15s;
}
.hyper-ui input:focus, .hyper-ui textarea:focus, .hyper-ui select:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59,130,246,0.15);
}
.hyper-ui textarea { min-height: 60px; resize: vertical; }

/* Buttons */
.hyper-ui button,
.hyper-ui input[type="submit"] {
  padding: 6px 14px;
  background: #111827;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}
.hyper-ui button:hover, .hyper-ui input[type="submit"]:hover { background: #374151; }
.hyper-ui button.secondary { background: white; color: #374151; border: 1px solid #d1d5db; }
.hyper-ui button.secondary:hover { background: #f9fafb; }
.hyper-ui button.danger { background: #dc2626; }
.hyper-ui button.danger:hover { background: #b91c1c; }
.hyper-ui button.success { background: #16a34a; }
.hyper-ui button.success:hover { background: #15803d; }
.hyper-ui button.sm { padding: 3px 8px; font-size: 12px; }

/* Tables */
.hyper-ui table { width: 100%; border-collapse: collapse; font-size: 13px; }
.hyper-ui th { text-align: left; font-weight: 600; padding: 6px 10px; border-bottom: 2px solid #e5e7eb; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
.hyper-ui td { padding: 6px 10px; border-bottom: 1px solid #f3f4f6; }
.hyper-ui tr:hover td { background: #f9fafb; }

/* Lists */
.hyper-ui ul, .hyper-ui ol { margin: 0 0 0.5rem; padding-left: 1.5rem; }
.hyper-ui li { margin: 0.15rem 0; }

/* Labels */
.hyper-ui label { font-size: 13px; font-weight: 500; color: #374151; display: block; margin-bottom: 2px; }

/* Checkbox/radio rows */
.hyper-ui .check-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; }
.hyper-ui input[type="checkbox"], .hyper-ui input[type="radio"] { width: 16px; height: 16px; accent-color: #3b82f6; }

/* Dividers */
.hyper-ui hr { border: none; border-top: 1px solid #e5e7eb; margin: 0.75rem 0; }

/* Code */
.hyper-ui code { background: #f3f4f6; padding: 1px 4px; border-radius: 3px; font-size: 12px; }
.hyper-ui pre { background: #0d1117; color: #e6edf3; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 12px; margin: 0.5rem 0; }

/* Alerts */
.hyper-ui .alert { padding: 8px 12px; border-radius: 6px; font-size: 13px; margin: 0.5rem 0; }
.hyper-ui .alert-success { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
.hyper-ui .alert-error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
.hyper-ui .alert-info { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }

/* Cards */
.hyper-ui .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: white; margin: 0.5rem 0; }

/* Badges */
.hyper-ui .badge { display: inline-block; padding: 1px 8px; border-radius: 9999px; font-size: 11px; font-weight: 500; }
.hyper-ui .badge-green { background: #dcfce7; color: #166534; }
.hyper-ui .badge-red { background: #fee2e2; color: #991b1b; }
.hyper-ui .badge-blue { background: #dbeafe; color: #1e40af; }
.hyper-ui .badge-gray { background: #f3f4f6; color: #374151; }

/* Tool call chevron rotation */
details[open] > summary svg:last-child { transform: rotate(180deg); }
details > summary::-webkit-details-marker { display: none; }

/* Code highlighting — shiki overrides prose conflicts */
pre.shiki { margin: 0; padding: 0.75rem 1rem; border-radius: 6px; font-size: 12px; line-height: 1.5; }
pre.shiki code { font-size: inherit; background: none !important; color: inherit !important; padding: 0 !important; }
.prose pre.shiki { margin-top: 0.5rem; margin-bottom: 0.5rem; }
.prose code { background: #f3f4f6; padding: 0.15em 0.35em; border-radius: 3px; font-size: 0.85em; }
.prose pre code { background: none; padding: 0; border-radius: 0; font-size: inherit; }

/* Tool results code blocks */
[data-entity="tool"] pre.shiki { border-radius: 0; }
`;
