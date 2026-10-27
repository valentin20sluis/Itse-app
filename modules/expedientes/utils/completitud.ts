import {
  paso1Schema,
  paso2Schema,
  paso3Schema,
} from "@/modules/expedientes/schemas/solicitud.schema";
import type { TipoDocumento } from "@/modules/expedientes/types/expediente.types";
import {
  documentosFaltantes,
  type ContextoDocumentos,
} from "@/modules/expedientes/utils/documentos";

export function faltantesBorrador(
  exp: ContextoDocumentos,
  tiposSubidos: readonly TipoDocumento[],
): string[] {
  const pasos = [paso1Schema, paso2Schema, paso3Schema];
  const faltantes: string[] = [];
  pasos.forEach((schema, i) => {
    if (!schema.safeParse(exp).success) faltantes.push(`paso${i + 1}`);
  });
  faltantes.push(...documentosFaltantes(tiposSubidos, exp));
  return faltantes;
}
