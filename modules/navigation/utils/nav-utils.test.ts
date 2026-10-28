import { describe, expect, it } from "vitest";
import { findNavItem, getNavSections, isActivePath } from "./nav-utils";

const labels = (s: ReturnType<typeof getNavSections>) =>
  s.flatMap((x) => x.items.map((i) => i.label));

describe("getNavSections", () => {
  it("cliente: 6 ítems en orden", () => {
    expect(labels(getNavSections("cliente", "cliente"))).toEqual([
      "Inicio", "Mis establecimientos", "Nueva solicitud", "Mis expedientes", "Mis certificados", "Mi perfil",
    ]);
  });

  it("admin: sin Jefatura", () => {
    const s = getNavSections("panel", "admin");
    expect(labels(s)).toEqual(["Dashboard", "Expedientes", "Inspectores", "Certificados", "Reportes"]);
    expect(s.some((x) => x.title === "Jefatura")).toBe(false);
  });

  it("superadmin: cinco más Jefatura", () => {
    const s = getNavSections("panel", "superadmin");
    expect(s).toHaveLength(2);
    expect(s[1].title).toBe("Jefatura");
    expect(s[1].items.map((i) => i.label)).toEqual(["Por aprobar", "Usuarios", "Configuración"]);
  });

  it("Por aprobar apunta a los pendientes de Jefatura", () => {
    const item = getNavSections("panel", "superadmin")[1].items.find((i) => i.label === "Por aprobar");
    expect(item?.href).toBe("/panel/expedientes?pendientes=jefatura");
  });

  it("cliente no recibe ítems del panel", () => {
    expect(getNavSections("panel", "cliente")).toEqual([]);
  });
});

describe("findNavItem", () => {
  it("devuelve undefined si no existe", () => {
    expect(findNavItem("panel", "/panel/nada")).toBeUndefined();
  });
  it("encuentra Jefatura con roles superadmin", () => {
    expect(findNavItem("panel", "/panel/usuarios")?.roles).toEqual(["superadmin"]);
  });
});

describe("isActivePath", () => {
  it("raíces solo exactas", () => {
    expect(isActivePath("/mi-cuenta", "/mi-cuenta")).toBe(true);
    expect(isActivePath("/mi-cuenta/expedientes", "/mi-cuenta")).toBe(false);
    expect(isActivePath("/panel/usuarios", "/panel")).toBe(false);
  });
  it("subrutas por prefijo sin falso positivo", () => {
    expect(isActivePath("/panel/expedientes/12", "/panel/expedientes")).toBe(true);
    expect(isActivePath("/panel/expedientes-x", "/panel/expedientes")).toBe(false);
  });
});
