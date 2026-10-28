# Configuración de autenticación y roles

## Variables de entorno

Copia `.env.example` a `.env.local` (Next.js carga `.env.local` y `.env`) y completa:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL`
- `DATABASE_URL` (cadena de conexión de Neon)

`drizzle-kit` lee `DATABASE_URL` a través de `drizzle.config.ts`.

## Migraciones

```bash
npm run db:migrate
```

Crea la tabla `usuarios` en la base de datos de Neon.

## Primer superadmin

1. Crea una cuenta desde `/sign-up` (queda como `cliente`).
2. En el dashboard de Clerk: Users → el usuario → Public metadata, y guarda:

   ```json
   { "role": "superadmin" }
   ```

3. Recarga la app: `getOrCreateUser` sincroniza el rol en la tabla `usuarios` y te redirige a `/panel`.

## Seguridad en Server Actions

El layout protege las páginas, pero cada Server Action debe llamar a `requireRole(...)` por su cuenta: las acciones son endpoints públicos y no pasan por el layout.

## Gestión de usuarios

El superadmin administra las cuentas en `/panel/usuarios`: listado con filtros, detalle con historial de cambios (`usuarios_auditoria`), cambio de rol y activar/desactivar. Clerk manda para el rol: el cambio se escribe primero en `publicMetadata.role` y después en `usuarios.rol`. Desactivar solo cambia `usuarios.activo` (el usuario ve `/cuenta-desactivada`). Nadie puede modificar su propia cuenta y siempre queda al menos un superadmin activo. Requiere `CLERK_SECRET_KEY` (solo servidor). Aplica la migración `0021` con `npm run db:migrate`.

## Alta de personal por invitación

Desde «Invitar personal» el superadmin envía una invitación de Clerk; la persona crea su contraseña y entra con rol `admin` (el servidor fija `publicMetadata.role = "admin"`). Para invitar a un jefe adicional, invita primero como admin y luego usa «Cambiar rol».

Prerrequisitos manuales en Clerk:

1. En el dashboard de Clerk, confirmar que **Invitations** está disponible y habilitado (Configure, Restrictions / Sign-up modes, según la versión del dashboard).
2. Definir `NEXT_PUBLIC_APP_URL` (URL pública de la app, sin barra final) y `CLERK_SECRET_KEY` en `.env.local`. La invitación redirige a `${NEXT_PUBLIC_APP_URL}/sign-up`.
3. Probar con un buzón propio: la invitación se envía por correo real. En instancias de desarrollo Clerk limita el envío de correos.

Las invitaciones no se auditan ni se listan en la aplicación; se revisan o revocan en el dashboard de Clerk.
