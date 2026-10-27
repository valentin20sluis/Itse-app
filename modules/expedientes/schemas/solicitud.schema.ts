import { z } from "zod";
import { nivelRiesgoEnum, tipoTramiteEnum } from "@/db/schema";

const texto = (campo: string, min: number, max: number) =>
  z
    .string({ error: `Ingresa ${campo}.` })
    .trim()
    .min(1, `Ingresa ${campo}.`)
    .min(min, `Debe tener al menos ${min} caracteres.`)
    .max(max, `Debe tener como máximo ${max} caracteres.`);

const checkbox = z.preprocess((v) => v === "on" || v === true, z.boolean());

export const paso1Schema = z.object({
  establecimientoId: z.uuid({ error: "Selecciona un establecimiento." }),
  tipoTramite: z.enum(tipoTramiteEnum.enumValues, {
    error: "Selecciona el tipo de trámite.",
  }),
});

export const paso2Schema = z.object({
  nivelRiesgo: z.enum(nivelRiesgoEnum.enumValues, {
    error: "Selecciona el nivel de riesgo.",
  }),
  tieneSotano: checkbox,
  almacenaInflamables: checkbox,
});

export const paso3Schema = z.object({
  solicitanteNombre: texto("el nombre del solicitante", 3, 120),
  solicitanteDocumento: z
    .string({ error: "Ingresa el DNI o RUC." })
    .trim()
    .regex(/^(\d{8}|\d{11})$/, "Ingresa un DNI (8 dígitos) o RUC (11 dígitos) válido."),
  solicitanteTelefono: z
    .string({ error: "Ingresa el teléfono." })
    .trim()
    .regex(/^\d{7,9}$/, "El teléfono debe tener entre 7 y 9 dígitos."),
  solicitanteEmail: z
    .string({ error: "Ingresa el correo electrónico." })
    .trim()
    .pipe(z.email("Ingresa un correo electrónico válido.")),
});

export const paso4Schema = z.object({
  numeroBoleta: z
    .string({ error: "Ingresa el número de boleta." })
    .trim()
    .min(1, "Ingresa el número de boleta.")
    .min(3, "Debe tener al menos 3 caracteres.")
    .max(30, "Debe tener como máximo 30 caracteres.")
    .regex(/^[A-Za-z0-9-]+$/, "Solo se permiten letras, números y guion."),
});

export const declaracionSchema = z.object({
  aceptada: checkbox.refine((v) => v === true, "Debes aceptar la declaración jurada."),
});

export type Paso1Input = z.infer<typeof paso1Schema>;
export type Paso2Input = z.infer<typeof paso2Schema>;
export type Paso3Input = z.infer<typeof paso3Schema>;
export type Paso4Input = z.infer<typeof paso4Schema>;
export type DeclaracionInput = z.infer<typeof declaracionSchema>;
