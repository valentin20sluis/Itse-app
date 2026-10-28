CREATE TABLE "designaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expediente_id" uuid NOT NULL,
	"inspector_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "designaciones" ADD CONSTRAINT "designaciones_expediente_id_expedientes_id_fk" FOREIGN KEY ("expediente_id") REFERENCES "public"."expedientes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "designaciones" ADD CONSTRAINT "designaciones_inspector_id_inspectores_id_fk" FOREIGN KEY ("inspector_id") REFERENCES "public"."inspectores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "designaciones_expediente_inspector_uidx" ON "designaciones" USING btree ("expediente_id","inspector_id");--> statement-breakpoint
CREATE INDEX "designaciones_expediente_id_idx" ON "designaciones" USING btree ("expediente_id");