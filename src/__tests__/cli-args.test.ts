import { describe, test, expect } from "bun:test";
import { parseCliArgs, buildClaudeArgs } from "../cli-args.ts";

describe("parseCliArgs", () => {
  test("parses --effort option", () => {
    const opts = parseCliArgs(["--effort", "high"]);
    expect(opts.effort).toBe("high");
  });

  test("parses --model option", () => {
    const opts = parseCliArgs(["--model", "claude-sonnet-4-5-20250929"]);
    expect(opts.model).toBe("claude-sonnet-4-5-20250929");
  });

  test("parses --append-system-prompt option", () => {
    const opts = parseCliArgs(["--append-system-prompt", "반말로 대답해"]);
    expect(opts.appendSystemPrompt).toBe("반말로 대답해");
  });

  test("parses --system-prompt option", () => {
    const opts = parseCliArgs(["--system-prompt", "커스텀 프롬프트"]);
    expect(opts.systemPrompt).toBe("커스텀 프롬프트");
  });

  test("returns defaults when no args", () => {
    const opts = parseCliArgs([]);
    expect(opts.effort).toBeUndefined();
    expect(opts.model).toBeUndefined();
    expect(opts.appendSystemPrompt).toBeUndefined();
    expect(opts.systemPrompt).toBeUndefined();
  });

  test("parses multiple options", () => {
    const opts = parseCliArgs(["--effort", "medium", "--model", "claude-opus-4-6"]);
    expect(opts.effort).toBe("medium");
    expect(opts.model).toBe("claude-opus-4-6");
  });
});

describe("buildClaudeArgs", () => {
  test("builds default args without effort", () => {
    const args = buildClaudeArgs({});
    expect(args).not.toContain("--effort");
  });

  test("includes model when specified", () => {
    const args = buildClaudeArgs({ model: "claude-sonnet-4-5-20250929" });
    expect(args).toContain("--model");
    expect(args[args.indexOf("--model") + 1]).toBe("claude-sonnet-4-5-20250929");
  });

  test("includes append-system-prompt when specified", () => {
    const args = buildClaudeArgs({ appendSystemPrompt: "반말로" });
    expect(args).toContain("--append-system-prompt");
    expect(args[args.indexOf("--append-system-prompt") + 1]).toBe("반말로");
  });

  test("always includes base flags", () => {
    const args = buildClaudeArgs({});
    expect(args).toContain("--print");
    expect(args).toContain("--output-format");
    expect(args).toContain("--input-format");
    expect(args).not.toContain("--dangerously-skip-permissions");
  });

  test("includes --dangerously-skip-permissions when specified", () => {
    const args = buildClaudeArgs({ dangerouslySkipPermissions: true });
    expect(args).toContain("--dangerously-skip-permissions");
  });

  test("does not include --dangerously-skip-permissions by default", () => {
    const args = buildClaudeArgs({});
    expect(args).not.toContain("--dangerously-skip-permissions");
  });
});
