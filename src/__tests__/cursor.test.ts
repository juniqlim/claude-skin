import { describe, test, expect } from "bun:test";
import { cursorColumn, wrappedLineCount } from "../cursor.ts";

describe("cursorColumn", () => {
  // "❯ " is 1 column + 1 space = 2 columns
  const prefixWidth = 2;

  test("empty input, cursor at 0", () => {
    expect(cursorColumn("", 0)).toBe(prefixWidth);
  });

  test("ASCII input, cursor at end", () => {
    expect(cursorColumn("hello", 5)).toBe(prefixWidth + 5);
  });

  test("ASCII input, cursor in middle", () => {
    expect(cursorColumn("hello", 2)).toBe(prefixWidth + 2);
  });

  test("Korean input, cursor at end", () => {
    // Each Korean character is 2 columns wide
    expect(cursorColumn("안녕", 2)).toBe(prefixWidth + 4);
  });

  test("Korean input, cursor after first char", () => {
    expect(cursorColumn("안녕", 1)).toBe(prefixWidth + 2);
  });

  test("mixed Korean and ASCII", () => {
    // "hi안녕" → h(1) + i(1) + 안(2) + 녕(2) = 6
    expect(cursorColumn("hi안녕", 4)).toBe(prefixWidth + 6);
  });

  test("cursor at 0 with non-empty input", () => {
    expect(cursorColumn("테스트", 0)).toBe(prefixWidth);
  });
});

describe("wrappedLineCount", () => {
  test("short text fits in one line", () => {
    expect(wrappedLineCount("hello", 80)).toBe(1);
  });

  test("text exactly fills terminal width", () => {
    expect(wrappedLineCount("a".repeat(80), 80)).toBe(1);
  });

  test("text wraps to two lines", () => {
    expect(wrappedLineCount("a".repeat(81), 80)).toBe(2);
  });

  test("Korean text wrapping (2 columns per char)", () => {
    // 20 Korean chars = 40 columns, termWidth 30 → ceil(40/30) = 2
    expect(wrappedLineCount("가".repeat(20), 30)).toBe(2);
  });

  test("empty text returns 1 line", () => {
    expect(wrappedLineCount("", 80)).toBe(1);
  });

  test("text with newlines counts each line", () => {
    expect(wrappedLineCount("hello\nworld", 80)).toBe(2);
  });

  test("text with newlines and wrapping", () => {
    // line1: 81 chars → 2 lines, line2: "hi" → 1 line = 3 total
    expect(wrappedLineCount("a".repeat(81) + "\nhi", 80)).toBe(3);
  });
});
