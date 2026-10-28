CREATE TABLE "observaciones_diligencia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expediente_id" uuid NOT NULL,
	"codigo" text,
	"descripcion" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expedientes" ADD COLUMN "subsanacion_limite" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "observaciones_diligencia" ADD CONSTRAINT "observaciones_diligencia_expediente_id_expedientes_id_fk" FOREIGN KEY ("expediente_id") REFERENCES "public"."expedientes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "observaciones_diligencia_expediente_id_idx" ON "observaciones_diligencia" USING btree ("expediente_id");