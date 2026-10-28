import { describe, expect, it } from "vitest";
import { filtroCertificadosSchema } from "@/modules/certificados/schemas/filtro-certificados.schema";

describe("filtroCertificadosSchema", () => {
  it("por defecto es todos", () => {
    expect(filtroCertificadosSchema.parse({})).toEqual({ filtro: "todos" });
  });

  it.each(["todos", "por-vencer", "vencidos"])("acepta %s", (filtro) => {
    expect(filtroCertificadosSchema.parse({ filtro })).toEqual({ filtro });
  });

  it.each(["xyz", ["a", "b"], "", 5])("valor desconocido %j cae a todos", (filtro) => {
    expect(filtroCertificadosSchema.parse({ filtro })).toEqual({ filtro: "todos" });
  });
});
