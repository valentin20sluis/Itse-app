ALTER TABLE "certificados" ADD COLUMN "resolucion_numero" text;--> statement-breakpoint
ALTER TABLE "certificados" ADD COLUMN "resolucion_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "certificados_resolucion_numero_uidx" ON "certificados" USING btree ("resolucion_numero");