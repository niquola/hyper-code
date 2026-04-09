import type { TruncateResult } from "./tool_type_TruncateResult.ts";
export type { TruncateResult } from "./tool_type_TruncateResult.ts";

export function tool_truncateOutput(
  text: string,
  maxLines: number = 2000,
  maxBytes: number = 50_000,
  mode: "head" | "tail" = "head",
): TruncateResult {
  if (text.length <= maxBytes) {
    const lines = text.split("\n");
    if (lines.length <= maxLines) {
      return { text, truncated: false };
    }
  }

  // Truncate by bytes first
  let truncated = false;
  let result = text;

  if (result.length > maxBytes) {
    truncated = true;
    result = mode === "tail"
      ? result.slice(-maxBytes)
      : result.slice(0, maxBytes);
  }

  // Truncate by lines
  const lines = result.split("\n");
  if (lines.length > maxLines) {
    truncated = true;
    result = mode === "tail"
      ? lines.slice(-maxLines).join("\n")
      : lines.slice(0, maxLines).join("\n");
  }

  if (truncated) {
    const totalLines = text.split("\n").length;
    const shownLines = result.split("\n").length;
    result += `\n\n[Truncated: showing ${shownLines} of ${totalLines} lines, ${mode === "tail" ? "last" : "first"} ${result.length} bytes]`;
  }

  return { text: result, truncated };
}
