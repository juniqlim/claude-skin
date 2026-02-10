import { describe, test, expect } from "bun:test";
import { cursorColumn } from "../cursor.ts";

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
