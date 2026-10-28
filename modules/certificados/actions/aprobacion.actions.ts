"use server";

import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { ejecutarCertificado, ID_INVALIDO } from "@/modules/certificados/actions/ejecutar-certificado";
import { aprobarCertificado } from "@/modules/certificados/services/aprobacion.service";
import { requireRole } from "@/modules/usuarios/services/authorization.service";

export async function aprobarCertificadoAction(
  id: string,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars -- firma que exige useActionState */
  _prev: ActionResult<null> | null,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars -- firma que exige useActionState */
  _formData: FormData,
): Promise<ActionResult<null>> {
  const usuario = await requireRole("superadmin");
  if (!z.uuid().safeParse(id).success) return ID_INVALIDO;
  return ejecutarCertificado(id, () => aprobarCertificado(usuario, id));
}
