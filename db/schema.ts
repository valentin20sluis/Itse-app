import { boolean, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

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
