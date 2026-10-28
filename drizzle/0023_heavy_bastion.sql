CREATE TABLE "catalogo_observaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" text NOT NULL,
	"descripcion" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalogo_observaciones_codigo_unique" UNIQUE("codigo")
);

--> statement-breakpoint
INSERT INTO "catalogo_observaciones" ("codigo", "descripcion") VALUES
	('RETIRAR_OBSTACULOS_EVACUACION', 'Retirar obstáculos de los medios de evacuación (pasadizos, escaleras, accesos, salidas).'),
	('COLOCAR_SENALIZACION', 'Colocar señalización de seguridad (salida, zona segura en caso de sismo, riesgo eléctrico, extintores).'),
	('EXTINTORES', 'Instalar, recargar o reubicar extintores.'),
	('TAPAS_TABLEROS_ELECTRICOS', 'Colocar tapas a las aberturas no usadas en los tableros eléctricos.'),
	('TAPA_CAJAS_DE_PASO', 'Colocar tapa a las cajas de paso de conductores eléctricos.'),
	('ILUMINACION_TABLEROS', 'Instalar iluminación general y de emergencia en la zona de los tableros eléctricos.')
ON CONFLICT ("codigo") DO NOTHING;
