import { test, expect, describe } from "bun:test";
import { UI_Button } from "./UI_Button.tsx";
import { UI_Input } from "./UI_Input.tsx";
import { UI_Textarea } from "./UI_Textarea.tsx";
import { UI_Select } from "./UI_Select.tsx";
import { UI_Alert } from "./UI_Alert.tsx";
import { UI_TopBar } from "./UI_TopBar.tsx";
import { queryExists, queryTexts, queryAttrs } from "./test_html.ts";

describe("UI_Button", () => {
  test("renders button with text", () => {
    const html = UI_Button({ children: "Click" });
    expect(html).toContain("Click");
    expect(html).toContain("<button");
  });

  test("renders as link when href given", () => {
    const html = UI_Button({ href: "/test", children: "Go" });
    expect(html).toContain("<a");
    expect(html).toContain('href="/test"');
  });

  test("renders data-action", () => {
    const html = UI_Button({ action: "save", children: "Save" });
    expect(queryExists(html, '[data-action="save"]')).toBe(true);
  });

  test("applies variant classes", () => {
    const primary = UI_Button({ variant: "primary", children: "P" });
    expect(primary).toContain("bg-gray-900");
    const danger = UI_Button({ variant: "danger", children: "D" });
    expect(danger).toContain("red");
  });
});

describe("UI_Input", () => {
  test("renders input with name", () => {
    const html = UI_Input({ name: "email" });
    expect(html).toContain('name="email"');
  });

  test("renders label when given", () => {
    const html = UI_Input({ name: "email", label: "Email" });
    expect(html).toContain("Email");
    expect(html).toContain("<label");
  });

  test("renders without label", () => {
    const html = UI_Input({ name: "q" });
    expect(html).not.toContain("<label");
  });
});

describe("UI_Textarea", () => {
  test("renders textarea with name", () => {
    const html = UI_Textarea({ name: "body" });
    expect(html).toContain("<textarea");
    expect(html).toContain('name="body"');
  });

  test("sets rows", () => {
    const html = UI_Textarea({ name: "body", rows: 6 });
    expect(html).toContain('rows="6"');
  });
});

describe("UI_Select", () => {
  test("renders select with options", () => {
    const html = UI_Select({ name: "lang", options: [
      { value: "en", label: "English" },
      { value: "ru", label: "Russian" },
    ]});
    expect(html).toContain("<select");
    expect(html).toContain("English");
    expect(html).toContain("Russian");
  });

  test("marks selected option", () => {
    const html = UI_Select({ name: "lang", value: "ru", options: [
      { value: "en", label: "English" },
      { value: "ru", label: "Russian" },
    ]});
    expect(html).toContain("selected");
  });
});

describe("UI_Alert", () => {
  test("renders error alert", () => {
    const html = UI_Alert({ message: "Oops" });
    expect(html).toContain("Oops");
    expect(html).toContain("red");
  });

  test("renders success alert", () => {
    const html = UI_Alert({ message: "Done", variant: "success" });
    expect(html).toContain("green");
  });
});

describe("UI_TopBar", () => {
  test("renders title", () => {
    const html = UI_TopBar({ title: "Issues" });
    expect(html).toContain("Issues");
    expect(html).toContain("<h1");
  });
});
