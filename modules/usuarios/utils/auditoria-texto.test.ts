import { describe, expect, it } from "vitest";
import { describirCambio } from "./auditoria-texto";

describe("describirCambio", () => {
  it("cambio de rol usa etiquetas en español", () => {
    expect(
      describirCambio({ accion: "CAMBIO_ROL", valorAnterior: "admin", valorNuevo: "superadmin" }),
    ).toBe("Rol: Admin → Jefe GRDyDC");
  });

  it("activación y desactivación", () => {
    expect(describirCambio({ accion: "ACTIVACION", valorAnterior: "inactivo", valorNuevo: "activo" })).toBe(
      "Cuenta reactivada",
    );
    expect(
      describirCambio({ accion: "DESACTIVACION", valorAnterior: "activo", valorNuevo: "inactivo" }),
    ).toBe("Cuenta desactivada");
  });

  it("valores desconocidos no rompen ni se muestran en crudo", () => {
    expect(describirCambio({ accion: "CAMBIO_ROL", valorAnterior: "root", valorNuevo: null })).toBe(
      "Rol: — → —",
    );
    expect(describirCambio({ accion: "OTRA" as never, valorAnterior: null, valorNuevo: null })).toBe(
      "Cambio en la cuenta",
    );
  });
});
