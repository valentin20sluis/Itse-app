CREATE TYPE "public"."rol" AS ENUM('cliente', 'admin', 'superadmin');--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"email" text NOT NULL,
	"nombres" text DEFAULT '' NOT NULL,
	"apellidos" text DEFAULT '' NOT NULL,
	"documento" text,
	"telefono" text,
	"rol" "rol" DEFAULT 'cliente' NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_clerk_id_unique" UNIQUE("clerk_id")
);
