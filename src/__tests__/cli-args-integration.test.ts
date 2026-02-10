import { describe, test, expect } from "bun:test";
import { parseCliArgs, buildClaudeArgs } from "../cli-args.ts";

describe("CLI args integration - alias simulation", () => {
  test("simulates ccs alias with effort and append-system-prompt", () => {
    // alias: ccs="bun ... --effort low --append-system-prompt '무조건 PC통신체...'"
    // process.argv.slice(2) would be:
    const argv = [
      "--effort", "low",
      "--append-system-prompt", "무조건 PC통신체(반말, ~임, ~함, ~됨, ㅇㅇ, ㄴㄴ 등)로만 답변할 것. 존댓말 절대 금지.",
    ];

    const opts = parseCliArgs(argv);
    expect(opts.effort).toBe("low");
    expect(opts.appendSystemPrompt).toBe("무조건 PC통신체(반말, ~임, ~함, ~됨, ㅇㅇ, ㄴㄴ 등)로만 답변할 것. 존댓말 절대 금지.");

    const claudeArgs = buildClaudeArgs(opts);
    expect(claudeArgs).toContain("--append-system-prompt");
    const idx = claudeArgs.indexOf("--append-system-prompt");
    expect(claudeArgs[idx + 1]).toBe("무조건 PC통신체(반말, ~임, ~함, ~됨, ㅇㅇ, ㄴㄴ 등)로만 답변할 것. 존댓말 절대 금지.");
    expect(claudeArgs).toContain("--effort");
    expect(claudeArgs[claudeArgs.indexOf("--effort") + 1]).toBe("low");
  });
});
