CREATE TABLE "certificados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expediente_id" uuid NOT NULL,
	"numero" text NOT NULL,
	"codigo" text NOT NULL,
	"emitido_at" timestamp with time zone,
	"vence_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "certificados" ADD CONSTRAINT "certificados_expediente_id_expedientes_id_fk" FOREIGN KEY ("expediente_id") REFERENCES "public"."expedientes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "certificados_expediente_id_uidx" ON "certificados" USING btree ("expediente_id");--> statement-breakpoint
CREATE UNIQUE INDEX "certificados_numero_uidx" ON "certificados" USING btree ("numero");--> statement-breakpoint
CREATE UNIQUE INDEX "certificados_codigo_uidx" ON "certificados" USING btree ("codigo");