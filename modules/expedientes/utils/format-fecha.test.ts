import { describe, expect, it } from "vitest";

import { formatFecha, formatFechaHora } from "./format-fecha";

describe("format-fecha", () => {
  it("usa la zona America/Lima cerca de la medianoche UTC", () => {
    const d = new Date("2026-01-01T03:00:00Z");
    expect(formatFecha(d)).toBe("31/12/2025");
    expect(formatFechaHora(d)).toBe("31/12/2025 22:00");
  });

  it("formatea dd/MM/yyyy y con hora de 24 h", () => {
    const d = new Date("2026-03-05T19:07:00Z");
    expect(formatFecha(d)).toBe("05/03/2026");
    expect(formatFechaHora(d)).toBe("05/03/2026 14:07");
  });
});
