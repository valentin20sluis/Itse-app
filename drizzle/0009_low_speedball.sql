ALTER TABLE "expedientes" ADD COLUMN "stripe_session_id" text;--> statement-breakpoint
ALTER TABLE "expedientes" ADD COLUMN "pagado_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "expedientes" ADD CONSTRAINT "expedientes_stripe_session_id_unique" UNIQUE("stripe_session_id");