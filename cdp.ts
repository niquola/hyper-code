// CDP client helper. Usage:
//   import { cdp } from "./cdp.ts";
//   await cdp.navigate("/issues");
//   const state = await cdp.pageState();
//   await cdp.click("[data-action=close]");
//   await cdp.fill("[data-form=add-comment] textarea[name=body]", "My comment");
//   await cdp.submit("[data-form=add-comment]");
//   await cdp.select("[data-form=assign] select[name=assignee_id]", userId);
//   const png = await cdp.screenshot();

const CDP_URL = process.env.CDP_URL || "http://localhost:2230";
const SESSION = process.env.CDP_SESSION || "app";

async function send(method: string, params: Record<string, unknown> = {}) {
  const res = await fetch(`${CDP_URL}/s/${SESSION}`, {
    method: "POST",
    body: JSON.stringify({ method, params }),
  });
  return res.json();
}

async function evaluate(expression: string) {
  const data: any = await send("Runtime.evaluate", { expression });
  if (data.error) throw new Error(data.error);
  return data.result?.value;
}

export const cdp = {
  async evaluate(expression: string) { return await evaluate(expression); },

  async navigate(path: string) {
    const url = path.startsWith("http") ? path : `http://localhost:3000${path}`;
    await send("Page.navigate", { url });
    await Bun.sleep(500);
  },

  async pageState() {
    const json = await evaluate("JSON.stringify(__pageState())");
    return JSON.parse(json);
  },

  async click(selector: string) {
    await evaluate(`document.querySelector('${selector}').click()`);
    await Bun.sleep(500);
  },

  async fill(selector: string, value: string) {
    const escaped = value.replace(/'/g, "\\'").replace(/\n/g, "\\n");
    await evaluate(`document.querySelector('${selector}').value='${escaped}'`);
  },

  /** Fill + trigger htmx events (for live search inputs with hx-get) */
  async type(selector: string, value: string) {
    const escaped = value.replace(/'/g, "\\'").replace(/\n/g, "\\n");
    await evaluate(`const el=document.querySelector('${selector}'); el.value='${escaped}'; el.dispatchEvent(new Event('input',{bubbles:true})); if(typeof htmx!=='undefined') htmx.trigger(el,'input')`);
  },

  async submit(formSelector: string) {
    await evaluate(`document.querySelector('${formSelector}').closest('form').submit()`);
    await Bun.sleep(500);
  },

  async select(selector: string, value: string) {
    await evaluate(`const s=document.querySelector('${selector}'); s.value='${value}'; s.form.submit()`);
    await Bun.sleep(500);
  },

  async screenshot(path = "/tmp/screenshot.png") {
    const { data } = await send("Page.captureScreenshot", { format: "png" }) as any;
    await Bun.write(path, Buffer.from(data, "base64"));
    return path;
  },

  async text(selector: string): Promise<string> {
    return await evaluate(`document.querySelector('${selector}')?.innerText?.trim() || ''`);
  },
};
