import { describe, expect, it } from "vitest";
import { getHomeForRole } from "./role-routes";

describe("getHomeForRole", () => {
  it("cliente va a /mi-cuenta", () => {
    expect(getHomeForRole("cliente")).toBe("/mi-cuenta");
  });

  it.each(["admin", "superadmin"] as const)("%s va a /panel", (rol) => {
    expect(getHomeForRole(rol)).toBe("/panel");
  });
});
