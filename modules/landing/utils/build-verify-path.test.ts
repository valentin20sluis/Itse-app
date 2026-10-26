import { describe, expect, it } from "vitest";

import { buildVerifyPath } from "./build-verify-path";

describe("buildVerifyPath", () => {
  it("builds the path for a normal code", () => {
    expect(buildVerifyPath("ABC-123")).toBe("/verificar/ABC-123");
  });

  it("trims surrounding spaces", () => {
    expect(buildVerifyPath("  ABC-123  ")).toBe("/verificar/ABC-123");
  });

  it("returns null for empty or whitespace-only input", () => {
    expect(buildVerifyPath("")).toBeNull();
    expect(buildVerifyPath("   ")).toBeNull();
  });

  it("encodes special characters", () => {
    expect(buildVerifyPath("a/b?c d")).toBe("/verificar/a%2Fb%3Fc%20d");
  });
});
