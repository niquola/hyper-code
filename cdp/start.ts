import { existsSync, mkdirSync } from "node:fs";
import type { CdpCtx } from "./type_Ctx.ts";

function findChrome(): string {
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "google-chrome",
    "chromium",
  ];
  for (const c of candidates) {
    try {
      if (c.startsWith("/") && Bun.file(c).size > 0) return c;
    } catch {}
  }
  return candidates[0]!;
}

async function waitForChrome(chromePort: number, maxWait = 10_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    try {
      const res = await fetch(`http://127.0.0.1:${chromePort}/json/version`);
      if (res.ok) return;
    } catch {}
    await Bun.sleep(200);
  }
  throw new Error("Chrome did not start");
}

export async function cdp_start(ctx: CdpCtx): Promise<{ chrome: Bun.Subprocess }> {
  if (!existsSync(ctx.profileDir)) mkdirSync(ctx.profileDir, { recursive: true });

  const chrome = Bun.spawn([
    findChrome(),
    `--remote-debugging-port=${ctx.chromePort}`,
    `--user-data-dir=${ctx.profileDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-features=Translate",
    "about:blank",
  ], { stdout: "ignore", stderr: "ignore" });

  await waitForChrome(ctx.chromePort);
  return { chrome };
}
