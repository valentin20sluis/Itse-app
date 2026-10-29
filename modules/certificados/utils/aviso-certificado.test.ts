import { describe, expect, it } from "vitest";

import { avisoCertificado } from "./aviso-certificado";

describe("avisoCertificado", () => {
  it("avisa cuando venció", () => {
    expect(avisoCertificado({ estado: "VENCIDO", diasRestantes: -3 })).toBe(
      "Tu certificado venció. Inicia una nueva solicitud para renovarlo.",
    );
  });
  it("avisa por vencer con singular y plural", () => {
    expect(avisoCertificado({ estado: "POR_VENCER", diasRestantes: 1 })).toContain("vence en 1 día.");
    expect(avisoCertificado({ estado: "POR_VENCER", diasRestantes: 30 })).toContain("vence en 30 días.");
  });
  it("devuelve null en vigente y revocado", () => {
    expect(avisoCertificado({ estado: "VIGENTE", diasRestantes: 400 })).toBeNull();
    expect(avisoCertificado({ estado: "REVOCADO", diasRestantes: 10 })).toBeNull();
  });
});
