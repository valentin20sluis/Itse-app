import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: {} }));

import type { CertificadoClienteFila } from "@/modules/certificados/services/certificado-lista.service";
import { nombreSaludo, resumirInicio } from "@/modules/client-area/utils/resumen-inicio";

const est = (id: string) => ({ id, nombreComercial: `Local ${id}` });
const exp = (establecimientoId: string, estado: string, numero: string | null = "EXP-2026-00001") =>
  ({ establecimientoId, estado, numero }) as never;
const cert = (estado: CertificadoClienteFila["estado"], dias: number): CertificadoClienteFila => ({
  expedienteId: `e-${dias}`,
  numero: "C-1",
  nombreComercial: "Local",
  emitidoAt: new Date("2025-01-01T05:00:00.000Z"),
  venceAt: new Date(Date.UTC(2026, 0, 1 + dias)),
  diasRestantes: dias,
  estado,
});

describe("resumirInicio", () => {
  it("sin establecimientos no se puede solicitar", () => {
    const r = resumirInicio({ establecimientos: [], expedientes: [], certificados: [] });
    expect(r.establecimientos).toEqual({ total: 0, conSolicitud: 0, libres: 0, lista: [] });
    expect(r.puedeSolicitar).toBe(false);
  });

  it("todos ocupados: sin libres no se puede solicitar", () => {
    const r = resumirInicio({
      establecimientos: [est("a"), est("b")],
      expedientes: [exp("a", "PRESENTADO"), exp("b", "ENTREGADO")],
      certificados: [],
    });
    expect(r.establecimientos).toMatchObject({ total: 2, conSolicitud: 2, libres: 0 });
    expect(r.puedeSolicitar).toBe(false);
  });

  it("un expediente ANULADO libera el establecimiento", () => {
    const r = resumirInicio({
      establecimientos: [est("a")],
      expedientes: [exp("a", "ANULADO")],
      certificados: [],
    });
    expect(r.establecimientos.lista).toEqual([{ id: "a", nombre: "Local a", libre: true, detalle: "Disponible" }]);
    expect(r.puedeSolicitar).toBe(true);
  });

  it("un borrador ocupa y se muestra como Borrador; los demás con su número", () => {
    const r = resumirInicio({
      establecimientos: [est("a"), est("b")],
      expedientes: [exp("a", "BORRADOR", null), exp("b", "EN_REVISION", "EXP-2026-00007")],
      certificados: [],
    });
    expect(r.establecimientos.lista.map((e) => e.detalle)).toEqual(["Borrador", "EXP-2026-00007"]);
  });

  it("un establecimiento archivado (ausente de la lista) no cuenta en el total", () => {
    const r = resumirInicio({
      establecimientos: [est("a")],
      expedientes: [exp("archivado", "ENTREGADO"), exp("a", "ANULADO")],
      certificados: [],
    });
    expect(r.establecimientos.total).toBe(1);
    expect(r.establecimientos.conSolicitud).toBe(0);
  });

  it("cuenta expedientes en curso y finalizados", () => {
    const r = resumirInicio({
      establecimientos: [],
      expedientes: [exp("a", "BORRADOR"), exp("b", "EN_REVISION"), exp("c", "ENTREGADO"), exp("d", "ANULADO")],
      certificados: [],
    });
    expect(r.expedientes).toEqual({ total: 4, enCurso: 2, finalizados: 1 });
  });

  it("certificados: conteos con bordes de 60 y 61 días, y avisos por vencimiento", () => {
    const r = resumirInicio({
      establecimientos: [],
      expedientes: [],
      certificados: [cert("VIGENTE", 61), cert("POR_VENCER", 60), cert("VENCIDO", -5), cert("POR_VENCER", 10)],
    });
    expect(r.certificados).toMatchObject({ total: 4, vigentes: 1, porVencer: 2, vencidos: 1 });
    expect(r.certificados.avisos.map((c) => c.diasRestantes)).toEqual([-5, 10, 60]);
  });
});

describe("nombreSaludo", () => {
  it("usa nombres", () => {
    expect(nombreSaludo({ nombres: "Ana", email: "a@x.pe" })).toBe("Ana");
  });
  it("recorta espacios", () => {
    expect(nombreSaludo({ nombres: "  Ana  ", email: "a@x.pe" })).toBe("Ana");
  });
  it("usa el correo solo si nombres está vacío", () => {
    expect(nombreSaludo({ nombres: "   ", email: "a@x.pe" })).toBe("a@x.pe");
  });
});
