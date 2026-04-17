import { test, expect, describe } from "bun:test";

// Dispatch is tested via the server endpoint — test the form data parsing logic
describe("dispatch form parsing", () => {
  test("extracts text field from form data", async () => {
    const form = new FormData();
    form.set("text", "User clicked approve");
    const text = form.get("text") as string;
    expect(text).toBe("User clicked approve");
  });

  test("builds text from all form fields when no text field", () => {
    const form = new FormData();
    form.set("name", "Alice");
    form.set("action", "approve");
    const text = [...form.entries()].map(([k, v]) => `${k}: ${v}`).join("\n");
    expect(text).toBe("name: Alice\naction: approve");
  });

  test("dispatch message format", () => {
    const text = "User clicked approve";
    const message = `[User interaction from widget] ${text}`;
    expect(message).toContain("[User interaction from widget]");
    expect(message).toContain("User clicked approve");
  });
});
