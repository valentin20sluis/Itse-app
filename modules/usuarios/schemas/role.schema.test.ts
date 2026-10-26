import { describe, expect, it } from "vitest";
import { parseRole } from "./role.schema";

describe("parseRole", () => {
  it.each(["cliente", "admin", "superadmin"])("acepta %s", (rol) => {
    expect(parseRole(rol)).toBe(rol);
  });

  it.each([undefined, null, "root", 5])("%s se interpreta como cliente", (v) => {
    expect(parseRole(v)).toBe("cliente");
  });
});
