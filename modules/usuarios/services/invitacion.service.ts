import { clerkClient } from "@clerk/nextjs/server";
import type { Actor } from "@/modules/establecimientos/types/establecimiento.types";

export type InvitacionResult = { ok: true; data: { email: string } } | { ok: false; error: string };

const CORREO_EXISTENTE =
  "Ese correo ya tiene una cuenta. Si es personal de la oficina, cambia su rol desde la lista de usuarios.";
const ERROR_GENERICO = "No se pudo enviar la invitación. Inténtalo de nuevo.";
const CODIGOS_DUPLICADO = ["form_identifier_exists", "duplicate_record"];

function esDuplicado(e: unknown): boolean {
  const errors = (e as { errors?: { code?: unknown }[] } | null)?.errors;
  return (
    Array.isArray(errors) &&
    errors.some((x) => typeof x?.code === "string" && CODIGOS_DUPLICADO.includes(x.code))
  );
}

export async function invitarPersonal(actor: Actor, email: string): Promise<InvitacionResult> {
  if (actor.rol !== "superadmin") throw new Error("No autorizado");

  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");
  if (!base) return { ok: false, error: ERROR_GENERICO };

  try {
    const client = await clerkClient();
    await client.invitations.createInvitation({
      emailAddress: email,
      publicMetadata: { role: "admin" },
      redirectUrl: `${base}/sign-up`,
      ignoreExisting: false,
    });
    return { ok: true, data: { email } };
  } catch (e) {
    return { ok: false, error: esDuplicado(e) ? CORREO_EXISTENTE : ERROR_GENERICO };
  }
}
