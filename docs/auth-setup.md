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
