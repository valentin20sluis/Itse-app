import {
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const rolEnum = pgEnum("rol", ["cliente", "admin", "superadmin"]);

export const usuarios = pgTable("usuarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull(),
  nombres: text("nombres").notNull().default(""),
  apellidos: text("apellidos").notNull().default(""),
  documento: text("documento"),
  telefono: text("telefono"),
  rol: rolEnum("rol").notNull().default("cliente"),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Usuario = typeof usuarios.$inferSelect;

export const funcionEstablecimientoEnum = pgEnum("funcion_establecimiento", [
  "ALMACEN",
  "COMERCIO",
  "ENCUENTRO",
  "EDUCACION",
  "HOSPEDAJE",
  "INDUSTRIA",
  "OFICINAS_ADMINISTRATIVAS",
  "SALUD",
]);

export const establecimientos = pgTable(
  "establecimientos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "restrict" }),
    razonSocial: text("razon_social"),
    ruc: text("ruc"),
    nombreComercial: text("nombre_comercial").notNull(),
    direccion: text("direccion").notNull(),
    distrito: text("distrito").notNull(),
    numeroGiro: text("numero_giro"),
    funcion: funcionEstablecimientoEnum("funcion"),
    giro: text("giro").notNull(),
    areaM2: numeric("area_m2", { precision: 10, scale: 2 }).notNull(),
    numeroPisos: integer("numero_pisos").notNull(),
    pisoEstablecimiento: integer("piso_establecimiento"),
    archivadoAt: timestamp("archivado_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("establecimientos_usuario_id_idx").on(t.usuarioId)],
);

export type Establecimiento = typeof establecimientos.$inferSelect;

export const estadoExpedienteEnum = pgEnum("estado_expediente", [
  "BORRADOR",
  "PRESENTADO",
  "EN_REVISION",
  "OBSERVADO_REQUISITOS",
  "EN_TRAMITE_EXTERNO",
  "INSPECTOR_DESIGNADO",
  "DILIGENCIA_PROGRAMADA",
  "EN_SUBSANACION",
  "CUMPLE",
  "NO_CUMPLE",
  "CERTIFICADO_PENDIENTE_FIRMA",
  "PENDIENTE_RESOLUCION",
  "FINALIZADO",
  "ENTREGADO",
  "DERIVADO_COMERCIALIZACION",
  "ANULADO",
]);

export const tipoTramiteEnum = pgEnum("tipo_tramite", ["NUEVA", "RENOVACION"]);

export const nivelRiesgoEnum = pgEnum("nivel_riesgo", ["BAJO", "MEDIO", "ALTO", "MUY_ALTO"]);

export const tipoDocumentoEnum = pgEnum("tipo_documento", [
  "PLANO_UBICACION",
  "PLANO_DISTRIBUCION",
  "PLAN_SEGURIDAD",
  "COMPROBANTE_PAGO",
  "POZO_TIERRA",
  "EXTINTORES",
]);

export const expedientes = pgTable(
  "expedientes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    numero: text("numero").unique(),
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "restrict" }),
    establecimientoId: uuid("establecimiento_id")
      .notNull()
      .references(() => establecimientos.id, { onDelete: "restrict" }),
    tipoTramite: tipoTramiteEnum("tipo_tramite").notNull(),
    estado: estadoExpedienteEnum("estado").notNull().default("BORRADOR"),
    nivelRiesgo: nivelRiesgoEnum("nivel_riesgo"),
    tieneSotano: boolean("tiene_sotano").notNull().default(false),
    almacenaInflamables: boolean("almacena_inflamables").notNull().default(false),
    solicitanteNombre: text("solicitante_nombre"),
    solicitanteDocumento: text("solicitante_documento"),
    solicitanteTelefono: text("solicitante_telefono"),
    solicitanteEmail: text("solicitante_email"),
    esRepresentante: boolean("es_representante").notNull().default(false),
    razonSocial: text("razon_social"),
    numeroBoleta: text("numero_boleta"),
    declaracionAceptadaAt: timestamp("declaracion_aceptada_at", { withTimezone: true }),
    presentadoAt: timestamp("presentado_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("expedientes_usuario_id_idx").on(t.usuarioId),
    index("expedientes_establecimiento_id_idx").on(t.establecimientoId),
  ],
);

export type Expediente = typeof expedientes.$inferSelect;

export const expedienteDocumentos = pgTable(
  "expediente_documentos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    expedienteId: uuid("expediente_id")
      .notNull()
      .references(() => expedientes.id, { onDelete: "restrict" }),
    tipo: tipoDocumentoEnum("tipo").notNull(),
    fileKey: text("file_key").notNull(),
    nombreOriginal: text("nombre_original").notNull(),
    mimeType: text("mime_type").notNull(),
    tamanoBytes: integer("tamano_bytes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("expediente_documentos_expediente_tipo_idx").on(t.expedienteId, t.tipo)],
);

export type ExpedienteDocumento = typeof expedienteDocumentos.$inferSelect;

export const historialEstados = pgTable(
  "historial_estados",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    expedienteId: uuid("expediente_id")
      .notNull()
      .references(() => expedientes.id, { onDelete: "restrict" }),
    estadoAnterior: estadoExpedienteEnum("estado_anterior"),
    estadoNuevo: estadoExpedienteEnum("estado_nuevo").notNull(),
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "restrict" }),
    comentario: text("comentario"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("historial_estados_expediente_id_idx").on(t.expedienteId)],
);

export type HistorialEstado = typeof historialEstados.$inferSelect;
