import { NextResponse } from "next/server";
import { filtrosReporteSchema } from "@/modules/reportes/schemas/filtros-reporte.schema";
import { ENCABEZADOS_CSV, listExpedientesCsv } from "@/modules/reportes/services/reporte-csv.service";
import { aCsv } from "@/modules/reportes/utils/csv";
import { getOrCreateUser } from "@/modules/usuarios/services/user.service";

export async function GET(request: Request) {
  const usuario = await getOrCreateUser();
  if (!usuario || !usuario.activo) {
    return new NextResponse("No autorizado.", { status: 401 });
  }
  if (usuario.rol === "cliente") {
    return new NextResponse("No tienes permiso para descargar este reporte.", { status: 403 });
  }

  // Un parámetro repetido llega como arreglo y el schema lo ignora.
  const { searchParams } = new URL(request.url);
  const params = Object.fromEntries(
    [...new Set(searchParams.keys())].map((k) => {
      const valores = searchParams.getAll(k);
      return [k, valores.length > 1 ? valores : valores[0]];
    }),
  );
  const filtros = filtrosReporteSchema.parse(params);

  const { filas } = await listExpedientesCsv(usuario, filtros);
  const csv = aCsv([ENCABEZADOS_CSV, ...filas.map((f) => Object.values(f))]);
  const nombre = `expedientes-${filtros.desde.replaceAll("-", "")}-${filtros.hasta.replaceAll("-", "")}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombre}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
