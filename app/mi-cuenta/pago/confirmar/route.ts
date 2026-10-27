import { redirect } from "next/navigation";
import { confirmarPago } from "@/modules/expedientes/services/pago.service";
import { getOrCreateUser } from "@/modules/usuarios/services/user.service";
import { getHomeForRole } from "@/modules/usuarios/utils/role-routes";

const DESTINO = "/mi-cuenta/expedientes";

// El proxy solo autentica: la autorización (rol, activo, dueño) se verifica aquí.
export async function GET(request: Request) {
  const usuario = await getOrCreateUser();
  if (!usuario) redirect("/sign-in");
  if (!usuario.activo) redirect("/cuenta-desactivada");
  if (usuario.rol !== "cliente") redirect(getHomeForRole(usuario.rol));

  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (sessionId) {
    try {
      await confirmarPago(usuario, sessionId);
    } catch {
      // Sin detalles técnicos: el cliente ve su lista y puede reintentar con «Pagar».
    }
  }
  redirect(DESTINO);
}
