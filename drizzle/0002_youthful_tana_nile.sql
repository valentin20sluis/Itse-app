CREATE TYPE "public"."estado_expediente" AS ENUM('BORRADOR', 'PRESENTADO', 'EN_REVISION', 'OBSERVADO_REQUISITOS', 'EN_TRAMITE_EXTERNO', 'INSPECTOR_DESIGNADO', 'DILIGENCIA_PROGRAMADA', 'EN_SUBSANACION', 'CUMPLE', 'NO_CUMPLE', 'CERTIFICADO_PENDIENTE_FIRMA', 'PENDIENTE_RESOLUCION', 'FINALIZADO', 'ENTREGADO', 'DERIVADO_COMERCIALIZACION', 'ANULADO');--> statement-breakpoint
CREATE TYPE "public"."nivel_riesgo" AS ENUM('BAJO', 'MEDIO', 'ALTO', 'MUY_ALTO');--> statement-breakpoint
CREATE TYPE "public"."tipo_documento" AS ENUM('PLANO_UBICACION', 'PLANO_DISTRIBUCION', 'PLAN_SEGURIDAD', 'COMPROBANTE_PAGO', 'POZO_TIERRA', 'EXTINTORES');--> statement-breakpoint
CREATE TYPE "public"."tipo_tramite" AS ENUM('NUEVA', 'RENOVACION');--> statement-breakpoint
CREATE TABLE "expediente_documentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expediente_id" uuid NOT NULL,
	"tipo" "tipo_documento" NOT NULL,
	"file_key" text NOT NULL,
	"nombre_original" text NOT NULL,
	"mime_type" text NOT NULL,
	"tamano_bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expedientes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero" text,
	"usuario_id" uuid NOT NULL,
	"establecimiento_id" uuid NOT NULL,
	"tipo_tramite" "tipo_tramite" NOT NULL,
	"estado" "estado_expediente" DEFAULT 'BORRADOR' NOT NULL,
	"nivel_riesgo" "nivel_riesgo",
	"tiene_sotano" boolean DEFAULT false NOT NULL,
	"almacena_inflamables" boolean DEFAULT false NOT NULL,
	"solicitante_nombre" text,
	"solicitante_documento" text,
	"solicitante_telefono" text,
	"solicitante_email" text,
	"es_representante" boolean DEFAULT false NOT NULL,
	"razon_social" text,
	"numero_boleta" text,
	"declaracion_aceptada_at" timestamp with time zone,
	"presentado_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expedientes_numero_unique" UNIQUE("numero")
);
--> statement-breakpoint
CREATE TABLE "historial_estados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expediente_id" uuid NOT NULL,
	"estado_anterior" "estado_expediente",
	"estado_nuevo" "estado_expediente" NOT NULL,
	"usuario_id" uuid NOT NULL,
	"comentario" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expediente_documentos" ADD CONSTRAINT "expediente_documentos_expediente_id_expedientes_id_fk" FOREIGN KEY ("expediente_id") REFERENCES "public"."expedientes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expedientes" ADD CONSTRAINT "expedientes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expedientes" ADD CONSTRAINT "expedientes_establecimiento_id_establecimientos_id_fk" FOREIGN KEY ("establecimiento_id") REFERENCES "public"."establecimientos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historial_estados" ADD CONSTRAINT "historial_estados_expediente_id_expedientes_id_fk" FOREIGN KEY ("expediente_id") REFERENCES "public"."expedientes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historial_estados" ADD CONSTRAINT "historial_estados_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "expediente_documentos_expediente_tipo_idx" ON "expediente_documentos" USING btree ("expediente_id","tipo");--> statement-breakpoint
CREATE INDEX "expedientes_usuario_id_idx" ON "expedientes" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "expedientes_establecimiento_id_idx" ON "expedientes" USING btree ("establecimiento_id");--> statement-breakpoint
CREATE INDEX "historial_estados_expediente_id_idx" ON "historial_estados" USING btree ("expediente_id");