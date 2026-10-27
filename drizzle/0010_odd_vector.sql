CREATE TYPE "public"."calidad_solicitante" AS ENUM('PROPIETARIO', 'REPRESENTANTE_LEGAL', 'ADMINISTRADOR');--> statement-breakpoint
ALTER TYPE "public"."tipo_documento" ADD VALUE 'DNI_AMBAS_CARAS';--> statement-breakpoint
ALTER TYPE "public"."tipo_documento" ADD VALUE 'ACREDITACION_REPRESENTACION';--> statement-breakpoint
ALTER TABLE "expedientes" ADD COLUMN "calidad_solicitante" "calidad_solicitante" DEFAULT 'PROPIETARIO' NOT NULL;