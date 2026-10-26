import { beforeEach, describe, expect, it, vi } from "vitest";

const requireRole = vi.hoisted(() => vi.fn());
const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
);

vi.mock("@/modules/usuarios/services/authorization.service", () => ({ requireRole }));
vi.mock("next/navigation", () => ({ notFound }));

import PanelSectionPage from "./page";

const render = (section: string) =>
  PanelSectionPage({ params: Promise.resolve({ section }) } as never);

describe("/panel/[section]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("exige superadmin en usuarios", async () => {
    await render("usuarios");
    expect(requireRole).toHaveBeenCalledWith("superadmin");
  });

  it("exige admin y superadmin en expedientes", async () => {
    await render("expedientes");
    expect(requireRole).toHaveBeenCalledWith("admin", "superadmin");
  });

  it("sección desconocida llama notFound sin requireRole", async () => {
    await expect(render("nada")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
    expect(requireRole).not.toHaveBeenCalled();
  });
});
