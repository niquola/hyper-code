// Lint script — checks project conventions from CLAUDE.md
// Run: bun lint.ts

import { readdirSync, readFileSync } from "node:fs";

type Violation = { file: string; line: number; rule: string; text: string };

const SKIP_DIRS = new Set(["node_modules", "docs", "pi-mono", ".hyper", ".git", "ai_models"]);
const SKIP_FILES = new Set(["lint.ts", "jsx.ts", "jsx-runtime.ts", "jsx-dev-runtime.ts", "chat_script.ts", "cdp_server.ts"]);

function getSourceFiles(): string[] {
  const files: string[] = [];
  function walk(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      if (SKIP_DIRS.has(entry.name)) continue;
      if (entry.isDirectory()) { walk(`${dir}/${entry.name}`); continue; }
      if (!/\.(ts|tsx)$/.test(entry.name)) continue;
      if (entry.name.endsWith(".test.ts") || entry.name.endsWith(".test.tsx")) continue;
      if (SKIP_FILES.has(entry.name)) continue;
      files.push(`${dir}/${entry.name}`);
    }
  }
  walk(".");
  return files;
}

function checkFile(file: string): Violation[] {
  const violations: Violation[] = [];
  const content = readFileSync(file, "utf-8");
  const lines = content.split("\n");
  const shortFile = file.replace("./", "");

  function v(line: number, rule: string, text: string) {
    violations.push({ file: shortFile, line, rule, text: text.trim() });
  }

  for (let i = 0; i < lines.length; i++) {
    const ln = i + 1;
    const line = lines[i]!;
    const trimmed = line.trim();

    // Skip comments
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) continue;

    // 1. No classes
    if (/\bclass\s+[A-Z]/.test(line) && !line.includes("className") && !line.includes("classList")) {
      v(ln, "no-class", line);
    }

    // 2. No `this` (except in string literals and callbacks to external libs)
    if (/\bthis\b/.test(line) && !line.includes('"') && !line.includes("'") && !line.includes("`") && !line.includes("onclick")) {
      v(ln, "no-this", line);
    }

    // 3. No process.env inside functions (allowed at top-level, in test_preload, ai_getEnvApiKey)
    if (/process\.env\b/.test(line)) {
      const allowedFiles = ["test_preload.ts", "ai_getEnvApiKey.ts", "chat_apiKeys.ts", "chat_ctx.ts", "chat_db.ts", "agent_createCtx.ts"];
      if (!allowedFiles.some(f => shortFile.endsWith(f))) {
        // Check if inside a function (indented), skip spread (...process.env) which passes env, not reads it
        if (line.match(/^\s{2,}/) && !line.includes("// startup") && !line.includes("...process.env")) {
          v(ln, "no-process-env", line);
        }
      }
    }

    // 4. No process.cwd() inside functions
    if (/process\.cwd\(\)/.test(line)) {
      if (!shortFile.endsWith("chat_ctx.ts") && line.match(/^\s{2,}/)) {
        v(ln, "no-process-cwd", line);
      }
    }

    // 5. Module-level let (singletons) — only check top-level (no indentation)
    if (/^let\s+\w/.test(line) || /^var\s+\w/.test(line)) {
      // Allow in chat_ctx.ts (session cache) and specific files
      const allowedMutableState = ["chat_ctx.ts", "ai_renderMarkdown.ts"];
      if (!allowedMutableState.some(f => shortFile.endsWith(f))) {
        v(ln, "no-module-let", line);
      }
    }
  }

  // 6. Tool execute signature check
  if (shortFile.startsWith("tool_") && !shortFile.includes(".test.")) {
    const execMatch = content.match(/execute:\s*async\s*\(([^)]*)\)/);
    if (execMatch) {
      const params = execMatch[1]!;
      if (!params.includes("Ctx") && !params.includes("ctx")) {
        const lineNum = content.slice(0, execMatch.index).split("\n").length;
        v(lineNum, "tool-sig", `execute missing (ctx, session, ...) — got: (${params.slice(0, 60)})`);
      }
    }
  }

  // 7. Route handler signature check (page_*, form_*, frag_*)
  if (/^(page|form|frag)_/.test(shortFile) && !shortFile.includes(".test.")) {
    const exportMatch = content.match(/export\s+default\s+async\s+function\s*\(([^)]*)\)/);
    if (exportMatch) {
      const params = exportMatch[1]!;
      if (!params.includes("Ctx") && !params.includes("ctx")) {
        const lineNum = content.slice(0, exportMatch.index).split("\n").length;
        v(lineNum, "route-sig", `handler missing (ctx, ...) — got: (${params.slice(0, 60)})`);
      }
    }
  }

  return violations;
}

// --- Main ---

const files = getSourceFiles();
let total = 0;
const byRule: Record<string, number> = {};

for (const file of files) {
  const violations = checkFile(file);
  for (const v of violations) {
    console.log(`  ${v.file}:${v.line}  ${v.rule}  ${v.text.slice(0, 80)}`);
    total++;
    byRule[v.rule] = (byRule[v.rule] || 0) + 1;
  }
}

if (total === 0) {
  console.log("✓ All checks passed");
} else {
  console.log(`\n${total} violation(s):`);
  for (const [rule, count] of Object.entries(byRule).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${rule}: ${count}`);
  }
  process.exit(1);
}
