import { z } from "zod";
import { FUNCION_VALUES } from "@/modules/establecimientos/constants/funciones";

const texto = (campo: string, min: number, max: number) =>
  z
    .string({ error: `Ingresa ${campo}.` })
    .trim()
    .min(1, `Ingresa ${campo}.`)
    .min(min, `Debe tener al menos ${min} caracteres.`)
    .max(max, `Debe tener como máximo ${max} caracteres.`);

const camas = z.coerce
  .number({ error: "Ingresa un número de camas o habitaciones válido." })
  .int("El número de camas o habitaciones debe ser un entero.")
  .min(1, "Debe haber al menos 1 cama o habitación.")
  .max(5000, "No puede superar 5000 camas o habitaciones.");

export const establecimientoSchema = z.object({
  razonSocial: texto("la razón social", 3, 150),
  ruc: z
    .string({ error: "Ingresa el RUC." })
    .trim()
    .regex(/^\d{11}$/, "El RUC debe tener 11 dígitos."),
  nombreComercial: texto("el nombre comercial", 3, 100),
  direccion: texto("la dirección", 5, 200),
  distrito: texto("el distrito", 2, 80),
  numeroGiro: texto("el número de giro", 1, 20).regex(
    /^[A-Za-z0-9-]+$/,
    "Usa solo letras, números y guion.",
  ),
  funcion: z.enum(FUNCION_VALUES, { error: "Selecciona la función del establecimiento." }),
  giro: texto("el giro o actividad", 3, 300),
  areaM2: z.coerce
    .number({ error: "Ingresa un área válida en m²." })
    .gt(0, "El área debe ser mayor que 0.")
    .max(100000, "El área no puede superar 100000 m²."),
  numeroPisos: z.coerce
    .number({ error: "Ingresa un número de pisos de la edificación válido." })
    .int("El número de pisos de la edificación debe ser un entero.")
    .min(1, "La edificación debe tener al menos 1 piso.")
    .max(50, "La edificación no puede tener más de 50 pisos."),
  pisoEstablecimiento: z.coerce
    .number({ error: "Ingresa un piso válido." })
    .int("El piso debe ser un entero.")
    .min(1, "El piso debe ser al menos 1.")
    .max(50, "El piso no puede ser mayor que 50."),
  numeroCamas: z.unknown().optional(),
}).superRefine((data, ctx) => {
  if (data.funcion === "HOSPEDAJE") {
    const vacio = data.numeroCamas == null || String(data.numeroCamas).trim() === "";
    const r = vacio ? undefined : camas.safeParse(data.numeroCamas);
    if (vacio || !r?.success) {
      ctx.addIssue({
        code: "custom",
        path: ["numeroCamas"],
        message: vacio ? "Ingresa el número de camas o habitaciones." : r?.error?.issues[0].message,
      });
    }
  }
  if (data.pisoEstablecimiento > data.numeroPisos) {
    ctx.addIssue({
      code: "custom",
      path: ["pisoEstablecimiento"],
      message: "No puede ser mayor que el número de pisos de la edificación.",
    });
  }
}).transform((data) => ({
  ...data,
  numeroCamas: data.funcion === "HOSPEDAJE" ? Number(data.numeroCamas) : null,
}));

export type EstablecimientoInput = z.infer<typeof establecimientoSchema>;
