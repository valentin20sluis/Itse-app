import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  requireRole: vi.fn(),
  cambiarRol: vi.fn(),
  setActivo: vi.fn(),
  revalidatePath: vi.fn(),
  invitarPersonal: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: h.revalidatePath }));
vi.mock("@/modules/usuarios/services/authorization.service", () => ({ requireRole: h.requireRole }));
vi.mock("@/modules/usuarios/services/usuario-gestion.service", () => ({
  cambiarRol: h.cambiarRol,
  setActivo: h.setActivo,
}));

vi.mock("@/modules/usuarios/services/invitacion.service", () => ({ invitarPersonal: h.invitarPersonal }));

import { cambiarRolAction, invitarPersonalAction, setUsuarioActivoAction } from "./usuario.actions";

const ID = "3f2b8c1e-5a4d-4e6f-8b7a-1c2d3e4f5a6b";
const actor = { id: "s1", rol: "superadmin" };

beforeEach(() => {
  vi.resetAllMocks();
  h.requireRole.mockResolvedValue(actor);
});

describe("autorización", () => {
  it("si requireRole redirige no se llama al servicio", async () => {
    h.requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(cambiarRolAction(ID, "admin")).rejects.toThrow("NEXT_REDIRECT");
    await expect(setUsuarioActivoAction(ID, false)).rejects.toThrow("NEXT_REDIRECT");
    expect(h.cambiarRol).not.toHaveBeenCalled();
    expect(h.setActivo).not.toHaveBeenCalled();
  });

  it("exige superadmin", async () => {
    h.cambiarRol.mockResolvedValue({ ok: false, error: "x" });
    await cambiarRolAction(ID, "admin");
    expect(h.requireRole).toHaveBeenCalledWith("superadmin");
  });
});

describe("validación", () => {
  it("id no uuid", async () => {
    expect(await cambiarRolAction("1", "admin")).toEqual({ ok: false, error: "No se encontró el usuario." });
    expect(await setUsuarioActivoAction("1", true)).toEqual({ ok: false, error: "No se encontró el usuario." });
    expect(h.cambiarRol).not.toHaveBeenCalled();
    expect(h.setActivo).not.toHaveBeenCalled();
  });

  it("rol desconocido o activo no booleano", async () => {
    expect((await cambiarRolAction(ID, "root")).ok).toBe(false);
    expect((await setUsuarioActivoAction(ID, "no" as never)).ok).toBe(false);
    expect(h.cambiarRol).not.toHaveBeenCalled();
    expect(h.setActivo).not.toHaveBeenCalled();
  });
});

describe("resultado", () => {
  it("éxito revalida lista y detalle", async () => {
    const data = { id: ID, rol: "admin", activo: true };
    h.cambiarRol.mockResolvedValue({ ok: true, data });
    expect(await cambiarRolAction(ID, "admin")).toEqual({ ok: true, data });
    expect(h.cambiarRol).toHaveBeenCalledWith(actor, ID, "admin");
    expect(h.revalidatePath).toHaveBeenCalledWith("/panel/usuarios");
    expect(h.revalidatePath).toHaveBeenCalledWith(`/panel/usuarios/${ID}`);
  });

  it("error del servicio se propaga sin revalidar", async () => {
    h.setActivo.mockResolvedValue({ ok: false, error: "Debe quedar al menos un jefe activo." });
    expect(await setUsuarioActivoAction(ID, false)).toEqual({
      ok: false,
      error: "Debe quedar al menos un jefe activo.",
    });
    expect(h.revalidatePath).not.toHaveBeenCalled();
  });

  it("excepción inesperada devuelve mensaje genérico", async () => {
    h.setActivo.mockRejectedValue(new Error("boom"));
    expect(await setUsuarioActivoAction(ID, false)).toEqual({
      ok: false,
      error: "No se pudo guardar el cambio. Inténtalo de nuevo.",
    });
  });
});

describe("invitarPersonalAction", () => {
  const form = (campos: Record<string, string>) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(campos)) fd.set(k, v);
    return fd;
  };

  it("si requireRole redirige no valida ni llama al servicio", async () => {
    h.requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(invitarPersonalAction(null, form({ email: "a@b.pe" }))).rejects.toThrow("NEXT_REDIRECT");
    expect(h.invitarPersonal).not.toHaveBeenCalled();
  });

  it("correo inválido devuelve error de campo sin llamar al servicio", async () => {
    const r = await invitarPersonalAction(null, form({ email: "nada" }));
    expect(r).toMatchObject({ ok: false, fieldErrors: { email: ["Escribe un correo válido."] } });
    expect(h.invitarPersonal).not.toHaveBeenCalled();
  });

  it("ignora un campo rol del formulario y devuelve solo el correo", async () => {
    h.invitarPersonal.mockResolvedValue({ ok: true, data: { email: "a@b.pe" } });
    const r = await invitarPersonalAction(null, form({ email: " A@B.pe ", rol: "superadmin" }));
    expect(h.requireRole).toHaveBeenCalledWith("superadmin");
    expect(h.invitarPersonal).toHaveBeenCalledWith(actor, "a@b.pe");
    expect(r).toEqual({ ok: true, data: { email: "a@b.pe" } });
  });

  it("propaga el error del servicio", async () => {
    h.invitarPersonal.mockResolvedValue({ ok: false, error: "x" });
    expect(await invitarPersonalAction(null, form({ email: "a@b.pe" }))).toEqual({ ok: false, error: "x" });
  });
});
