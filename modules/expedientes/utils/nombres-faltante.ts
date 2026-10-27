import { DOCUMENTOS } from "@/modules/expedientes/utils/documentos";

export const NOMBRES_FALTANTE: Record<string, string> = {
  paso1: "Establecimiento y trámite",
  paso2: "Nivel de riesgo",
  paso3: "Solicitante",
  declaracion: "Declaración jurada",
  establecimiento: "Establecimiento",
  ...Object.fromEntries(DOCUMENTOS.map((d) => [d.tipo, d.etiqueta])),
};
