ALTER TABLE "expedientes" ADD COLUMN "resolucion_no_cumple_numero" text;--> statement-breakpoint
ALTER TABLE "expedientes" ADD COLUMN "resolucion_no_cumple_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "expedientes_resolucion_no_cumple_numero_uidx" ON "expedientes" USING btree ("resolucion_no_cumple_numero");