import { describe, expect, it } from "vitest";
import {
  declaracionSchema,
  paso1Schema,
  paso2Schema,
  paso3Schema,
  paso4Schema,
} from "./solicitud.schema";

const uuid = "3f2b8c1e-5a4d-4e6f-9a7b-1c2d3e4f5a6b";
const paso3 = {
  solicitanteNombre: "  Juan Pérez  ",
  solicitanteDocumento: "12345678",
  solicitanteTelefono: "987654321",
  solicitanteEmail: "juan@ejemplo.pe",
};
const msg = (r: { success: boolean; error?: { issues: { message: string }[] } }) =>
  r.error?.issues[0]?.message;

describe("paso1Schema", () => {
  it("acepta datos válidos", () => {
    expect(paso1Schema.safeParse({ establecimientoId: uuid, tipoTramite: "NUEVA" }).success).toBe(true);
  });
  it("rechaza uuid y enum inválidos con mensaje en español", () => {
    const a = paso1Schema.safeParse({ establecimientoId: "x", tipoTramite: "NUEVA" });
    expect(msg(a)).toBe("Selecciona un establecimiento.");
    const b = paso1Schema.safeParse({ establecimientoId: uuid, tipoTramite: "OTRO" });
    expect(msg(b)).toBe("Selecciona el tipo de trámite.");
  });
});

describe("paso2Schema", () => {
  it("checkboxes: 'on' es true y ausente es false", () => {
    const r = paso2Schema.parse({ nivelRiesgo: "ALTO", tieneSotano: "on" });
    expect(r).toEqual({
      nivelRiesgo: "ALTO",
      tieneSotano: true,
      almacenaInflamables: false,
      tieneCocina: false,
      esGrifo: false,
      usoMixtoPatrimonio: false,
      granEscala: false,
    });
  });
  it("tieneCocina y esGrifo: 'on' y true son true, ausente es false", () => {
    const base = { nivelRiesgo: "MEDIO" };
    const on = paso2Schema.parse({ ...base, tieneCocina: "on", esGrifo: true });
    expect([on.tieneCocina, on.esGrifo]).toEqual([true, true]);
    const off = paso2Schema.parse(base);
    expect([off.tieneCocina, off.esGrifo]).toEqual([false, false]);
  });
  it("usoMixtoPatrimonio y granEscala: 'on' y true son true, ausente es false", () => {
    const base = { nivelRiesgo: "MEDIO" };
    const on = paso2Schema.parse({ ...base, usoMixtoPatrimonio: "on", granEscala: true });
    expect([on.usoMixtoPatrimonio, on.granEscala]).toEqual([true, true]);
    const off = paso2Schema.parse(base);
    expect([off.usoMixtoPatrimonio, off.granEscala]).toEqual([false, false]);
  });
  it("rechaza nivel inválido", () => {
    expect(msg(paso2Schema.safeParse({ nivelRiesgo: "X" }))).toBe("Selecciona el nivel de riesgo.");
  });
});

describe("paso3Schema", () => {
  it("acepta válido y recorta espacios", () => {
    const r = paso3Schema.parse(paso3);
    expect(r.solicitanteNombre).toBe("Juan Pérez");
  });
  it("DNI de 8 dígitos válido; RUC, 9 dígitos y letras inválidos", () => {
    for (const d of ["12345678"]) {
      expect(paso3Schema.safeParse({ ...paso3, solicitanteDocumento: d }).success).toBe(true);
    }
    for (const d of ["20123456789", "123456789", "1234567a"]) {
      expect(paso3Schema.safeParse({ ...paso3, solicitanteDocumento: d }).success).toBe(false);
    }
  });
  it("valida teléfono", () => {
    expect(paso3Schema.safeParse({ ...paso3, solicitanteTelefono: "1234567" }).success).toBe(true);
    expect(paso3Schema.safeParse({ ...paso3, solicitanteTelefono: "123456" }).success).toBe(false);
    expect(paso3Schema.safeParse({ ...paso3, solicitanteTelefono: "1234567890" }).success).toBe(
      false,
    );
    expect(paso3Schema.safeParse({ ...paso3, solicitanteTelefono: "98765abc1" }).success).toBe(
      false,
    );
  });
  it("valida email", () => {
    expect(msg(paso3Schema.safeParse({ ...paso3, solicitanteEmail: "no-email" }))).toBe(
      "Ingresa un correo electrónico válido.",
    );
  });
  it("nombre demasiado corto", () => {
    expect(msg(paso3Schema.safeParse({ ...paso3, solicitanteNombre: "Jo" }))).toBe(
      "Debe tener al menos 3 caracteres.",
    );
  });
});

describe("paso4Schema", () => {
  it("acepta boleta válida con trim", () => {
    expect(paso4Schema.parse({ numeroBoleta: " B-001234 " }).numeroBoleta).toBe("B-001234");
  });
  it("rechaza caracteres inválidos y vacío", () => {
    expect(msg(paso4Schema.safeParse({ numeroBoleta: "B 001/2" }))).toBe(
      "Solo se permiten letras, números y guion.",
    );
    expect(msg(paso4Schema.safeParse({ numeroBoleta: "  " }))).toBe("Ingresa el número de boleta.");
  });
});

describe("declaracionSchema", () => {
  it("acepta 'on'", () => {
    expect(declaracionSchema.safeParse({ aceptada: "on" }).success).toBe(true);
  });
  it("rechaza no aceptada o ausente", () => {
    expect(msg(declaracionSchema.safeParse({}))).toBe("Debes aceptar la declaración jurada.");
    expect(declaracionSchema.safeParse({ aceptada: false }).success).toBe(false);
  });
});
