import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;
type Pred = (row: Row, outer?: Row) => boolean;

const store = vi.hoisted(() => ({ expedientes: [] as Row[], docs: [] as Row[], seq: 0 }));

vi.mock("drizzle-orm", () => {
  const key = (col: { name: string }) =>
    col.name.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
  const isCol = (v: unknown): v is { name: string } =>
    typeof v === "object" && v !== null && "name" in v;
  return {
    eq: (col: { name: string }, v: unknown): Pred => (r, o) =>
      r[key(col)] === (isCol(v) ? o?.[key(v)] : v),
    and: (...ps: Pred[]): Pred => (r, o) => ps.every((p) => p(r, o)),
    exists: (sub: { pred: Pred }): Pred => (r) => store.expedientes.some((e) => sub.pred(e, r)),
  };
});

vi.mock("@/db", () => {
  const rowsOf = (table: object) => ("fileKey" in table ? store.docs : store.expedientes);
  return {
    db: {
      select: () => ({
        from: (table: object) => ({
          where: (p: Pred) => {
            const hit = rowsOf(table)
              .filter((r) => p(r))
              .map((r) => ({ ...r }));
            return Object.assign(Promise.resolve(hit), {
              pred: p,
              limit: async () => hit.slice(0, 1),
            });
          },
        }),
      }),
      insert: () => ({
        values: (v: Row) => ({
          onConflictDoUpdate: ({ set }: { set: Row }) => ({
            returning: async () => {
              const prev = store.docs.find(
                (d) => d.expedienteId === v.expedienteId && d.tipo === v.tipo,
              );
              if (prev) return [Object.assign(prev, set)];
              const row = { id: `doc-${++store.seq}`, ...v };
              store.docs.push(row);
              return [row];
            },
          }),
        }),
      }),
      delete: () => ({
        where: (p: Pred) => ({
          returning: async () => {
            const hit = store.docs.filter((d) => p(d, d));
            store.docs = store.docs.filter((d) => !hit.includes(d));
            return hit;
          },
        }),
      }),
    },
  };
});

import {
  getDocumentoForDownload,
  listDocumentos,
  registerDocumento,
  removeDocumento,
} from "./documento.service";

const A = { id: "user-a", rol: "cliente" } as const;
const B = { id: "user-b", rol: "cliente" } as const;
const pdf = {
  tipo: "PLANO_UBICACION",
  fileKey: "key-1",
  nombreOriginal: "plano.pdf",
  mimeType: "application/pdf",
  tamanoBytes: 1000,
} as const;

beforeEach(() => {
  store.expedientes = [
    { id: "exp-1", usuarioId: "user-a", estado: "BORRADOR" },
    { id: "exp-2", usuarioId: "user-a", estado: "PRESENTADO" },
  ];
  store.docs = [];
  store.seq = 0;
});

describe("registerDocumento", () => {
  it("registra un archivo válido", async () => {
    const r = await registerDocumento(A, "exp-1", pdf);
    expect(r).toMatchObject({ status: "ok", previousFileKey: null });
    expect(store.docs).toHaveLength(1);
    expect(store.docs[0]).toMatchObject({ expedienteId: "exp-1", fileKey: "key-1" });
  });

  it("rechaza un archivo inválido sin guardar", async () => {
    const r = await registerDocumento(A, "exp-1", { ...pdf, mimeType: "text/html" });
    expect(r).toMatchObject({ status: "invalido" });
    expect(store.docs).toHaveLength(0);
  });

  it("reemplaza el mismo tipo y devuelve la clave anterior", async () => {
    await registerDocumento(A, "exp-1", pdf);
    const r = await registerDocumento(A, "exp-1", { ...pdf, fileKey: "key-2" });
    expect(r).toMatchObject({ status: "ok", previousFileKey: "key-1" });
    expect(store.docs).toHaveLength(1);
    expect(store.docs[0].fileKey).toBe("key-2");
  });

  it("no registra en un expediente presentado", async () => {
    expect(await registerDocumento(A, "exp-2", pdf)).toBeNull();
    expect(store.docs).toHaveLength(0);
  });
});

describe("IDOR", () => {
  it("otro cliente no registra, borra, lista ni descarga; igual que inexistente", async () => {
    await registerDocumento(A, "exp-1", pdf);
    const before = structuredClone(store.docs);

    expect(await registerDocumento(B, "exp-1", { ...pdf, fileKey: "hack" })).toBeNull();
    expect(await removeDocumento(B, "exp-1", "PLANO_UBICACION")).toBeNull();
    expect(await listDocumentos(B, "exp-1")).toEqual([]);
    expect(await getDocumentoForDownload(B, "exp-1", "PLANO_UBICACION")).toBeNull();
    expect(store.docs).toEqual(before);

    expect(await registerDocumento(A, "no-existe", pdf)).toBeNull();
    expect(await removeDocumento(A, "no-existe", "PLANO_UBICACION")).toBeNull();
    expect(await listDocumentos(A, "no-existe")).toEqual([]);
    expect(await getDocumentoForDownload(A, "no-existe", "PLANO_UBICACION")).toBeNull();
  });
});

describe("removeDocumento", () => {
  it("el dueño elimina en borrador y recibe la fila", async () => {
    await registerDocumento(A, "exp-1", pdf);
    expect((await removeDocumento(A, "exp-1", "PLANO_UBICACION"))?.fileKey).toBe("key-1");
    expect(store.docs).toHaveLength(0);
  });

  it("no elimina en un expediente presentado", async () => {
    store.docs = [{ id: "d", expedienteId: "exp-2", tipo: "PLANO_UBICACION", fileKey: "k" }];
    expect(await removeDocumento(A, "exp-2", "PLANO_UBICACION")).toBeNull();
    expect(store.docs).toHaveLength(1);
  });
});

describe("lectura y descarga", () => {
  it("el dueño y el staff listan y descargan", async () => {
    await registerDocumento(A, "exp-1", pdf);
    for (const actor of [A, { id: "s", rol: "admin" }, { id: "s", rol: "superadmin" }] as const) {
      expect(await listDocumentos(actor, "exp-1")).toHaveLength(1);
      expect((await getDocumentoForDownload(actor, "exp-1", "PLANO_UBICACION"))?.fileKey).toBe(
        "key-1",
      );
    }
    expect(await getDocumentoForDownload(A, "exp-1", "POZO_TIERRA")).toBeNull();
  });
});

describe("autorización por rol", () => {
  for (const rol of ["admin", "superadmin"] as const) {
    it(`${rol}: registrar y eliminar lanzan No autorizado`, async () => {
      const staff = { id: "s", rol };
      await expect(registerDocumento(staff, "exp-1", pdf)).rejects.toThrow("No autorizado");
      await expect(removeDocumento(staff, "exp-1", "PLANO_UBICACION")).rejects.toThrow(
        "No autorizado",
      );
    });
  }
});
