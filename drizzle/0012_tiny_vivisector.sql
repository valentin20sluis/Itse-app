CREATE TABLE "inspectores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombres" text NOT NULL,
	"apellidos" text NOT NULL,
	"documento" text NOT NULL,
	"telefono" text NOT NULL,
	"email" text NOT NULL,
	"habilitado_previa" boolean DEFAULT false NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "inspectores_documento_uidx" ON "inspectores" USING btree ("documento");