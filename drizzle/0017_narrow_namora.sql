ALTER TYPE "public"."tipo_documento" ADD VALUE 'SUBSANACION_DECLARACION_JURADA';--> statement-breakpoint
ALTER TYPE "public"."tipo_documento" ADD VALUE 'SUBSANACION_PANEL_FOTOGRAFICO';--> statement-breakpoint
ALTER TABLE "expedientes" ADD COLUMN "subsanacion_presentada_at" timestamp with time zone;