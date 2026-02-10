import stringWidth from "string-width";

const PROMPT_PREFIX = "❯ ";

export function cursorColumn(input: string, cursorPos: number): number {
  const beforeCursor = [...input].slice(0, cursorPos).join("");
  return stringWidth(PROMPT_PREFIX) + stringWidth(beforeCursor);
}

export function wrappedLineCount(text: string, termWidth: number): number {
  if (termWidth <= 0) return 1;
  const lines = text.split("\n");
  let total = 0;
  for (const line of lines) {
    const width = stringWidth(line);
    total += width === 0 ? 1 : Math.ceil(width / termWidth);
  }
  return total;
}
