import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ usuario: vi.fn(), lista: vi.fn() }));

vi.mock("@/modules/usuarios/services/user.service", () => ({ getOrCreateUser: h.usuario }));
vi.mock("@/modules/reportes/services/reporte-csv.service", () => ({
  ENCABEZADOS_CSV: ["Número", "Fecha de presentación"],
  listExpedientesCsv: h.lista,
}));

import { GET } from "@/app/api/reportes/expedientes/route";

const llamar = (qs = "") => GET(new Request(`http://localhost/api/reportes/expedientes${qs}`));

beforeEach(() => {
  h.usuario.mockReset().mockResolvedValue({ id: "u1", rol: "admin", activo: true });
  h.lista.mockReset().mockResolvedValue({
    filas: [{ numero: "=CMD()", fechaPresentacion: "01/02/2026" }],
    truncado: false,
  });
});

describe("GET /api/reportes/expedientes", () => {
  it("401 sin usuario o inactivo", async () => {
    h.usuario.mockResolvedValue(null);
    expect((await llamar()).status).toBe(401);
    h.usuario.mockResolvedValue({ id: "u1", rol: "admin", activo: false });
    expect((await llamar()).status).toBe(401);
    expect(h.lista).not.toHaveBeenCalled();
  });

  it("403 para cliente", async () => {
    h.usuario.mockResolvedValue({ id: "u2", rol: "cliente", activo: true });
    expect((await llamar()).status).toBe(403);
    expect(h.lista).not.toHaveBeenCalled();
  });

  it.each(["admin", "superadmin"])("200 con encabezados y CSV para %s", async (rol) => {
    h.usuario.mockResolvedValue({ id: "u1", rol, activo: true });
    const res = await llamar("?desde=2026-01-01&hasta=2026-02-15&riesgo=ALTO");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="expedientes-20260101-20260215.csv"');
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(h.lista.mock.calls[0][1]).toMatchObject({ desde: "2026-01-01", hasta: "2026-02-15", riesgo: "ALTO" });
    const texto = await res.text();
    expect(texto).toContain('"Número","Fecha de presentación"');
    expect(texto).toContain("\"'=CMD()\"");
  });

  it("filtros inválidos o repetidos no rompen", async () => {
    const res = await llamar("?desde=x&estado=BORRADOR&riesgo=A&riesgo=B");
    expect(res.status).toBe(200);
    expect(h.lista.mock.calls[0][1]).toMatchObject({ estado: undefined, riesgo: undefined });
  });
});
