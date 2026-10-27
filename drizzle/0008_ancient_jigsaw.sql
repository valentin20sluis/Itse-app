ALTER TABLE "establecimientos" ADD COLUMN "numero_camas" integer;--> statement-breakpoint
ALTER TABLE "expedientes" ADD COLUMN "uso_mixto_patrimonio" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "expedientes" ADD COLUMN "gran_escala" boolean DEFAULT false NOT NULL;