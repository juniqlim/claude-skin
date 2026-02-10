import { describe, test, expect } from "bun:test";
import { parseNDJSON, type ParsedEvent } from "../claude-process.ts";

describe("parseNDJSON", () => {
  test("parses system/init message", () => {
    const line = JSON.stringify({
      type: "system",
      subtype: "init",
      session_id: "abc-123",
      tools: ["Bash", "Read"],
      model: "claude-opus-4-6",
    });

    const events: ParsedEvent[] = [];
    parseNDJSON(line, (e) => events.push(e));

    expect(events).toHaveLength(1);
    expect(events[0]!.type).toBe("init");
    if (events[0]!.type === "init") {
      expect(events[0]!.sessionId).toBe("abc-123");
    }
  });

  test("parses assistant message with text content", () => {
    const line = JSON.stringify({
      type: "assistant",
      message: {
        id: "msg_001",
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: "Hello!" }],
        model: "claude-opus-4-6",
        stop_reason: null,
      },
      session_id: "abc-123",
    });

    const events: ParsedEvent[] = [];
    parseNDJSON(line, (e) => events.push(e));

    expect(events).toHaveLength(1);
    expect(events[0]!.type).toBe("assistant");
    if (events[0]!.type === "assistant") {
      expect(events[0]!.text).toBe("Hello!");
    }
  });

  test("parses result message", () => {
    const line = JSON.stringify({
      type: "result",
      subtype: "success",
      is_error: false,
      duration_ms: 2500,
      duration_api_ms: 2400,
      num_turns: 1,
      result: "Done!",
      session_id: "abc-123",
      total_cost_usd: 0.04,
    });

    const events: ParsedEvent[] = [];
    parseNDJSON(line, (e) => events.push(e));

    expect(events).toHaveLength(1);
    expect(events[0]!.type).toBe("result");
    if (events[0]!.type === "result") {
      expect(events[0]!.text).toBe("Done!");
      expect(events[0]!.costUsd).toBe(0.04);
      expect(events[0]!.isError).toBe(false);
    }
  });

  test("parses assistant message with tool_use block", () => {
    const line = JSON.stringify({
      type: "assistant",
      message: {
        id: "msg_002",
        type: "message",
        role: "assistant",
        content: [
          { type: "text", text: "Let me read that file." },
          {
            type: "tool_use",
            id: "tool_001",
            name: "Read",
            input: { file_path: "/tmp/test.ts" },
          },
        ],
        model: "claude-opus-4-6",
        stop_reason: null,
      },
      session_id: "abc-123",
    });

    const events: ParsedEvent[] = [];
    parseNDJSON(line, (e) => events.push(e));

    expect(events).toHaveLength(2);
    expect(events[0]!.type).toBe("assistant");
    expect(events[1]!.type).toBe("tool_use");
    if (events[1]!.type === "tool_use") {
      expect(events[1]!.toolName).toBe("Read");
      expect(events[1]!.toolUseId).toBe("tool_001");
    }
  });

  test("ignores invalid JSON lines", () => {
    const events: ParsedEvent[] = [];
    parseNDJSON("not valid json", (e) => events.push(e));
    expect(events).toHaveLength(0);
  });

  test("ignores empty lines", () => {
    const events: ParsedEvent[] = [];
    parseNDJSON("", (e) => events.push(e));
    parseNDJSON("  ", (e) => events.push(e));
    expect(events).toHaveLength(0);
  });
});
