// Page state helper — works in CDP and in bun tests.
//
// CDP (injected via layout <script>):
//   curl -s localhost:2230/s/app -d '{"method":"Runtime.evaluate","params":{"expression":"JSON.stringify(__pageState(),null,2)"}}'
//
// Tests (HTMLRewriter-based parser):
//   import { pageState } from "./cdp_pageState.ts";
//   const state = pageState(html);

// --- types ---

export type FormField = {
  name: string;
  type: string;
  options?: { value: string; label: string; selected: boolean }[];
};

export type PageState = {
  page: string | null;
  entities: { type: string; id: string | null; status: string | null; fields: Record<string, string>; href: string | null }[];
  actions: { action: string; text: string; selector: string }[];
  forms: { name: string; fields: FormField[] }[];
  nav: string[];
};

// --- HTMLRewriter parser for bun tests ---

export function pageState(html: string): PageState {
  const result: any = { page: null, entities: [], actions: [], forms: [], nav: [] };
  const rewriter = new HTMLRewriter();

  rewriter.on("[data-page]", { element(el) { result.page = el.getAttribute("data-page"); } });

  let currentEntity: any = null;
  rewriter.on("[data-entity]", {
    element(el) {
      currentEntity = {
        type: el.getAttribute("data-entity"),
        id: el.getAttribute("data-id"),
        status: el.getAttribute("data-status"),
        fields: {},
        href: el.tagName === "a" ? el.getAttribute("href") : null,
      };
      result.entities.push(currentEntity);
    }
  });
  rewriter.on("[data-entity] [data-role]", {
    element(el) { if (currentEntity) currentEntity._currentRole = el.getAttribute("data-role"); },
    text(t) { if (currentEntity?._currentRole) { currentEntity.fields[currentEntity._currentRole] = (currentEntity.fields[currentEntity._currentRole] || "") + t.text; } },
  });

  rewriter.on("[data-action]", {
    element(el) {
      const action = el.getAttribute("data-action")!;
      result.actions.push({ action, text: "", selector: `[data-action="${action}"]` });
      result._currentAction = result.actions.length - 1;
    },
    text(t) { if (result._currentAction !== undefined) result.actions[result._currentAction].text += t.text; },
  });

  let currentSelect: any = null;
  rewriter.on("[data-form]", {
    element(el) {
      result.forms.push({ name: el.getAttribute("data-form"), fields: [] });
      result._currentForm = result.forms.length - 1;
    }
  });
  rewriter.on("[data-form] input[name], [data-form] textarea[name]", {
    element(el) {
      const name = el.getAttribute("name");
      const type = el.getAttribute("type") || el.tagName === "textarea" ? "textarea" : "text";
      if (name && result._currentForm !== undefined) result.forms[result._currentForm].fields.push({ name, type });
    }
  });
  rewriter.on("[data-form] select[name]", {
    element(el) {
      const name = el.getAttribute("name");
      if (name && result._currentForm !== undefined) {
        currentSelect = { name, type: "select", options: [] };
        result.forms[result._currentForm].fields.push(currentSelect);
      }
    }
  });
  rewriter.on("[data-form] select option", {
    element(el) {
      if (currentSelect) {
        currentSelect._currentOption = { value: el.getAttribute("value") || "", label: "", selected: el.hasAttribute("selected") };
        currentSelect.options.push(currentSelect._currentOption);
      }
    },
    text(t) { if (currentSelect?._currentOption) currentSelect._currentOption.label += t.text; },
  });

  rewriter.on("a[href^='/']", {
    element(el) {
      const href = el.getAttribute("href");
      if (href && !result.nav.includes(href)) result.nav.push(href);
    }
  });

  rewriter.transform(new Response(html));

  for (const e of result.entities) delete e._currentRole;
  for (const f of result.forms) for (const field of f.fields) if (field.options) for (const o of field.options) delete o._currentOption;
  delete result._currentAction;
  delete result._currentForm;

  return result;
}
