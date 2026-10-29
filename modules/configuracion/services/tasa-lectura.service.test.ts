import { describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ rows: [] as { tipoItse: string; montoCentimos: number }[], from: vi.fn() }));

vi.mock("@/db", () => ({
  db: {
    select: () => ({
      from: (...a: unknown[]) => {
        m.from(...a);
        return Promise.resolve(m.rows);
      },
    }),
  },
}));

import { getTasas } from "./tasa-lectura.service";

describe("getTasas", () => {
  it("devuelve los montos en céntimos por tipo", async () => {
    m.rows = [
      { tipoItse: "PREVIA", montoCentimos: 30000 },
      { tipoItse: "POSTERIOR", montoCentimos: 15000 },
    ];
    expect(await getTasas()).toEqual({ POSTERIOR: 15000, PREVIA: 30000 });
    expect(m.from).toHaveBeenCalledTimes(1);
  });
});

describe("getTasas sin configurar", () => {
  it("lanza si falta una fila", async () => {
    vi.resetModules();
    m.rows = [{ tipoItse: "POSTERIOR", montoCentimos: 15000 }];
    const { getTasas: fresh } = await import("./tasa-lectura.service");
    await expect(fresh()).rejects.toThrow("Tasa no configurada");
  });
});
