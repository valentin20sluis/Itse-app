# Autenticación y roles (Clerk + Drizzle/Neon)

Estado: approved

## Objetivo
Dejar funcionando el acceso a SIGITSE: registro e inicio de sesión con Clerk (en español), tabla `usuarios` en Neon sincronizada con el rol de Clerk, protección de rutas por rol y redirección de cada rol a su interfaz (`cliente` → `/mi-cuenta`, `admin`/`superadmin` → `/panel`). Es la primera spec del proyecto; `docs/specs/layouts-por-rol.md` depende de esta (debe estar aprobada e implementada antes).

## Fuera de alcance
- Webhooks de Clerk (Clerk no llega a `localhost`; se usa sincronización al primer acceso, constitución sección 5).
- Gestionar roles o activar/desactivar usuarios desde la app (spec posterior, solo superadmin). Aquí `activo` solo se lee.
- Menús, headers y diseño de `/mi-cuenta` y `/panel` (spec `layouts-por-rol`). Aquí solo existen placeholders mínimos.
- Verificación de roles con claims personalizados del token de sesión (optimización futura, ver "Decisiones").
- Seed de datos, UploadThing, resto de tablas del dominio.

## Hallazgos (estado actual del repo)
- Next.js 16.3.6: el archivo de middleware se llama `proxy.ts` y exporta `proxy` o un default (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`). Ya existe `proxy.ts` con `clerkMiddleware()` sin protección; se extiende.
- `@clerk/nextjs` ^7.9.20 y `@clerk/ui` instalados. `@clerk/localizations` 4.24.1 existe en `node_modules` solo como dependencia transitiva: hay que declararlo como dependencia directa.
- `ClerkProvider` ya envuelve la app en `app/layout.tsx` con el tema `shadcn`. Existen `app/sign-in/[[...sign-in]]/page.tsx` y `app/sign-up/[[...sign-up]]/page.tsx` con `<SignIn />`/`<SignUp />` sin logo ni localización. `SiteHeader` de la landing ya usa `Show`/`UserButton` (no se toca).
- `components/shared/Logo.tsx` existe (se reutiliza). No existen `db/`, `drizzle.config.ts` ni `modules/usuarios/`.
- `.env.example` ya existe; `.env` está ignorado por git. Next carga automáticamente `.env.local` y `.env` (prioridad `.env.local`). `drizzle-kit` no lo hace: `drizzle.config.ts` debe cargarlos con `loadEnvConfig(process.cwd())` de `@next/env` (ya instalado con `next`, sin dependencia nueva; `dotenv` solo sería transitiva). No leer ni imprimir archivos `.env*` con valores.
- Las rutas `/mi-cuenta`, `/panel` y `/verificar/*` vienen de la constitución sección 4 (nombre en español por ser términos del dominio; `docs/SETUP.md` pide inglés para carpetas de ruta, ver pregunta abierta).

## Decisiones de diseño
- **`proxy.ts` solo autentica** (rápido, sin DB, sin leer roles): rutas públicas = `/`, `/sign-in(.*)`, `/sign-up(.*)`, `/verificar(.*)`; el resto exige sesión (`/mi-cuenta`, `/panel`, `/post-login`, `/cuenta-desactivada`); sin sesión redirige a `/sign-in`. No decide por rol: así no se duplica la lógica ni se depende de configurar claims personalizados en el dashboard de Clerk.
- **La autorización por rol es del servidor** (fuente de verdad): los layouts de `/mi-cuenta` y `/panel` llaman `requireRole(...)`, que usa `getOrCreateUser()` (Clerk + tabla `usuarios`). Ceiling conocido: cada render protegido hace una llamada a la API de Clerk (`currentUser()`); se deduplica por request con `React.cache`. Si pesa, migrar a claims de sesión.
- Los layouts no protegen Server Actions ni route handlers: cada Server Action debe llamar `requireRole()` por su cuenta (constitución sección 3).
- **Rol por defecto** `cliente`: un valor ausente o inválido en `publicMetadata.role` se interpreta como `cliente`. Al crear el registro, además se escribe `publicMetadata.role = "cliente"` en Clerk para que quede explícito.
- **Sincronización:** Clerk manda en el rol; en cada `getOrCreateUser()` si el rol de Clerk difiere del de la tabla, se actualiza la tabla. `activo` solo lo controla la tabla.
- **Post-login:** `<SignIn>`/`<SignUp>` usan `forceRedirectUrl="/post-login"`; esa página (Server Component) llama `getOrCreateUser()` y hace `redirect(getHomeForRole(rol))`. También sirve de ruta única "ir a mi casa".
- **Usuario inactivo:** `requireRole()` redirige a `/cuenta-desactivada`. Esa página exige sesión (por `proxy.ts`) pero NO llama `requireRole()` ni redirige por rol, por eso no hay bucle. Ofrece cerrar sesión (`SignOutButton`).
- **Scripts de BD:** `db:generate`, `db:migrate` y `db:studio`. `db:studio` se incluye porque es una línea sin dependencias extra y permite verificar filas de `usuarios` en local.
- **Primer superadmin:** se asigna a mano en el dashboard de Clerk (Users → usuario → Public metadata: `{ "role": "superadmin" }`); en el siguiente acceso `getOrCreateUser()` replica el rol a la tabla. Se documenta en `docs/auth-setup.md`.

## Reutilización
- Existente que se reutiliza: `components/shared/Logo.tsx` (logo en las páginas de acceso); `components/ui/card.tsx` y `components/ui/button.tsx` (página de cuenta desactivada); `lib/utils.ts` (`cn`); `zod` (schema del rol); `ClerkProvider` y tema `shadcn` ya configurados.
- Existente que se extiende: `proxy.ts` (protección de rutas), `app/layout.tsx` (prop `localization`), `app/sign-in/[[...sign-in]]/page.tsx` y `app/sign-up/[[...sign-up]]/page.tsx` (shell con logo, `forceRedirectUrl`), `.env.example` (solo claves faltantes, sin valores), `package.json` (scripts).
- Nuevo (y por qué): `db/` y `drizzle.config.ts` (no hay capa de datos); `modules/usuarios/` (dominio de usuarios, constitución sección 2); `modules/usuarios/components/AuthShell.tsx` (contenedor centrado con logo compartido por sign-in, sign-up y cuenta desactivada; evita repetirlo 3 veces); `app/post-login/`, `app/cuenta-desactivada/`; placeholders de `/mi-cuenta` y `/panel`; `docs/auth-setup.md`.
- Dependencias a instalar antes de implementar (las instala el orquestador una sola vez para no pisar `package.json`/lockfile, T1 solo agrega scripts):
  - `npm install drizzle-orm @neondatabase/serverless @clerk/localizations`
  - `npm install -D drizzle-kit`
  - Componentes shadcn: ninguno.
- Prerrequisitos manuales del usuario: `.env.local` (o `.env`) con claves de Clerk y `DATABASE_URL` de Neon (branch `dev`); `npm run db:migrate` aplicado antes de probar los flujos.

## Criterios de aceptación
- AC-1: `ClerkProvider` recibe `localization={esES}` (de `@clerk/localizations`); los formularios de `/sign-in` y `/sign-up` se muestran en español.
- AC-2: `/sign-in` y `/sign-up` muestran el `Logo` de SIGITSE y el componente de Clerk centrados (vertical y horizontal) sobre un fondo con los tokens del tema, sin desborde horizontal a 360, 768 y 1280 px. Ambas usan `forceRedirectUrl="/post-login"`.
- AC-3: En `proxy.ts`, sin sesión: `/`, `/sign-in`, `/sign-up` y `/verificar/abc` cargan; `/mi-cuenta`, `/panel/x`, `/post-login` y `/cuenta-desactivada` redirigen a `/sign-in`. `proxy.ts` no importa `db/` ni consulta roles.
- AC-4: `db/schema.ts` define `pgEnum` `rol` (`cliente`, `admin`, `superadmin`) y la tabla `usuarios` con columnas SQL `id` (uuid pk, default aleatorio), `clerk_id` (text, único, no nulo), `email` (text, no nulo), `nombres` y `apellidos` (text, no nulos, default `''`), `documento` y `telefono` (text, nulos), `rol` (default `cliente`, no nulo), `activo` (boolean, default `true`), `created_at` y `updated_at` (timestamptz, default `now()`). Los campos Drizzle van en camelCase (`clerkId`, `createdAt`).
- AC-5: Existen `npm run db:generate`, `db:migrate` y `db:studio`; `db:generate` produce la migración SQL en `drizzle/` (versionada) y `drizzle.config.ts` carga `.env.local` y `.env` con `loadEnvConfig`, de modo que los scripts leen `DATABASE_URL` sin exportarla a mano. `.env.example` lista las variables necesarias sin valores reales (grep de claves reales `sk_`, `pk_` y `postgres://usuario:` sin resultados).
- AC-6: `getOrCreateUser()` sin sesión devuelve `null`; con sesión y sin registro, inserta en `usuarios` con `rol = cliente` (o el rol de `publicMetadata.role` si ya existía y es válido), escribe `publicMetadata.role = "cliente"` en Clerk si faltaba, y devuelve el usuario. Es idempotente (insert con `onConflictDoUpdate` por `clerk_id`; dos llamadas no duplican filas) y se deduplica por request con `React.cache`.
- AC-7: Si `publicMetadata.role` de Clerk difiere del `rol` en la tabla, `getOrCreateUser()` actualiza la tabla (y `updated_at`) y devuelve el rol nuevo. Un valor inválido en Clerk se trata como `cliente`.
- AC-8: `getCurrentUser()` devuelve el usuario de la tabla o `null`. `requireRole(...roles)`: sin sesión → `redirect("/sign-in")`; usuario inactivo → `redirect("/cuenta-desactivada")`; rol no permitido → `redirect(getHomeForRole(rol))`; permitido → devuelve el usuario.
- AC-9: `getHomeForRole(rol)` devuelve `/mi-cuenta` para `cliente` y `/panel` para `admin` y `superadmin`. Es una función pura, en `modules/usuarios/utils/`, sin imports de Clerk ni de la BD.
- AC-10: `/post-login` redirige a `getHomeForRole(rol)` del usuario actual; sin sesión, a `/sign-in`; inactivo, a `/cuenta-desactivada`.
- AC-11: `/mi-cuenta` solo permite `cliente` (admin/superadmin → `/panel`); `/panel` solo permite `admin` y `superadmin` (cliente → `/mi-cuenta`). Ambas protegen en su `layout.tsx` con `requireRole`.
- AC-12: `/cuenta-desactivada` muestra un mensaje claro (sin términos técnicos) y un botón para cerrar sesión. No llama `requireRole()` ni hace redirects por rol: un usuario inactivo navega entre `/cuenta-desactivada` y cualquier ruta sin bucle (con `activo = false`, entrar a `/mi-cuenta` lleva a `/cuenta-desactivada` y se queda ahí).
- AC-13: `docs/auth-setup.md` explica: variables de entorno requeridas (Next carga `.env.local` y `.env`; `drizzle-kit` vía `drizzle.config.ts`), aplicar migraciones, y cómo asignar el primer superadmin desde el dashboard de Clerk con `{ "role": "superadmin" }`.
- AC-14 (verificación manual end to end): crear cuenta, cerrar sesión e iniciar sesión funcionan; un usuario nuevo queda con `rol = cliente` en Clerk y en `usuarios` y aterriza en `/mi-cuenta`; al cambiar su rol a `admin` o `superadmin` en Clerk y recargar, entra a `/panel` y la tabla se actualiza; un cliente que escribe `/panel` va a `/mi-cuenta`; un admin que escribe `/mi-cuenta` va a `/panel`.
- AC-15: `npm run build`, `npm run lint` y `npx vitest run` pasan.

## Tareas
### T1 — Base de datos: Drizzle, esquema y scripts
- Archivos: `db/schema.ts` (crear), `db/index.ts` (crear), `drizzle.config.ts` (crear), `package.json` (modificar: solo scripts `db:generate`, `db:migrate`, `db:studio`), `.env.example` (modificar: solo claves faltantes, sin valores) y la migración generada en `drizzle/` (crear con `npm run db:generate`, no cuenta como edición manual)
- Depende de: preparación del orquestador (`drizzle-orm`, `@neondatabase/serverless`, `drizzle-kit`)
- Grupo paralelo: G1
- Cubre: AC-4, AC-5
- Detalle: `db/index.ts` usa `drizzle-orm/neon-http` + `neon()`; si falta `DATABASE_URL` lanza un error claro en español. Exporta `db`. `db/schema.ts` exporta `rolEnum` y `usuarios` (y el tipo inferido `Usuario`).
- Tests: no aplica (configuración y esquema declarativo; verificado con `db:generate` y build, SETUP.md 3.2)
- [x] Completada

### T2 — Lógica pura de roles
- Archivos: `modules/usuarios/schemas/role.schema.ts` (crear), `modules/usuarios/schemas/role.schema.test.ts` (crear), `modules/usuarios/utils/role-routes.ts` (crear), `modules/usuarios/utils/role-routes.test.ts` (crear), `modules/usuarios/types/user.types.ts` (crear)
- Depende de: T1 (reutiliza `rolEnum.enumValues` para el schema)
- Grupo paralelo: G2
- Cubre: AC-7 (parseo de rol inválido), AC-9
- Detalle: `role.schema.ts` exporta `roleSchema = z.enum(rolEnum.enumValues)` y `parseRole(value: unknown): Role` (inválido/ausente → `"cliente"`). `role-routes.ts` exporta `getHomeForRole(rol)`. `user.types.ts` exporta `Role` y `Usuario` (re-export del tipo inferido).
- Tests: `role.schema.test.ts` — roles válidos pasan; `undefined`, `null`, `"root"` y número → `cliente`. `role-routes.test.ts` — `cliente` → `/mi-cuenta`; `admin` y `superadmin` → `/panel`.
- [x] Completada

### T3 — Servicios de usuario y autorización
- Archivos: `modules/usuarios/services/user.service.ts` (crear), `modules/usuarios/services/user.service.test.ts` (crear), `modules/usuarios/services/authorization.service.ts` (crear), `modules/usuarios/services/authorization.service.test.ts` (crear)
- Depende de: T1, T2
- Grupo paralelo: G3
- Cubre: AC-6, AC-7, AC-8
- Detalle: `user.service.ts` exporta `getOrCreateUser()` y `getCurrentUser()` (ambas envueltas con `cache` de React). Usa `auth()`/`currentUser()`/`clerkClient()` de `@clerk/nextjs/server`, `db` y `parseRole`. `authorization.service.ts` exporta `requireRole(...roles)` con `redirect` de `next/navigation` y `getHomeForRole`.
- Tests: con `@clerk/nextjs/server`, `@/db` y `next/navigation` mockeados (`redirect` lanza para cortar el flujo): sin sesión → `null`; usuario nuevo se inserta como `cliente` y se escribe el metadata en Clerk; rol de Clerk distinto al de la tabla se actualiza; segunda llamada no duplica; `requireRole` cubre sin sesión, inactivo, rol no permitido (redirige a `getHomeForRole`) y permitido (devuelve el usuario).
- [x] Completada

### T4 — Proxy, localización y páginas de acceso
- Archivos: `proxy.ts` (modificar), `app/layout.tsx` (modificar: solo `localization={esES}`), `app/sign-in/[[...sign-in]]/page.tsx` (modificar), `app/sign-up/[[...sign-up]]/page.tsx` (modificar), `modules/usuarios/components/AuthShell.tsx` (crear)
- Depende de: preparación del orquestador (`@clerk/localizations`)
- Grupo paralelo: G1
- Cubre: AC-1, AC-2, AC-3
- Detalle: `AuthShell` (Server Component) centra `children` con `Logo` encima en un `min-h-screen` con fondo del tema (tokens, sin colores sueltos). `proxy.ts` usa `createRouteMatcher` con las rutas públicas y `auth.protect()` (o `redirectToSignIn`) para el resto; mantiene el `matcher` actual. Verificar la API de Clerk v7 contra su documentación antes de implementar.
- Tests: no aplica (composición y configuración; AC-3 se verifica manualmente, SETUP.md 3.2)
- [x] Completada

### T5 — Rutas de redirección y cuenta desactivada
- Archivos: `app/post-login/page.tsx` (crear), `app/cuenta-desactivada/page.tsx` (crear)
- Depende de: T3, T4 (`AuthShell`)
- Grupo paralelo: G4
- Cubre: AC-10, AC-12
- Detalle: `post-login` es un Server Component sin UI: llama `requireRole("cliente", "admin", "superadmin")`-equivalente vía `getOrCreateUser()` y redirige por `getHomeForRole`. `cuenta-desactivada` usa `AuthShell`, `Card`, `Button` y `SignOutButton` de Clerk con `redirectUrl="/"`.
- Tests: no aplica (páginas que solo componen servicios ya testeados, SETUP.md 3.2)
- [x] Completada

### T6 — Placeholders de áreas protegidas y documentación
- Archivos: `app/mi-cuenta/layout.tsx` (crear), `app/mi-cuenta/page.tsx` (crear), `app/panel/layout.tsx` (crear), `app/panel/page.tsx` (crear), `docs/auth-setup.md` (crear)
- Depende de: T3
- Grupo paralelo: G4
- Cubre: AC-11, AC-13, AC-14
- Detalle: los layouts hacen `await requireRole("cliente")` y `await requireRole("admin", "superadmin")` y renderizan `children`; las páginas muestran un título provisional ("Mi cuenta" / "Panel") con el nombre del usuario. La spec `layouts-por-rol` reemplaza el contenido de estos cuatro archivos (los modifica, no los recrea).
- Tests: no aplica (la lógica vive en `requireRole`, testeada en T3; SETUP.md 3.2)
- [x] Completada

## Grupos paralelos
G1: T1, T4 (archivos disjuntos). G2: T2. G3: T3. G4: T5, T6 (archivos disjuntos).

## Fases siguientes
- Spec `layouts-por-rol` (depende de esta).
- Gestión de usuarios y cambio de roles desde la app (superadmin), activar/desactivar usuarios.
- Opcional: claims personalizados en el token de Clerk para decidir rol en `proxy.ts` sin llamar a la API.
