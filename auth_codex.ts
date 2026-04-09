// OpenAI Codex OAuth flow (ChatGPT Plus/Pro subscription)
// Ported from pi-mono. PKCE + local callback server.

import { randomBytes } from "node:crypto";

const CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const AUTHORIZE_URL = "https://auth.openai.com/oauth/authorize";
const TOKEN_URL = "https://auth.openai.com/oauth/token";
const REDIRECT_URI = "http://localhost:1455/auth/callback";
const SCOPE = "openid profile email offline_access";
const JWT_CLAIM_PATH = "https://api.openai.com/auth";

export type CodexCredentials = {
  access: string;
  refresh: string;
  expires: number;
  accountId: string;
};

// --- PKCE ---

function base64urlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
  const verifierBytes = new Uint8Array(32);
  crypto.getRandomValues(verifierBytes);
  const verifier = base64urlEncode(verifierBytes);
  const data = new TextEncoder().encode(verifier);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return { verifier, challenge: base64urlEncode(new Uint8Array(hashBuffer)) };
}

// --- JWT ---

function decodeJwt(token: string): any {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1]!));
  } catch { return null; }
}

function getAccountId(accessToken: string): string | null {
  const payload = decodeJwt(accessToken);
  const accountId = payload?.[JWT_CLAIM_PATH]?.chatgpt_account_id;
  return typeof accountId === "string" && accountId.length > 0 ? accountId : null;
}

// --- Token exchange ---

async function exchangeCode(code: string, verifier: string): Promise<CodexCredentials> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      code,
      code_verifier: verifier,
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);

  const json = await res.json() as any;
  if (!json.access_token || !json.refresh_token) throw new Error("Missing tokens in response");

  const accountId = getAccountId(json.access_token);
  if (!accountId) throw new Error("Failed to extract accountId from token");

  return {
    access: json.access_token,
    refresh: json.refresh_token,
    expires: Date.now() + json.expires_in * 1000,
    accountId,
  };
}

export async function auth_codexRefresh(refreshToken: string): Promise<CodexCredentials> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
    }),
  });

  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);

  const json = await res.json() as any;
  if (!json.access_token || !json.refresh_token) throw new Error("Missing tokens");

  const accountId = getAccountId(json.access_token);
  if (!accountId) throw new Error("Failed to extract accountId");

  return {
    access: json.access_token,
    refresh: json.refresh_token,
    expires: Date.now() + json.expires_in * 1000,
    accountId,
  };
}

// --- OAuth flow ---

export async function auth_codexLogin(returnPort?: number): Promise<{ authUrl: string; waitForCredentials: () => Promise<CodexCredentials> }> {
  const { verifier, challenge } = await generatePKCE();
  const state = randomBytes(16).toString("hex");

  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("scope", SCOPE);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", state);
  url.searchParams.set("codex_cli_simplified_flow", "true");
  url.searchParams.set("originator", "hyper-code");

  // Start local callback server
  const { promise, resolve, reject } = Promise.withResolvers<CodexCredentials>();

  const server = Bun.serve({
    port: 1455,
    hostname: "127.0.0.1",
    async fetch(req) {
      const u = new URL(req.url);
      if (u.pathname !== "/auth/callback") return new Response("Not found", { status: 404 });
      if (u.searchParams.get("state") !== state) return new Response("State mismatch", { status: 400 });

      const code = u.searchParams.get("code");
      if (!code) return new Response("Missing code", { status: 400 });

      try {
        const creds = await exchangeCode(code, verifier);
        resolve(creds);
        const returnUrl = returnPort ? `http://localhost:${returnPort}/settings` : "";
        const redirectScript = returnUrl ? `<script>setTimeout(()=>location.href='${returnUrl}',1000)</script>` : "";
        return new Response(
          `<html><body><h2>✓ Authenticated!</h2><p>Redirecting back...</p>${redirectScript}</body></html>`,
          { headers: { "Content-Type": "text/html" } },
        );
      } catch (err: any) {
        reject(err);
        return new Response(`<html><body><h2>Error: ${Bun.escapeHTML(err.message)}</h2></body></html>`, {
          headers: { "Content-Type": "text/html" },
        });
      }
    },
  });

  return {
    authUrl: url.toString(),
    waitForCredentials: async () => {
      try {
        return await promise;
      } finally {
        server.stop();
      }
    },
  };
}
