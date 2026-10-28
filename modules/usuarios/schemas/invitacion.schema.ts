import { z } from "zod";

const MENSAJE = "Escribe un correo válido.";

export const invitarSchema = z.object({
  email: z
    .string({ error: MENSAJE })
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: MENSAJE }).max(254, { error: MENSAJE })),
});

export type InvitarInput = z.infer<typeof invitarSchema>;
