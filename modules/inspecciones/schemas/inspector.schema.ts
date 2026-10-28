import { z } from "zod";

const nombre = (campo: string) =>
  z
    .string({ error: `Ingresa ${campo}.` })
    .trim()
    .min(1, `Ingresa ${campo}.`)
    .min(2, "Debe tener al menos 2 caracteres.")
    .max(80, "Debe tener como máximo 80 caracteres.");

export const inspectorSchema = z.object({
  nombres: nombre("los nombres"),
  apellidos: nombre("los apellidos"),
  documento: z
    .string({ error: "Ingresa el documento." })
    .trim()
    .regex(/^\d{5,8}$/, "El documento debe tener entre 5 y 8 dígitos."),
  telefono: z
    .string({ error: "Ingresa el teléfono." })
    .trim()
    .regex(/^9\d{8}$/, "El teléfono debe tener 9 dígitos y empezar con 9."),
  email: z
    .string({ error: "Ingresa el correo." })
    .trim()
    .toLowerCase()
    .pipe(
      z
        .email("Ingresa un correo válido.")
        .max(120, "Debe tener como máximo 120 caracteres."),
    ),
});

export type InspectorInput = z.infer<typeof inspectorSchema>;
