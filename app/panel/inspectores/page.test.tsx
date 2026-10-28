import { beforeEach, describe, expect, it, vi } from "vitest";

const requireRole = vi.hoisted(() => vi.fn());
const listInspectores = vi.hoisted(() => vi.fn());

vi.mock("@/modules/usuarios/services/authorization.service", () => ({ requireRole }));
vi.mock("@/modules/inspecciones/services/inspector.service", () => ({ listInspectores }));
vi.mock("@/modules/inspecciones/components/InspectoresView", () => ({
  InspectoresView: () => null,
}));

import InspectoresPage from "./page";

describe("/panel/inspectores", () => {
  beforeEach(() => vi.resetAllMocks());

  it("exige admin o superadmin y pasa el usuario al servicio", async () => {
    const usuario = { id: "u1", rol: "admin" };
    const inspectores = [{ id: "i1" }];
    requireRole.mockResolvedValue(usuario);
    listInspectores.mockResolvedValue(inspectores);

    const element = await InspectoresPage();

    expect(requireRole).toHaveBeenCalledWith("admin", "superadmin");
    expect(listInspectores).toHaveBeenCalledWith(usuario);
    expect(element.props.inspectores).toBe(inspectores);
    expect(requireRole.mock.invocationCallOrder[0]).toBeLessThan(
      listInspectores.mock.invocationCallOrder[0],
    );
  });

  it("si requireRole redirige no consulta el servicio", async () => {
    requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(InspectoresPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(listInspectores).not.toHaveBeenCalled();
  });
});
