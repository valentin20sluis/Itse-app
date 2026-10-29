import { describe, expect, it } from "vitest";

import { textoDiasRestantes } from "./texto-plazo";

describe("textoDiasRestantes", () => {
  it("dice 'Vence hoy' con 0 días", () => {
    expect(textoDiasRestantes(0)).toBe("Vence hoy");
  });
  it("usa singular con 1 día", () => {
    expect(textoDiasRestantes(1)).toBe("Quedan 1 día hábil");
  });
  it("usa plural con N días", () => {
    expect(textoDiasRestantes(5)).toBe("Quedan 5 días hábiles");
  });
});
