CREATE TABLE "establecimientos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"nombre_comercial" text NOT NULL,
	"direccion" text NOT NULL,
	"distrito" text NOT NULL,
	"giro" text NOT NULL,
	"area_m2" numeric(10, 2) NOT NULL,
	"numero_pisos" integer NOT NULL,
	"archivado_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "establecimientos" ADD CONSTRAINT "establecimientos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "establecimientos_usuario_id_idx" ON "establecimientos" USING btree ("usuario_id");