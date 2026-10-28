import { beforeEach, describe, expect, it, vi } from "vitest";

const requireRole = vi.hoisted(() => vi.fn());
const listCatalogoCompleto = vi.hoisted(() => vi.fn());
const listAuditoria = vi.hoisted(() => vi.fn());

vi.mock("@/modules/usuarios/services/authorization.service", () => ({ requireRole }));
vi.mock("@/modules/configuracion/services/catalogo-lectura.service", () => ({ listCatalogoCompleto }));
vi.mock("@/modules/configuracion/services/auditoria-configuracion.service", () => ({ listAuditoria }));
vi.mock("@/modules/configuracion/components/CatalogoView", () => ({ CatalogoView: () => null }));

import CatalogoPage from "./page";

beforeEach(() => vi.resetAllMocks());

describe("/panel/configuracion/catalogo", () => {
  it("exige superadmin y lee con ese usuario", async () => {
    const actor = { id: "s1", rol: "superadmin" };
    const items = [{ id: "1", descripcion: "Instalar extintores", activo: true }];
    requireRole.mockResolvedValue(actor);
    listCatalogoCompleto.mockResolvedValue(items);
    listAuditoria.mockResolvedValue([]);

    const element = await CatalogoPage();

    expect(requireRole).toHaveBeenCalledWith("superadmin");
    expect(listCatalogoCompleto).toHaveBeenCalledWith(actor);
    expect(listAuditoria).toHaveBeenCalledWith(actor, "OBSERVACION");
    expect(element.props.items).toEqual(items);
    expect(element.props.historial).toEqual([]);
  });

  it("si requireRole redirige no lee ningún dato", async () => {
    requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(CatalogoPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(listCatalogoCompleto).not.toHaveBeenCalled();
    expect(listAuditoria).not.toHaveBeenCalled();
  });
});
