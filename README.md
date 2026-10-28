# SIGITSE — ITSE App

Sistema web para gestionar el trámite de **Inspección Técnica de Seguridad en Edificaciones (ITSE)** de la oficina de Gestión del Riesgo de Desastres y Defensa Civil (GRDyDC) de una municipalidad distrital del Perú.

**Proyecto académico** (trabajo final de Programación Web Fullstack con IA). No es un sistema oficial; todos los datos son ficticios.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui (Base UI) · Clerk · Neon (PostgreSQL) + Drizzle ORM · UploadThing · Stripe Checkout (modo prueba) · `@react-pdf/renderer` + `qrcode` · Recharts · Zod · Vitest.

## Requisitos

- Node.js 20 o superior y npm.
- Cuentas de desarrollo en Clerk, Neon, UploadThing y Stripe (modo prueba).

## Variables de entorno

Copia `.env.example` a `.env.local` y completa los valores (nunca lo subas a git):

`DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, `STRIPE_SECRET_KEY`, `UPLOADTHING_TOKEN`, `NEXT_PUBLIC_APP_URL`.

## Comandos

```bash
npm install
npm run db:generate   # genera migraciones desde db/schema.ts
npm run db:migrate    # aplica migraciones a Neon
npm run dev           # http://localhost:3000
npm run test          # Vitest
npm run lint
npm run build         # build de producción + chequeo de tipos
```

## Flujo del trámite

1. El cliente registra su establecimiento y crea la solicitud (wizard), sube documentos y paga la tasa con Stripe.
2. El admin revisa el expediente y lo envía a Jefatura; el superadmin lo aprueba.
3. El admin designa inspectores (constancia en PDF), programa la diligencia y registra el resultado; si hay observaciones subsanables, se abre un plazo en días hábiles.
4. Si cumple, se genera el certificado; el superadmin lo aprueba (se emite con QR y Resolución). Si no cumple, Jefatura emite la Resolución de no cumple.
5. El admin envía los documentos y el cliente los descarga en «Mis certificados». Cualquiera puede validar un certificado en `/verificar/[codigo]`.

## Roles

- `cliente`: administrado; gestiona sus establecimientos y solicitudes.
- `admin`: personal de GRDyDC; bandeja, inspectores, diligencias, reportes.
- `superadmin`: jefe de GRDyDC; todo lo anterior, más aprobar expedientes y certificados.

## Estructura

```
app/        rutas (landing, /mi-cuenta, /panel, /verificar, /api)
modules/    dominios: usuarios, establecimientos, expedientes, inspecciones, certificados, reportes, navigation, landing
components/ ui/ (shadcn) y shared/
db/         esquema y cliente de Drizzle (migraciones en drizzle/)
lib/        utilidades transversales
docs/       documentación y specs
```

## Documentación

- [docs/SETUP.md](docs/SETUP.md): estructura, convenciones y metodología (SDD).
- [docs/constitucion-itse.md](docs/constitucion-itse.md): integraciones, seguridad y convenciones del proyecto.
- [docs/reglas-negocio-itse.md](docs/reglas-negocio-itse.md): reglas del dominio ITSE.
- [docs/auth-setup.md](docs/auth-setup.md): configuración de autenticación.
- [docs/specs/](docs/specs/): especificaciones de cada funcionalidad.
