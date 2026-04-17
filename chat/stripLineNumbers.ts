export default function stripLineNumbers(text: string): string {
  return text.split("\n").map(l => {
    const m = l.match(/^\d+\t(.*)/);
    return m ? m[1]! : l;
  }).join("\n");
}
