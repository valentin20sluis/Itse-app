CREATE TYPE "public"."accion_configuracion" AS ENUM('CREAR', 'EDITAR', 'ELIMINAR', 'ACTIVAR', 'DESACTIVAR');--> statement-breakpoint
CREATE TYPE "public"."entidad_configuracion" AS ENUM('FERIADO', 'OBSERVACION', 'TASA');--> statement-breakpoint
CREATE TABLE "configuracion_auditoria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"entidad" "entidad_configuracion" NOT NULL,
	"accion" "accion_configuracion" NOT NULL,
	"referencia" text NOT NULL,
	"valor_anterior" text,
	"valor_nuevo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feriados" (
	"fecha" date PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "configuracion_auditoria" ADD CONSTRAINT "configuracion_auditoria_actor_id_usuarios_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "configuracion_auditoria_entidad_created_idx" ON "configuracion_auditoria" USING btree ("entidad","created_at");
--> statement-breakpoint
INSERT INTO "feriados" ("fecha", "nombre") VALUES
	('2026-01-01', 'Año Nuevo'),
	('2026-04-02', 'Jueves Santo'),
	('2026-04-03', 'Viernes Santo'),
	('2026-05-01', 'Día del Trabajo'),
	('2026-06-29', 'San Pedro y San Pablo'),
	('2026-07-28', 'Fiestas Patrias'),
	('2026-07-29', 'Fiestas Patrias'),
	('2026-08-30', 'Santa Rosa de Lima'),
	('2026-10-08', 'Combate de Angamos'),
	('2026-11-01', 'Todos los Santos'),
	('2026-12-08', 'Inmaculada Concepción'),
	('2026-12-09', 'Batalla de Ayacucho'),
	('2026-12-25', 'Navidad'),
	('2027-01-01', 'Año Nuevo'),
	('2027-03-25', 'Jueves Santo'),
	('2027-03-26', 'Viernes Santo'),
	('2027-05-01', 'Día del Trabajo'),
	('2027-06-29', 'San Pedro y San Pablo'),
	('2027-07-28', 'Fiestas Patrias'),
	('2027-07-29', 'Fiestas Patrias'),
	('2027-08-30', 'Santa Rosa de Lima'),
	('2027-10-08', 'Combate de Angamos'),
	('2027-11-01', 'Todos los Santos'),
	('2027-12-08', 'Inmaculada Concepción'),
	('2027-12-09', 'Batalla de Ayacucho'),
	('2027-12-25', 'Navidad')
ON CONFLICT DO NOTHING;
