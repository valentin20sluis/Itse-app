import { cache } from "react";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { parseRole } from "@/modules/usuarios/schemas/role.schema";
import type { Usuario } from "@/modules/usuarios/types/user.types";

export const getOrCreateUser = cache(async (): Promise<Usuario | null> => {
  const { userId } = await auth();
  if (!userId) return null;

  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const rawRole = clerkUser.publicMetadata?.role;
  const rol = parseRole(rawRole);

  if (rawRole === undefined) {
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, { publicMetadata: { role: "cliente" } });
  }

  const email = clerkUser.primaryEmailAddress?.emailAddress ?? "";
  const nombres = clerkUser.firstName ?? "";
  const apellidos = clerkUser.lastName ?? "";

  const [usuario] = await db
    .insert(usuarios)
    .values({
      clerkId: userId,
      email,
      nombres,
      apellidos,
      rol,
    })
    .onConflictDoUpdate({
      target: usuarios.clerkId,
      set: {
        rol,
        nombres: sql`coalesce(nullif(${nombres}, ''), ${usuarios.nombres})`,
        apellidos: sql`coalesce(nullif(${apellidos}, ''), ${usuarios.apellidos})`,
        email: sql`coalesce(nullif(${email}, ''), ${usuarios.email})`,
        updatedAt: sql`case when ${usuarios.rol} <> ${rol} then now() else ${usuarios.updatedAt} end`,
      },
    })
    .returning();

  return usuario;
});

export const getCurrentUser = cache(async (): Promise<Usuario | null> => {
  const { userId } = await auth();
  if (!userId) return null;

  const [usuario] = await db.select().from(usuarios).where(eq(usuarios.clerkId, userId)).limit(1);
  return usuario ?? null;
});
