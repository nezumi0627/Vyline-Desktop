import { describe, expect, test } from "bun:test";
import { validateLocalSearchInput } from "./localSearchService.js";

describe("validateLocalSearchInput", () => {
  test("requires a bounded query and limit", () => {
    expect(validateLocalSearchInput({ query: "", limit: 10 })).toBeTruthy();
    expect(validateLocalSearchInput({ query: "hello", limit: 0 })).toBeTruthy();
    expect(validateLocalSearchInput({ query: "hello", limit: 101 })).toBeTruthy();
  });

  test("accepts an optional chat MID", () => {
    expect(validateLocalSearchInput({ chatMid: "c123", query: "hello", limit: 10 })).toBeNull();
  });
});
