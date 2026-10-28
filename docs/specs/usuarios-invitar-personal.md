# Usuarios: alta de personal por invitación

Estado: approved

## Objetivo
El `superadmin` crea cuentas de personal (`admin`) enviando una invitación por correo desde Clerk. La persona define su propia contraseña al registrarse; el sistema nunca la ve ni crea cuentas con contraseña. Al aceptar, queda con rol `admin` sin pasos manuales. Depende de `usuarios-listado-detalle` (página y vista) y de `usuarios-gestion-acciones` (comparte `UsuariosView` y `usuario.actions.ts` de la spec anterior; implementarla después de esa).

## Fuera de alcance
- Invitar `superadmin` (solo `admin`; un jefe adicional se logra promoviendo a un usuario ya registrado con «Cambiar rol»).
- Listar, reenviar o revocar invitaciones pendientes (se gestionan en el panel de Clerk).
- Promover a un usuario ya registrado de forma distinta a «Cambiar rol» (ya existe).
- Plantillas de correo propias: el correo lo envía Clerk con su plantilla por defecto.
- Auditoría de invitaciones: la invitación aún no tiene fila en `usuarios` (no hay destino al que referir) y Clerk guarda su propio registro. Límite aceptado; la primera entrada de la persona crea su fila con rol `admin`.

## Decisiones de diseño
- **Mecanismo elegido: invitación de Clerk** (`clerkClient().invitations.createInvitation({ emailAddress, publicMetadata: { role: "admin" }, redirectUrl, ignoreExisting: false })`), API verificada en `node_modules/@clerk/backend/dist/api/endpoints/InvitationApi.d.ts`. Es la opción más simple y segura sin webhooks: Clerk copia `publicMetadata` de la invitación al usuario cuando se registra; la persona elige su contraseña en Clerk; `getOrCreateUser()` (que ya lee `publicMetadata.role`) crea la fila con `rol = admin` en su primer acceso. La alternativa «promover a un usuario ya registrado» ya existe vía «Cambiar rol» y exige que la persona ya haya entrado antes.
- **`redirectUrl`** = `${process.env.NEXT_PUBLIC_APP_URL}/sign-up` (variable ya definida en la constitución §9); la página `/sign-up` usa `<SignUp>` de Clerk, que procesa el ticket de la invitación sin cambios y luego va a `/post-login`.
- **Correo ya registrado en Clerk:** con `ignoreExisting: false` Clerk rechaza; se traduce a «Ese correo ya tiene una cuenta. Si es personal de la oficina, cambia su rol desde la lista de usuarios.». Cualquier otro error de Clerk → «No se pudo enviar la invitación. Inténtalo de nuevo.» (sin exponer el mensaje técnico).
- **Seguridad:** el rol enviado es una constante `"admin"` en servidor; la acción no recibe rol del cliente. Solo se valida el correo con zod (formato, ≤254 caracteres, normalizado a minúsculas y recortado).
- **UI:** botón «Invitar personal» junto al título del listado que abre un `Dialog` (shadcn existente) con un campo de correo; éxito: mensaje «Invitación enviada a <correo>.» y cierre. Sin estado de cliente complejo (`useActionState` como en `InspectorForm`).

## Prerrequisitos manuales (Clerk, los hace el usuario/humano)
1. En el dashboard de Clerk de la instancia de desarrollo, confirmar que **Invitations** está disponible y habilitado (en Configure → Restrictions / Sign-up modes, según la versión del dashboard). Si el registro público está restringido, las invitaciones siguen funcionando; si está abierto, también.
2. Confirmar que `CLERK_SECRET_KEY` está en `.env.local` (ya existe; solo servidor).
3. Probar con un correo propio de prueba (ficticio no sirve: la invitación se envía por correo real; usar un buzón del propio usuario). En instancias de desarrollo Clerk limita el envío de correos; si no llega, el flujo es verificable solo por tests con Clerk mockeado.
No se agregan variables de entorno nuevas (`NEXT_PUBLIC_APP_URL` ya existe en la constitución §9; si falta en `.env.local`, el humano la define).

## Reutilización
- Existente que se reutiliza: `requireRole`; `ActionResult`; `Dialog` (`components/ui/dialog.tsx`), `Input`, `Label`, `Button`; patrón `useActionState` + formulario en diálogo de `modules/inspecciones/components/InspectorForm.tsx` y `crearInspectorAction`; `clerkClient`.
- Existente que se extiende: `modules/usuarios/components/UsuariosView.tsx` (botón en el encabezado); `modules/usuarios/actions/usuario.actions.ts` (se agrega `invitarPersonalAction`).
- Nuevo (y por qué): `invitacion.schema.ts`, `invitacion.service.ts` (acceso a Clerk aislado y testeable), `InvitarPersonalDialog.tsx`.
- Dependencias / componentes shadcn a instalar antes de implementar: ninguno. Migraciones: ninguna.

## Specs afectadas
- `docs/specs/usuarios-gestion-acciones.md`: esta spec modifica `usuario.actions.ts` y `UsuariosView.tsx` creados/modificados allí; por eso va después (dependencia explícita, nunca en paralelo).
- `docs/auth-setup.md`: agregar al terminar una sección «Alta de personal por invitación» con los prerrequisitos de arriba (lo hace T3).

## Criterios de aceptación
- AC-1 (autorización): `invitarPersonalAction` llama `requireRole("superadmin")` antes de validar o llamar a Clerk; `admin`, `cliente`, inactivo o sin sesión redirigen y no se llama al servicio. Test de acción.
- AC-2 (servicio): `invitarPersonal` lanza si el actor no es `superadmin` y no llama a Clerk. Test.
- AC-3 (validación): correo vacío, sin formato o de más de 254 caracteres → error de campo «Escribe un correo válido.»; el correo se guarda recortado y en minúsculas. Tests de schema.
- AC-4 (rol fijo): `createInvitation` se llama con `publicMetadata: { role: "admin" }` y `ignoreExisting: false`, y el `redirectUrl` termina en `/sign-up`; la acción no acepta ningún campo de rol del cliente (un `formData` con `rol=superadmin` no cambia el resultado). Test.
- AC-5 (errores de Clerk): correo ya existente → mensaje específico de AC descrito en el diseño; cualquier otro rechazo → mensaje genérico en español sin texto técnico ni detalles de Clerk; en ambos, `ok: false`. Tests con Clerk mockeado (error con código de duplicado y error genérico).
- AC-6 (secretos): `CLERK_SECRET_KEY` no aparece en ningún archivo con `"use client"` ni en variables `NEXT_PUBLIC_*`; la acción nunca devuelve el objeto de invitación completo (solo `{ email }`).
- AC-7 (UI): «Invitar personal» abre un diálogo con `Label` asociado al campo de correo (`type="email"`, `autoComplete="off"`), botón de enviar `h-11` con estado «Enviando…», error mostrado en `role="alert"` y éxito con mensaje y cierre. Operable con teclado, sin desborde a 360/768/1280 px (manual).
- AC-8 (flujo manual, humano): con los prerrequisitos de Clerk cumplidos, una invitación a un buzón propio llega al correo; al registrarse la persona, entra a `/panel` como «Admin» y aparece en el listado de usuarios. El reviewer deja constancia de si se pudo probar o solo se validó con mocks.
- AC-9: textos en español sin términos técnicos; solo tokens del tema; `docs/auth-setup.md` actualizado. `npm run build`, `npm run lint` y `npx vitest run` pasan.

## Tareas
### T1 — Schema y servicio de invitación
- Archivos: `modules/usuarios/schemas/invitacion.schema.ts` (crear), `modules/usuarios/schemas/invitacion.schema.test.ts` (crear), `modules/usuarios/services/invitacion.service.ts` (crear), `modules/usuarios/services/invitacion.service.test.ts` (crear)
- Depende de: ninguna (specs anteriores implementadas)
- Grupo paralelo: G1
- Cubre: AC-2, AC-3, AC-4, AC-5, AC-6 (parte)
- Detalle: `invitarSchema = z.object({ email: z.email().max(254) })` con `trim` y `toLowerCase` previos (verificar la API de zod v4). `invitarPersonal(actor, email)` → `{ ok: true; data: { email } } | { ok: false; error: string }`; `assertSuperadmin`; el `redirectUrl` se arma con `NEXT_PUBLIC_APP_URL` (si falta, error genérico, sin fallback a un dominio inventado). Detecta duplicado mirando el código de error del `ClerkAPIResponseError` (`form_identifier_exists` u equivalente: verificar en `@clerk/backend`).
- Tests: schema válidos/ inválidos y normalización; servicio con `clerkClient` mockeado — actor no superadmin, llamada con `role: "admin"`, `ignoreExisting: false` y `redirectUrl`, duplicado, error genérico, `NEXT_PUBLIC_APP_URL` ausente.
- [x] Completada

### T2 — Acción
- Archivos: `modules/usuarios/actions/usuario.actions.ts` (modificar), `modules/usuarios/actions/usuario.actions.test.ts` (modificar)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-1, AC-3, AC-4, AC-6
- Detalle: `invitarPersonalAction(_prev, formData)` con firma de `useActionState`: `requireRole("superadmin")` → parse zod (solo `email`) → servicio → `ActionResult<{ email: string }>` con `fieldErrors` en caso de validación. No necesita `revalidatePath` (no hay fila nueva todavía).
- Tests: casos de AC-1, validación con `fieldErrors`, el campo `rol` en `formData` se ignora, éxito devuelve solo `{ email }`.
- [x] Completada

### T3 — Diálogo, botón y documentación
- Archivos: `modules/usuarios/components/InvitarPersonalDialog.tsx` (crear), `modules/usuarios/components/InvitarPersonalDialog.test.tsx` (crear), `modules/usuarios/components/UsuariosView.tsx` (modificar), `docs/auth-setup.md` (modificar)
- Depende de: T2
- Grupo paralelo: G3
- Cubre: AC-7, AC-8, AC-9
- Detalle: `"use client"`, `useActionState(invitarPersonalAction, null)`; copia el patrón de `InspectorForm.tsx` (apertura/cierre y reinicio con `key`). `UsuariosView` monta el botón en el encabezado (como «Nuevo inspector»). `docs/auth-setup.md` documenta los prerrequisitos manuales de Clerk.
- Tests: `InvitarPersonalDialog.test.tsx` con la acción mockeada — muestra error de campo y error general en `role="alert"`; éxito muestra el mensaje con el correo; el campo tiene label accesible.
- [x] Completada

## Grupos paralelos
G1: T1. G2: T2. G3: T3. (Cadena lineal; sin tareas paralelas por dependencia de contratos y archivos compartidos.)

## Fases siguientes
- Listar y revocar invitaciones pendientes (hoy se hace en el dashboard de Clerk).
