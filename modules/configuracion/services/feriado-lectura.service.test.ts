import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ rows: [] as { fecha: string }[], orderBy: vi.fn() }));

vi.mock("@/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        orderBy: (...a: unknown[]) => {
          m.orderBy(...a);
          return Promise.resolve(m.rows);
        },
      }),
    }),
  },
}));

import { getFeriados } from "./feriado-lectura.service";

beforeEach(() => {
  m.orderBy.mockClear();
});

describe("getFeriados", () => {
  it("devuelve las fechas ordenadas por la consulta", async () => {
    m.rows = [{ fecha: "2026-01-01" }, { fecha: "2026-12-25" }];
    expect(await getFeriados()).toEqual(["2026-01-01", "2026-12-25"]);
    expect(m.orderBy).toHaveBeenCalledTimes(1);
  });

  it("tabla vacía devuelve []", async () => {
    m.rows = [];
    expect(await getFeriados()).toEqual([]);
  });
});
