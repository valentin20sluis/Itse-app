import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { resolucionSiguiente } from "@/modules/certificados/utils/resolucion-siguiente";

describe("resolucionSiguiente", () => {
  it("consulta certificados y expedientes con el patrón del año", () => {
    const q = new PgDialect().sqlToQuery(resolucionSiguiente(2026));
    expect(q.sql).toContain("from certificados where resolucion_numero like");
    expect(q.sql).toContain("from expedientes where resolucion_no_cumple_numero like");
    expect(q.sql).toContain("max(");
    expect(q.params.filter((p) => p === "RG-2026-%")).toHaveLength(2);
    expect(q.params).toContain("2026");
  });
});
