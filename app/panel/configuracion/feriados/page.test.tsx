import { beforeEach, describe, expect, it, vi } from "vitest";

const requireRole = vi.hoisted(() => vi.fn());
const listFeriados = vi.hoisted(() => vi.fn());
const listAuditoria = vi.hoisted(() => vi.fn());

vi.mock("@/modules/usuarios/services/authorization.service", () => ({ requireRole }));
vi.mock("@/modules/configuracion/services/feriado-gestion.service", () => ({ listFeriados }));
vi.mock("@/modules/configuracion/services/auditoria-configuracion.service", () => ({ listAuditoria }));
vi.mock("@/modules/configuracion/components/FeriadosView", () => ({ FeriadosView: () => null }));

import FeriadosPage from "./page";

beforeEach(() => vi.resetAllMocks());

describe("/panel/configuracion/feriados", () => {
  it("exige superadmin y lee con ese usuario", async () => {
    const actor = { id: "s1", rol: "superadmin" };
    requireRole.mockResolvedValue(actor);
    listFeriados.mockResolvedValue([{ fecha: "2026-12-25", nombre: "Navidad" }]);
    listAuditoria.mockResolvedValue([]);

    const element = await FeriadosPage();

    expect(requireRole).toHaveBeenCalledWith("superadmin");
    expect(listFeriados).toHaveBeenCalledWith(actor);
    expect(listAuditoria).toHaveBeenCalledWith(actor, "FERIADO");
    expect(element.props.feriados).toEqual([{ fecha: "2026-12-25", nombre: "Navidad" }]);
    expect(element.props.historial).toEqual([]);
  });

  it("si requireRole redirige no lee ningún dato", async () => {
    requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(FeriadosPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(listFeriados).not.toHaveBeenCalled();
    expect(listAuditoria).not.toHaveBeenCalled();
  });
});
