CREATE TYPE "public"."accion_usuario" AS ENUM('CAMBIO_ROL', 'ACTIVACION', 'DESACTIVACION');--> statement-breakpoint
CREATE TABLE "usuarios_auditoria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"accion" "accion_usuario" NOT NULL,
	"valor_anterior" text,
	"valor_nuevo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "usuarios_auditoria" ADD CONSTRAINT "usuarios_auditoria_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios_auditoria" ADD CONSTRAINT "usuarios_auditoria_actor_id_usuarios_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "usuarios_auditoria_usuario_created_idx" ON "usuarios_auditoria" USING btree ("usuario_id","created_at");