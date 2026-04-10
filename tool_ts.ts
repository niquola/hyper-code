import type { AgentTool } from "./agent_type_Tool.ts";
import type { Ctx } from "./agent_type_Ctx.ts";
import type { Session } from "./chat_type_Session.ts";
import { Project, SyntaxKind } from "ts-morph";
import { resolve } from "node:path";

export function tool_ts(cwd: string): AgentTool {
  let cachedProject: Project | null = null;

  function getProject(): Project {
    if (!cachedProject) {
      cachedProject = new Project({
        tsConfigFilePath: resolve(cwd, "tsconfig.json"),
        skipAddingFilesFromTsConfig: false,
      });
    }
    return cachedProject;
  }
  return {
    name: "ts",
    description: "TypeScript AST tool — analyze and refactor code. Actions: symbols, type, references, rename, diagnostics, imports, exports.",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["symbols", "type", "references", "rename", "diagnostics", "imports", "exports"],
          description: "Action to perform",
        },
        path: { type: "string", description: "File path (relative to cwd)" },
        name: { type: "string", description: "Symbol name (for type, references, rename)" },
        new_name: { type: "string", description: "New name (for rename)" },
        dry_run: { type: "boolean", description: "For rename: show changes without applying. Default: true" },
      },
      required: ["action"],
    },
    execute: async (ctx: Ctx, session: Session, params: {
      action: string; path?: string; name?: string; new_name?: string; dry_run?: boolean;
    }) => {
      try {
        const project = getProject();
        const result = runAction(project, cwd, params);
        return { content: [{ type: "text", text: result }] };
      } catch (err: any) {
        return { content: [{ type: "text", text: `Error: ${err.message}` }] };
      }
    },
  };
}

function runAction(project: Project, cwd: string, params: {
  action: string; path?: string; name?: string; new_name?: string; dry_run?: boolean;
}): string {
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

function getSourceFile(project: Project, cwd: string, path: string) {
  const abs = resolve(cwd, path);
  const sf = project.getSourceFile(abs);
  if (!sf) throw new Error(`File not found in project: ${path}`);
  return sf;
}

function actionSymbols(project: Project, cwd: string, path: string): string {
  const sf = getSourceFile(project, cwd, path);
  const lines: string[] = [];

  for (const fn of sf.getFunctions()) {
    const exported = fn.isExported() ? "export " : "";
    const params = fn.getParameters().map(p => `${p.getName()}: ${p.getType().getText()}`).join(", ");
    lines.push(`${exported}function ${fn.getName()}(${params}): ${fn.getReturnType().getText()}`);
  }

  for (const tp of sf.getTypeAliases()) {
    const exported = tp.isExported() ? "export " : "";
    lines.push(`${exported}type ${tp.getName()}`);
  }

  for (const iface of sf.getInterfaces()) {
    const exported = iface.isExported() ? "export " : "";
    lines.push(`${exported}interface ${iface.getName()}`);
  }

  for (const cls of sf.getClasses()) {
    const exported = cls.isExported() ? "export " : "";
    lines.push(`${exported}class ${cls.getName()}`);
  }

  for (const v of sf.getVariableDeclarations()) {
    const stmt = v.getVariableStatement();
    const exported = stmt?.isExported() ? "export " : "";
    lines.push(`${exported}const ${v.getName()}: ${v.getType().getText()}`);
  }

  return lines.length > 0 ? lines.join("\n") : "No symbols found";
}

function actionType(project: Project, cwd: string, path: string, name: string): string {
  const sf = getSourceFile(project, cwd, path);

  // Search type aliases
  const ta = sf.getTypeAlias(name);
  if (ta) return ta.getText();

  // Search interfaces
  const iface = sf.getInterface(name);
  if (iface) return iface.getText();

  // Search functions
  const fn = sf.getFunction(name);
  if (fn) return `${fn.getName()}: ${fn.getType().getText()}`;

  // Search variables
  const v = sf.getVariableDeclaration(name);
  if (v) return `${v.getName()}: ${v.getType().getText()}`;

  return `Symbol "${name}" not found in ${path}`;
}

function actionReferences(project: Project, cwd: string, path: string, name: string): string {
  const sf = getSourceFile(project, cwd, path);
  const nodes = sf.getDescendantsOfKind(SyntaxKind.Identifier).filter(n => n.getText() === name);
  if (nodes.length === 0) return `No identifier "${name}" found in ${path}`;

  const node = nodes[0]!;
  const refs = node.findReferencesAsNodes();
  const lines = refs.map(r => {
    const file = r.getSourceFile().getFilePath().replace(resolve(cwd) + "/", "");
    const line = r.getStartLineNumber();
    return `${file}:${line}`;
  });

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
    for (const r of refs) {
      const file = r.getSourceFile().getFilePath().replace(resolve(cwd) + "/", "");
      files.set(file, (files.get(file) || 0) + 1);
    }
    const lines = [...files.entries()].map(([f, c]) => `  ${f}: ${c} occurrences`);
    return `Rename "${name}" → "${newName}" (dry run)\n${refs.length} references in ${files.size} files:\n${lines.join("\n")}`;
  }

  // Apply rename
  node.rename(newName);
  project.saveSync();
  return `Renamed "${name}" → "${newName}" in ${refs.length} locations`;
}

function actionDiagnostics(project: Project, cwd: string, path: string): string {
  const sf = getSourceFile(project, cwd, path);
  const diags = sf.getPreEmitDiagnostics();
  if (diags.length === 0) return "No diagnostics (clean)";

  const lines = diags.map(d => {
    const line = d.getLineNumber() || 0;
    const msg = d.getMessageText();
    const text = typeof msg === "string" ? msg : msg.getMessageText();
    return `L${line}: ${text}`;
  });

  return `${diags.length} diagnostics:\n${lines.join("\n")}`;
}

function actionImports(project: Project, cwd: string, path: string): string {
  const sf = getSourceFile(project, cwd, path);
  const imports = sf.getImportDeclarations();
  const lines = imports.map(i => {
    const module = i.getModuleSpecifierValue();
    const named = i.getNamedImports().map(n => n.getName()).join(", ");
    const def = i.getDefaultImport()?.getText();
    return def ? `import ${def} from "${module}"` : `import { ${named} } from "${module}"`;
  });
  return lines.length > 0 ? lines.join("\n") : "No imports";
}

function actionExports(project: Project, cwd: string, path: string): string {
  const sf = getSourceFile(project, cwd, path);
  const exported = sf.getExportedDeclarations();
  const lines: string[] = [];
  for (const [name, decls] of exported) {
    const kind = decls[0]?.getKindName() || "unknown";
    lines.push(`${name} (${kind})`);
  }
  return lines.length > 0 ? lines.join("\n") : "No exports";
}
