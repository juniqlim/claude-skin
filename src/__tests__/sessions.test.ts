import { test, expect } from "bun:test";
import { parseSessionSummary, cwdToProjectDir, type SessionSummary } from "../sessions.ts";

test("JSONL에서 세션 요약 추출", () => {
  const lines = [
    '{"type":"queue-operation","timestamp":"2026-02-10T14:58:09.061Z","sessionId":"abc-123"}',
    '{"type":"user","message":{"role":"user","content":"내 이름은 준익이야"},"sessionId":"abc-123","timestamp":"2026-02-10T14:58:09.066Z"}',
    '{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"기억하겠습니다."}]},"sessionId":"abc-123","timestamp":"2026-02-10T14:58:12.019Z"}',
  ];

  const result = parseSessionSummary("abc-123", lines);
  expect(result).toEqual({
    sessionId: "abc-123",
    firstMessage: "내 이름은 준익이야",
    timestamp: "2026-02-10T14:58:09.066Z",
  });
});

test("content가 배열이면 text를 합침", () => {
  const lines = [
    '{"type":"user","message":{"role":"user","content":[{"type":"text","text":"안녕"}]},"sessionId":"abc-123","timestamp":"2026-02-10T15:00:00.000Z"}',
  ];
  const result = parseSessionSummary("abc-123", lines);
  expect(result!.firstMessage).toBe("안녕");
});

test("user 메시지가 없으면 null", () => {
  const lines = [
    '{"type":"queue-operation","timestamp":"2026-02-10T14:58:09.061Z","sessionId":"abc-123"}',
  ];

  const result = parseSessionSummary("abc-123", lines);
  expect(result).toBeNull();
});

test("cwd를 프로젝트 디렉토리명으로 변환", () => {
  expect(cwdToProjectDir("/Users/juniq/develop/code/juniqlim/claude-skin"))
    .toBe("-Users-juniq-develop-code-juniqlim-claude-skin");
});

test("긴 메시지는 50자로 자름", () => {
  const longMsg = "가".repeat(100);
  const lines = [
    `{"type":"user","message":{"role":"user","content":"${longMsg}"},"sessionId":"abc-123","timestamp":"2026-02-10T15:00:00.000Z"}`,
  ];

  const result = parseSessionSummary("abc-123", lines);
  expect(result!.firstMessage.length).toBeLessThanOrEqual(53); // 50 + "..."
});
