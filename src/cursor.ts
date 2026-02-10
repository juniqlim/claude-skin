import stringWidth from "string-width";

const PROMPT_PREFIX = "❯ ";

export function cursorColumn(input: string, cursorPos: number): number {
  const beforeCursor = [...input].slice(0, cursorPos).join("");
  return stringWidth(PROMPT_PREFIX) + stringWidth(beforeCursor);
}
