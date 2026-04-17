export default async function auth_codexLogin(...args: any[]) {
  const { auth_codexLogin } = await import("./codex.ts");
  return auth_codexLogin(...args);
}
