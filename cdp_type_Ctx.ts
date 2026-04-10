export type CdpSession = { ws: WebSocket; targetId: string };

export type CdpCtx = {
  cdpPort: number;
  chromePort: number;
  profileDir: string;
  sessions: Map<string, CdpSession>;
  nextId: number;
};
