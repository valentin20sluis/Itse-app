import {
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
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

export const establecimientos = pgTable(
  "establecimientos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "restrict" }),
    nombreComercial: text("nombre_comercial").notNull(),
    direccion: text("direccion").notNull(),
    distrito: text("distrito").notNull(),
    giro: text("giro").notNull(),
    areaM2: numeric("area_m2", { precision: 10, scale: 2 }).notNull(),
    numeroPisos: integer("numero_pisos").notNull(),
    archivadoAt: timestamp("archivado_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("establecimientos_usuario_id_idx").on(t.usuarioId)],
);

export type Establecimiento = typeof establecimientos.$inferSelect;
