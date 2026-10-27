ALTER TYPE "public"."tipo_documento" ADD VALUE 'FICHA_RUC';--> statement-breakpoint
ALTER TYPE "public"."tipo_documento" ADD VALUE 'EXTINTORES_PQS';--> statement-breakpoint
ALTER TYPE "public"."tipo_documento" ADD VALUE 'EXTINTORES_TIPO_K';--> statement-breakpoint
ALTER TYPE "public"."tipo_documento" ADD VALUE 'CAPACITACION_EXTINTORES';--> statement-breakpoint
ALTER TYPE "public"."tipo_documento" ADD VALUE 'LICENCIA_OSINERGMIN';--> statement-breakpoint
ALTER TYPE "public"."tipo_documento" ADD VALUE 'PLANO_ARQUITECTURA_AFORO';--> statement-breakpoint
ALTER TYPE "public"."tipo_documento" ADD VALUE 'PLANOS_ELECTRICOS';--> statement-breakpoint
ALTER TYPE "public"."tipo_documento" ADD VALUE 'MEMORIA_PRUEBAS_EQUIPOS';--> statement-breakpoint
ALTER TABLE "expedientes" ADD COLUMN "tiene_cocina" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "expedientes" ADD COLUMN "es_grifo" boolean DEFAULT false NOT NULL;