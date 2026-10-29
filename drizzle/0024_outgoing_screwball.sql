CREATE TYPE "public"."tipo_itse" AS ENUM('POSTERIOR', 'PREVIA');--> statement-breakpoint
CREATE TABLE "tasas" (
	"tipo_itse" "tipo_itse" PRIMARY KEY NOT NULL,
	"monto_centimos" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tasas_monto_centimos_positivo" CHECK ("tasas"."monto_centimos" > 0)
);
--> statement-breakpoint
ALTER TABLE "expedientes" ADD COLUMN "tasa_monto" integer;--> statement-breakpoint
INSERT INTO "tasas" ("tipo_itse", "monto_centimos") VALUES ('POSTERIOR', 15000), ('PREVIA', 30000)
ON CONFLICT ("tipo_itse") DO NOTHING;
--> statement-breakpoint
UPDATE "expedientes" SET "tasa_monto" = CASE WHEN "nivel_riesgo" IN ('BAJO', 'MEDIO') THEN 15000 ELSE 30000 END
WHERE "stripe_session_id" IS NOT NULL AND "nivel_riesgo" IS NOT NULL;
