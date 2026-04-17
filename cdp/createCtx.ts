import type { CdpCtx } from "./type_Ctx.ts";

export function cdp_createCtx(opts: { cdpPort: number; chromePort: number; profileDir: string }): CdpCtx {
  return {
    cdpPort: opts.cdpPort,
    chromePort: opts.chromePort,
    profileDir: opts.profileDir,
    sessions: new Map(),
    nextId: 1,
  };
}
