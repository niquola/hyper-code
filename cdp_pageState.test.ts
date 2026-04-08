import { test, expect, describe } from "bun:test";
import { pageState } from "./cdp_pageState.ts";

describe("pageState", () => {
  test("extracts page identity", () => {
    const html = '<div data-page="chat">content</div>';
    expect(pageState(html).page).toBe("chat");
  });

  test("returns null for missing page", () => {
    expect(pageState("<div>no page</div>").page).toBeNull();
  });

  test("extracts entities with fields", () => {
    const html = `
      <div data-entity="message" data-status="user">
        <span data-role="label">You</span>
        <span data-role="content">Hello</span>
      </div>
    `;
    const state = pageState(html);
    expect(state.entities).toHaveLength(1);
    expect(state.entities[0]!.type).toBe("message");
    expect(state.entities[0]!.status).toBe("user");
    expect(state.entities[0]!.fields.label).toBe("You");
    expect(state.entities[0]!.fields.content).toBe("Hello");
  });

  test("extracts multiple entities", () => {
    const html = `
      <div data-entity="message" data-status="user"><span data-role="content">hi</span></div>
      <div data-entity="message" data-status="assistant"><span data-role="content">hello</span></div>
    `;
    const state = pageState(html);
    expect(state.entities).toHaveLength(2);
    expect(state.entities[0]!.status).toBe("user");
    expect(state.entities[1]!.status).toBe("assistant");
  });

  test("extracts actions", () => {
    const html = '<button data-action="send">Send</button><button data-action="cancel">Cancel</button>';
    const state = pageState(html);
    expect(state.actions).toHaveLength(2);
    expect(state.actions[0]!.action).toBe("send");
    expect(state.actions[1]!.action).toBe("cancel");
  });

  test("extracts forms with fields", () => {
    const html = `
      <form data-form="prompt">
        <textarea name="body"></textarea>
        <input name="title" type="text" />
      </form>
    `;
    const state = pageState(html);
    expect(state.forms).toHaveLength(1);
    expect(state.forms[0]!.name).toBe("prompt");
    expect(state.forms[0]!.fields).toHaveLength(2);
  });

  test("extracts nav links", () => {
    const html = '<a href="/chat">Chat</a><a href="/settings">Settings</a><a href="https://example.com">External</a>';
    const state = pageState(html);
    expect(state.nav).toContain("/chat");
    expect(state.nav).toContain("/settings");
    expect(state.nav).not.toContain("https://example.com");
  });

  test("extracts entity id", () => {
    const html = '<div data-entity="message" data-id="msg-123">x</div>';
    const state = pageState(html);
    expect(state.entities[0]!.id).toBe("msg-123");
  });
});
