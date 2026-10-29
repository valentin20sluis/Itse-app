import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireRole = vi.hoisted(() => vi.fn());
const listTasas = vi.hoisted(() => vi.fn());
const listAuditoria = vi.hoisted(() => vi.fn());

vi.mock("@/modules/usuarios/services/authorization.service", () => ({ requireRole }));
vi.mock("@/modules/configuracion/services/tasa-gestion.service", () => ({ listTasas }));
vi.mock("@/modules/configuracion/services/auditoria-configuracion.service", () => ({ listAuditoria }));
vi.mock("@/modules/configuracion/components/TasasForm", () => ({ TasasForm: () => null }));

import TasasPage from "./page";

beforeEach(() => vi.resetAllMocks());

describe("/panel/configuracion/tasas", () => {
  it("exige superadmin y lee con ese usuario", async () => {
    const actor = { id: "s1", rol: "superadmin" };
    requireRole.mockResolvedValue(actor);
    listTasas.mockResolvedValue({ POSTERIOR: 15000, PREVIA: 30000 });
    listAuditoria.mockResolvedValue([]);

    const element = (await TasasPage()) as ReactElement<{ children: ReactElement[] }>;
    const form = element.props.children[1] as ReactElement<Record<string, unknown>>;

    expect(requireRole).toHaveBeenCalledWith("superadmin");
    expect(listTasas).toHaveBeenCalledWith(actor);
    expect(listAuditoria).toHaveBeenCalledWith(actor, "TASA");
    expect(form.props.tasas).toEqual({ POSTERIOR: 15000, PREVIA: 30000 });
    expect(form.props.historial).toEqual([]);
  });

  it("si requireRole redirige no lee ningún dato", async () => {
    requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(TasasPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(listTasas).not.toHaveBeenCalled();
    expect(listAuditoria).not.toHaveBeenCalled();
  });
});
