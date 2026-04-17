import { Project, SyntaxKind } from "ts-morph";
import { resolve } from "node:path";

export const name = "ts";
export const description = "TypeScript AST tool — analyze and refactor code. Actions: symbols, type, references, rename, diagnostics, imports, exports.";
export const parameters = {
  type: "object",
  properties: {
    action: { type: "string", enum: ["symbols", "type", "references", "rename", "diagnostics", "imports", "exports"] },
    path: { type: "string", description: "File path (relative to cwd)" },
    name: { type: "string", description: "Symbol name (for type, references, rename)" },
    new_name: { type: "string", description: "New name (for rename)" },
    dry_run: { type: "boolean", description: "For rename: show changes without applying. Default: true" },
  },
  required: ["action"],
};

// Lazy project cache — per cwd
let _cachedCwd: string | null = null;
let _cachedProject: Project | null = null;

function getProject(cwd: string): Project {
  if (_cachedProject && _cachedCwd === cwd) return _cachedProject;
  _cachedProject = new Project({ tsConfigFilePath: resolve(cwd, "tsconfig.json"), skipAddingFilesFromTsConfig: false });
  _cachedCwd = cwd;
  return _cachedProject;
}

export default async function ts(ctx: Ctx, session: any, params: { action: string; path?: string; name?: string; new_name?: string; dry_run?: boolean }) {
  try {
    const project = getProject(ctx.cwd);
    const result = runAction(project, ctx.cwd, params);
    return { content: [{ type: "text" as const, text: result }] };
  } catch (err: any) {
    return { content: [{ type: "text" as const, text: `Error: ${err.message}` }] };
  }
}

function getSourceFile(project: Project, cwd: string, path: string) {
  const abs = resolve(cwd, path);
  const sf = project.getSourceFile(abs);
  if (!sf) throw new Error(`File not found in project: ${path}`);
  return sf;
}

function runAction(project: Project, cwd: string, params: { action: string; path?: string; name?: string; new_name?: string; dry_run?: boolean }): string {
  switch (params.action) {
    case "symbols": return actionSymbols(project, cwd, params.path!);
    case "type": return actionType(project, cwd, params.path!, params.name!);
    case "references": return actionReferences(project, cwd, params.path!, params.name!);
    case "rename": return actionRename(project, cwd, params.path!, params.name!, params.new_name!, params.dry_run !== false);
    case "diagnostics": return actionDiagnostics(project, cwd, params.path!);
    case "imports": return actionImports(project, cwd, params.path!);
    case "exports": return actionExports(project, cwd, params.path!);
    default: return `Unknown action: ${params.action}`;
  }
}

function actionSymbols(project: Project, cwd: string, path: string): string {
  const sf = getSourceFile(project, cwd, path);
  const lines: string[] = [];
  for (const fn of sf.getFunctions()) { const e = fn.isExported() ? "export " : ""; lines.push(`${e}function ${fn.getName()}(${fn.getParameters().map(p => `${p.getName()}: ${p.getType().getText()}`).join(", ")}): ${fn.getReturnType().getText()}`); }
  for (const tp of sf.getTypeAliases()) { lines.push(`${tp.isExported() ? "export " : ""}type ${tp.getName()}`); }
  for (const iface of sf.getInterfaces()) { lines.push(`${iface.isExported() ? "export " : ""}interface ${iface.getName()}`); }
  for (const v of sf.getVariableDeclarations()) { const e = v.getVariableStatement()?.isExported() ? "export " : ""; lines.push(`${e}const ${v.getName()}: ${v.getType().getText()}`); }
  return lines.length > 0 ? lines.join("\n") : "No symbols found";
}

function actionType(project: Project, cwd: string, path: string, name: string): string {
  const sf = getSourceFile(project, cwd, path);
  const ta = sf.getTypeAlias(name); if (ta) return ta.getText();
  const iface = sf.getInterface(name); if (iface) return iface.getText();
  const fn = sf.getFunction(name); if (fn) return `${fn.getName()}: ${fn.getType().getText()}`;
  const v = sf.getVariableDeclaration(name); if (v) return `${v.getName()}: ${v.getType().getText()}`;
  return `Symbol "${name}" not found in ${path}`;
}

function actionReferences(project: Project, cwd: string, path: string, name: string): string {
  const sf = getSourceFile(project, cwd, path);
  const nodes = sf.getDescendantsOfKind(SyntaxKind.Identifier).filter(n => n.getText() === name);
  if (nodes.length === 0) return `No identifier "${name}" found in ${path}`;
  const refs = nodes[0]!.findReferencesAsNodes();
  const lines = refs.map(r => `${r.getSourceFile().getFilePath().replace(resolve(cwd) + "/", "")}:${r.getStartLineNumber()}`);
  return `${refs.length} references:\n${lines.join("\n")}`;
}

function actionRename(project: Project, cwd: string, path: string, name: string, newName: string, dryRun: boolean): string {
  const sf = getSourceFile(project, cwd, path);
  const nodes = sf.getDescendantsOfKind(SyntaxKind.Identifier).filter(n => n.getText() === name);
  if (nodes.length === 0) return `No identifier "${name}" found in ${path}`;
  const node = nodes[0]!;
  const refs = node.findReferencesAsNodes();
  if (dryRun) {
    const files = new Map<string, number>();
    for (const r of refs) { const f = r.getSourceFile().getFilePath().replace(resolve(cwd) + "/", ""); files.set(f, (files.get(f) || 0) + 1); }
    return `Rename "${name}" → "${newName}" (dry run)\n${refs.length} references in ${files.size} files:\n${[...files.entries()].map(([f, c]) => `  ${f}: ${c}`).join("\n")}`;
  }
  node.rename(newName);
  project.saveSync();
  return `Renamed "${name}" → "${newName}" in ${refs.length} locations`;
}

function actionDiagnostics(project: Project, cwd: string, path: string): string {
  const sf = getSourceFile(project, cwd, path);
  const diags = sf.getPreEmitDiagnostics();
  if (diags.length === 0) return "No diagnostics (clean)";
  const lines = diags.map(d => { const msg = d.getMessageText(); return `L${d.getLineNumber() || 0}: ${typeof msg === "string" ? msg : msg.getMessageText()}`; });
  return `${diags.length} diagnostics:\n${lines.join("\n")}`;
}

function actionImports(project: Project, cwd: string, path: string): string {
  const sf = getSourceFile(project, cwd, path);
  const lines = sf.getImportDeclarations().map(i => { const m = i.getModuleSpecifierValue(); const def = i.getDefaultImport()?.getText(); const named = i.getNamedImports().map(n => n.getName()).join(", "); return def ? `import ${def} from "${m}"` : `import { ${named} } from "${m}"`; });
  return lines.length > 0 ? lines.join("\n") : "No imports";
}

function actionExports(project: Project, cwd: string, path: string): string {
  const sf = getSourceFile(project, cwd, path);
  const lines: string[] = [];
  for (const [name, decls] of sf.getExportedDeclarations()) lines.push(`${name} (${decls[0]?.getKindName() || "unknown"})`);
  return lines.length > 0 ? lines.join("\n") : "No exports";
}
