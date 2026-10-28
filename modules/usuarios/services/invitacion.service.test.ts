import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createInvitation = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: async () => ({ invitations: { createInvitation } }),
}));

import { invitarPersonal } from "./invitacion.service";

const superadmin = { id: "s1", rol: "superadmin" as const };

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://itse.example.pe/");
  createInvitation.mockResolvedValue({ id: "inv_1" });
});
afterEach(() => vi.unstubAllEnvs());

describe("invitarPersonal", () => {
  it("admin y cliente lanzan sin llamar a Clerk", async () => {
    await expect(invitarPersonal({ id: "a", rol: "admin" }, "x@y.pe")).rejects.toThrow("No autorizado");
    await expect(invitarPersonal({ id: "c", rol: "cliente" }, "x@y.pe")).rejects.toThrow("No autorizado");
    expect(createInvitation).not.toHaveBeenCalled();
  });

  it("invita con rol admin fijo, sin ignorar existentes y con redirección a /sign-up", async () => {
    expect(await invitarPersonal(superadmin, "x@y.pe")).toEqual({ ok: true, data: { email: "x@y.pe" } });
    expect(createInvitation).toHaveBeenCalledWith({
      emailAddress: "x@y.pe",
      publicMetadata: { role: "admin" },
      redirectUrl: "https://itse.example.pe/sign-up",
      ignoreExisting: false,
    });
  });

  it("correo ya existente da el mensaje específico", async () => {
    createInvitation.mockRejectedValue({ errors: [{ code: "form_identifier_exists" }] });
    const r = await invitarPersonal(superadmin, "x@y.pe");
    expect(r).toMatchObject({ ok: false, error: expect.stringContaining("ya tiene una cuenta") });
  });

  it("otro error da mensaje genérico sin detalles de Clerk", async () => {
    createInvitation.mockRejectedValue(new Error("clerk secret detail"));
    expect(await invitarPersonal(superadmin, "x@y.pe")).toEqual({
      ok: false,
      error: "No se pudo enviar la invitación. Inténtalo de nuevo.",
    });
  });

  it("sin NEXT_PUBLIC_APP_URL falla sin llamar a Clerk", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    const r = await invitarPersonal(superadmin, "x@y.pe");
    expect(r.ok).toBe(false);
    expect(createInvitation).not.toHaveBeenCalled();
  });
});
