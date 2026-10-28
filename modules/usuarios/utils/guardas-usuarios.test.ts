import { describe, expect, it } from "vitest";
import { evaluarCambioEstado, evaluarCambioRol } from "./guardas-usuarios";

const destino = (rol: "cliente" | "admin" | "superadmin", activo = true) => ({ id: "d1", rol, activo });

describe("evaluarCambioRol", () => {
  const base = { actorId: "a1", superadminsActivos: 2 };

  it("rechaza cambiar el rol propio", () => {
    expect(evaluarCambioRol({ ...base, actorId: "d1", destino: destino("admin"), nuevoRol: "cliente" })).toEqual({
      ok: false,
      error: "No puedes modificar tu propia cuenta.",
    });
  });

  it("rechaza el mismo rol", () => {
    expect(evaluarCambioRol({ ...base, destino: destino("admin"), nuevoRol: "admin" })).toEqual({
      ok: false,
      error: "Ya tiene ese rol.",
    });
  });

  it("rechaza degradar al último jefe activo", () => {
    expect(
      evaluarCambioRol({ ...base, superadminsActivos: 1, destino: destino("superadmin"), nuevoRol: "admin" }),
    ).toEqual({ ok: false, error: "Debe quedar al menos un jefe activo." });
  });

  it("permite degradar a un jefe si hay otro activo", () => {
    expect(evaluarCambioRol({ ...base, destino: destino("superadmin"), nuevoRol: "cliente" })).toEqual({ ok: true });
  });

  it("un jefe inactivo no cuenta como jefe activo", () => {
    expect(
      evaluarCambioRol({ ...base, superadminsActivos: 1, destino: destino("superadmin", false), nuevoRol: "admin" }),
    ).toEqual({ ok: true });
  });

  it("promover a admin o superadmin procede", () => {
    expect(evaluarCambioRol({ ...base, superadminsActivos: 1, destino: destino("cliente"), nuevoRol: "admin" })).toEqual({ ok: true });
    expect(evaluarCambioRol({ ...base, superadminsActivos: 1, destino: destino("admin"), nuevoRol: "superadmin" })).toEqual({ ok: true });
  });
});

describe("evaluarCambioEstado", () => {
  const base = { actorId: "a1", superadminsActivos: 2 };

  it("rechaza desactivarse a sí mismo", () => {
    expect(
      evaluarCambioEstado({ ...base, actorId: "d1", destino: destino("superadmin"), nuevoActivo: false }),
    ).toEqual({ ok: false, error: "No puedes modificar tu propia cuenta." });
  });

  it("rechaza no-op con mensaje según el estado", () => {
    expect(evaluarCambioEstado({ ...base, destino: destino("admin"), nuevoActivo: true })).toEqual({
      ok: false,
      error: "Ya está activo.",
    });
    expect(evaluarCambioEstado({ ...base, destino: destino("admin", false), nuevoActivo: false })).toEqual({
      ok: false,
      error: "Ya está inactivo.",
    });
  });

  it("rechaza desactivar al último jefe activo", () => {
    expect(
      evaluarCambioEstado({ ...base, superadminsActivos: 1, destino: destino("superadmin"), nuevoActivo: false }),
    ).toEqual({ ok: false, error: "Debe quedar al menos un jefe activo." });
  });

  it("desactivar a un jefe con otro activo procede; reactivar siempre procede", () => {
    expect(evaluarCambioEstado({ ...base, destino: destino("superadmin"), nuevoActivo: false })).toEqual({ ok: true });
    expect(
      evaluarCambioEstado({ ...base, superadminsActivos: 0, destino: destino("superadmin", false), nuevoActivo: true }),
    ).toEqual({ ok: true });
  });
});
