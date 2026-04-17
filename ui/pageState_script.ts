// Inline <script> for layout — exposes window.__pageState() for CDP and testing.
// Import in layout_view_page.tsx and inject as <script>.

const PAGE_STATE_SCRIPT = `window.__pageState = function() {
  return {
    page: document.querySelector("[data-page]")?.dataset.page || null,
    url: location.pathname,
    title: document.title,
    entities: [...document.querySelectorAll("[data-entity]")].map(el => ({
      type: el.dataset.entity,
      id: el.dataset.id || null,
      status: el.dataset.status || null,
      fields: Object.fromEntries(
        [...el.querySelectorAll("[data-role]")].map(r => [r.dataset.role, r.innerText.trim()])
      ),
      href: el.tagName === "A" ? el.getAttribute("href") : null
    })),
    actions: [...document.querySelectorAll("[data-action]")].map(el => ({
      action: el.dataset.action,
      text: el.innerText.trim().slice(0, 50),
      selector: '[data-action="' + el.dataset.action + '"]'
    })),
    forms: [...document.querySelectorAll("[data-form]")].map(f => {
      const form = f.closest("form") || f;
      return {
        name: f.dataset.form,
        action: form.action ? new URL(form.action).pathname : null,
        fields: [...form.querySelectorAll("input,textarea,select")].map(i => {
          if (!i.name) return null;
          if (i.tagName === "SELECT") return {
            name: i.name, type: "select", value: i.value,
            options: [...i.options].map(o => ({ value: o.value, label: o.text, selected: o.selected }))
          };
          return { name: i.name, type: i.type || i.tagName.toLowerCase() };
        }).filter(Boolean)
      };
    }),
    nav: [...new Set([...document.querySelectorAll("a[href^='/']")].map(a => a.getAttribute("href")))]
  };
};`;
export default PAGE_STATE_SCRIPT;
