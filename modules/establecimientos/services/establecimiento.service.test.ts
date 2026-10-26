import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;
type Pred = (row: Row) => boolean;

const store = vi.hoisted(() => ({ rows: [] as Row[], seq: 0 }));

vi.mock("drizzle-orm", () => {
  const key = (col: { name: string }) =>
    col.name.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
  return {
    eq: (col: { name: string }, v: unknown): Pred => (r) => r[key(col)] === v,
    isNull: (col: { name: string }): Pred => (r) => r[key(col)] == null,
    and: (...ps: Pred[]): Pred => (r) => ps.every((p) => p(r)),
    desc: () => "desc",
  };
});

vi.mock("@/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: (p: Pred) => {
          const found = () => store.rows.filter(p);
          return {
            orderBy: async () => found().sort((a, b) => Number(b.seq) - Number(a.seq)),
            limit: async () => found().slice(0, 1),
          };
        },
      }),
    }),
    insert: () => ({
      values: (v: Row) => ({
        returning: async () => {
          const row = { id: `id-${++store.seq}`, seq: store.seq, archivadoAt: null, ...v };
          store.rows.push(row);
          return [row];
        },
      }),
    }),
    update: () => ({
      set: (s: Row) => ({
        where: (p: Pred) => ({
          returning: async () => {
            const hit = store.rows.filter(p);
            hit.forEach((r) => Object.assign(r, s));
            return hit;
          },
        }),
      }),
    }),
  },
}));

import {
  archiveEstablecimiento,
  createEstablecimiento,
  getEstablecimientoById,
  listOwnEstablecimientos,
  updateEstablecimiento,
} from "./establecimiento.service";

const A = { id: "user-a", rol: "cliente" } as const;
const B = { id: "user-b", rol: "cliente" } as const;
const input = {
  nombreComercial: "Bodega Ficticia",
  direccion: "Av. Falsa 123",
  distrito: "Distrito Uno",
  giro: "Bodega",
  areaM2: 120.5,
  numeroPisos: 2,
};

beforeEach(() => {
  store.rows = [];
  store.seq = 0;
});

describe("autorización por rol", () => {
  for (const rol of ["admin", "superadmin"] as const) {
    const staff = { id: "staff", rol };
    it(`${rol}: mutaciones y listOwn lanzan No autorizado`, async () => {
      await expect(listOwnEstablecimientos(staff)).rejects.toThrow("No autorizado");
      await expect(createEstablecimiento(staff, input)).rejects.toThrow("No autorizado");
      await expect(updateEstablecimiento(staff, "x", input)).rejects.toThrow("No autorizado");
      await expect(archiveEstablecimiento(staff, "x")).rejects.toThrow("No autorizado");
    });

    it(`${rol}: lee uno de otro cliente y uno archivado`, async () => {
      const e = await createEstablecimiento(A, input);
      expect((await getEstablecimientoById(staff, e.id))?.id).toBe(e.id);
      await archiveEstablecimiento(A, e.id);
      expect((await getEstablecimientoById(staff, e.id))?.id).toBe(e.id);
    });
  }
});

describe("create y list", () => {
  it("usa actor.id como dueño e ignora usuarioId del input", async () => {
    const e = await createEstablecimiento(A, { ...input, usuarioId: "user-b" } as typeof input);
    expect(e.usuarioId).toBe("user-a");
    expect(e.areaM2).toBe("120.5");
  });

  it("lista solo los propios no archivados, el más reciente primero", async () => {
    const e1 = await createEstablecimiento(A, input);
    const e2 = await createEstablecimiento(A, input);
    const e3 = await createEstablecimiento(A, input);
    await createEstablecimiento(B, input);
    await archiveEstablecimiento(A, e3.id);
    expect((await listOwnEstablecimientos(A)).map((r) => r.id)).toEqual([e2.id, e1.id]);
  });
});

describe("IDOR", () => {
  it("otro cliente no lee, edita ni archiva; igual que id inexistente", async () => {
    const e = await createEstablecimiento(A, input);
    const before = structuredClone(store.rows);

    expect(await getEstablecimientoById(B, e.id)).toBeNull();
    expect(await updateEstablecimiento(B, e.id, { ...input, giro: "Hack" })).toBeNull();
    expect(await archiveEstablecimiento(B, e.id)).toBeNull();
    expect(store.rows).toEqual(before);

    expect(await getEstablecimientoById(A, "no-existe")).toBeNull();
    expect(await updateEstablecimiento(A, "no-existe", input)).toBeNull();
    expect(await archiveEstablecimiento(A, "no-existe")).toBeNull();
  });
});

describe("update y archive", () => {
  it("el dueño edita y se fija updatedAt", async () => {
    const e = await createEstablecimiento(A, input);
    const u = await updateEstablecimiento(A, e.id, { ...input, giro: "Botica" });
    expect(u?.giro).toBe("Botica");
    expect(u?.updatedAt).toBeInstanceOf(Date);
  });

  it("archivar marca archivadoAt sin borrar y bloquea editar, re-archivar y leer", async () => {
    const e = await createEstablecimiento(A, input);
    const a = await archiveEstablecimiento(A, e.id);
    expect(a?.archivadoAt).toBeInstanceOf(Date);
    expect(store.rows).toHaveLength(1);
    expect(await updateEstablecimiento(A, e.id, input)).toBeNull();
    expect(await archiveEstablecimiento(A, e.id)).toBeNull();
    expect(await getEstablecimientoById(A, e.id)).toBeNull();
  });
});
