# Usuarios: cambiar rol y activar/desactivar

Estado: approved

## Objetivo
El `superadmin` puede cambiar el rol de un usuario (`cliente`, `admin`, `superadmin`) y activarlo o desactivarlo desde `/panel/usuarios`, con confirmación, guardas contra quedarse sin jefe o auto-bloquearse, y rastro en la auditoría. Mantiene consistentes el rol de Clerk (`publicMetadata.role`) y `usuarios.rol`. Depende de `docs/specs/usuarios-listado-detalle.md` (tabla `usuarios_auditoria`, servicio de lectura, listado y detalle ya implementados).

## Fuera de alcance
- Alta de personal por invitación (`usuarios-invitar-personal`).
- Editar nombre, correo, documento o teléfono; eliminar usuarios; cerrar sesiones remotas; recuperar contraseñas; correo/SMS.
- Webhooks de Clerk (decisión previa del proyecto: no hay).
- Registrar en auditoría los intentos rechazados por guardas (solo cambios efectivos).

## Decisiones de diseño
- **Fuente de verdad del rol: Clerk.** `getOrCreateUser()` lee `publicMetadata.role` con `currentUser()` (consulta a la API de Clerk, no un JWT en caché) y sobrescribe `usuarios.rol` en cada acceso. Por eso el cambio surte efecto en la siguiente petición del usuario afectado, y cualquier desfase en `usuarios.rol` se auto-corrige en su próximo acceso.
- **Orden de operaciones para `cambiarRol`** (Clerk primero, porque es lo que manda):
  1. `requireRole("superadmin")` (acción) y `assertSuperadmin` (servicio).
  2. Releer al usuario destino desde la BD por `id` (nunca confiar en `rol`, `clerkId` ni `activo` enviados por el cliente); inexistente → «No se encontró el usuario.».
  3. Guardas puras (`guardas-usuarios.ts`): no sobre uno mismo; no al mismo rol; no dejar cero superadmins activos.
  4. `clerkClient().users.updateUserMetadata(clerkId, { publicMetadata: { role } })` (SDK `@clerk/backend` 3.x ya usado por `user.service.ts`; hace merge de metadata, no pisa otras claves). **Si falla: se devuelve error y no se toca la BD ni la auditoría.**
  5. `UPDATE usuarios SET rol, updated_at WHERE id = ? AND rol = <rol leído>` y, si el rol anterior es `superadmin`, además `AND (SELECT count(*) FROM usuarios WHERE rol='superadmin' AND activo) > 1` (una sola sentencia, atómica: protege el invariante ante dos superadmins que se degraden a la vez). **Si afecta 0 filas o lanza: se restaura en Clerk el rol anterior (mejor esfuerzo) y se devuelve error** («Otra persona hizo un cambio al mismo tiempo. Actualiza la página e inténtalo de nuevo.» / error genérico).
  6. Insertar fila en `usuarios_auditoria` (`CAMBIO_ROL`, anterior, nuevo, actor). Si falla: se registra con `console.error` sin datos personales y **el cambio se mantiene** (ok); límite aceptado: sin transacción en el driver `neon-http` entre update e inserción, se prefiere no deshacer un cambio de permisos ya efectivo.
  - Si la restauración en Clerk también falla (caso doble fallo): mensaje «El cambio no se completó del todo. Revisa el rol del usuario.»; no queda inconsistencia permanente porque la próxima vez que el afectado entre, `getOrCreateUser` copia a la BD el rol que Clerk tenga.
- **`setActivo` solo usa BD** (`usuarios.activo`), sin llamar a Clerk. Justificación: `requireRole`, las Route Handlers y UploadThing ya rechazan inactivos en cada petición (verificado en `authorization.service.ts`, `app/post-login`, y los `route.ts` de `app/api/**` y `app/mi-cuenta/pago/confirmar`), así que el efecto es inmediato; bloquear en Clerk (`banUser`) añadiría una segunda escritura que puede fallar a medias, impediría ver la pantalla `/cuenta-desactivada` que explica qué pasó, y exige un cierre de sesión que Clerk no garantiza al instante. Misma atomicidad: `UPDATE ... WHERE id AND activo = <leído>` con la guarda del último superadmin activo; luego auditoría (`ACTIVACION`/`DESACTIVACION`) con la misma política del paso 6.
- **Guardas** (puras, con test): (a) el actor no puede cambiar su propio rol ni desactivarse; (b) siempre queda ≥1 superadmin activo (bloquea degradar o desactivar al último; con la guarda (a) solo se alcanza por concurrencia, se mantiene como defensa y por la sentencia atómica); (c) no-op (mismo rol / mismo estado) se rechaza con mensaje claro.
- **Confirmación:** `AlertDialog` en cambio de rol (selector de rol destino con aviso de lo que implica: «Admin gestiona expedientes», «Jefe GRDyDC tiene todos los permisos») y en desactivación. Reactivar no requiere confirmación (es reversible y sin riesgo).
- **Sin control de interfaz para uno mismo:** la fila del propio superadmin muestra los botones deshabilitados con texto «No puedes modificar tu propia cuenta». Es solo UX; la seguridad está en servidor (el dato `esActual` lo calcula el servicio de lectura).
- **IDOR:** el `id` es un uuid de `usuarios.id` validado con `z.uuid()`; el recurso no pertenece a nadie, el control es el rol `superadmin` del actor. No se acepta `clerkId` desde el cliente.
- **Server Actions** siguen el patrón de `inspector.actions.ts`: `requireRole` → zod → servicio → `revalidatePath("/panel/usuarios")` y `/panel/usuarios/<id>` → `ActionResult`. Mensajes en español sin términos técnicos.

## Reutilización
- Existente que se reutiliza: `requireRole`; `ActionResult` (`lib/action-result.ts`); `roleSchema`; `ROLE_LABELS`; `AlertDialog` (`components/ui/alert-dialog.tsx`); patrón de `ToggleInspectorDialog.tsx` (confirmación con `useTransition`, error en `role="alert"`) y de `setInspectorActivoAction`; `UsuarioBadges`, `UsuariosView`, `UsuarioDetalleView`, `usuario-admin.service.ts` y `usuarios_auditoria` de la spec anterior; `clerkClient` de `@clerk/nextjs/server` (mismo uso que `user.service.ts`).
- Existente que se extiende: `modules/usuarios/components/UsuariosView.tsx` y `UsuarioDetalleView.tsx` (se agregan las acciones); `modules/usuarios/services/user.service.test.ts` (un caso nuevo: la sincronización de `getOrCreateUser` no modifica `activo`).
- Nuevo (y por qué): `guardas-usuarios.ts` (reglas puras testeables, constitución §3: reglas fuera de componentes); `usuario-gestion.service.ts` (escrituras con Clerk, separado de las lecturas por SRP); `usuario.actions.ts`; diálogos de confirmación (no existe uno genérico de cambio de rol).
- Dependencias / componentes shadcn a instalar antes de implementar: ninguno. Prerrequisito: `CLERK_SECRET_KEY` ya configurada en `.env.local` (existente; solo servidor, no `NEXT_PUBLIC_*`).
- Migraciones: ninguna (usa la `0021` de la spec anterior).

## Specs afectadas
- `docs/specs/usuarios-listado-detalle.md`: T2 expone `esActual: boolean` en `UsuarioListItem`/`UsuarioDetalle` (calculado en servidor con el actor) y T4 deja el slot `acciones`. Ya incluido en esa spec.
- `docs/specs/auth-roles.md`: sin cambios; esta spec solo agrega el caso de no modificar `activo` en la sincronización.

## Criterios de aceptación
- AC-1 (autorización por acción): `cambiarRolAction` y `setUsuarioActivoAction` llaman `requireRole("superadmin")` antes de cualquier lectura o escritura; con `admin`, `cliente`, inactivo o sin sesión, `requireRole` redirige (lanza en el test) y no se invoca servicio ni Clerk. Tests de acción.
- AC-2 (autorización en servicio): `cambiarRol` y `setActivo` lanzan si el actor no es `superadmin` y no llaman a Clerk ni a la BD. Tests de servicio.
- AC-3 (validación/IDOR): `id` no uuid → «No se encontró el usuario.»; `rol` fuera de `cliente|admin|superadmin` o `activo` no booleano → error de validación sin llamar al servicio; el servicio relee al usuario por `id` y usa el `clerkId` de la BD; un `id` inexistente no llama a Clerk. Tests.
- AC-4 (auto-modificación): si `id` es el del actor, tanto cambiar rol como desactivar devuelven error «No puedes modificar tu propia cuenta.» sin llamar a Clerk ni escribir en BD. Test en guardas y en servicio.
- AC-5 (último superadmin): con un único superadmin activo, degradar o desactivar a ese usuario (cuando no es el actor, por concurrencia) devuelve «Debe quedar al menos un jefe activo.»; la sentencia SQL incluye la condición de conteo (test: el `where` del update contiene la guarda y el caso de 0 filas se trata como conflicto). Desactivar a un superadmin cuando hay otro activo sí procede.
- AC-6 (consistencia, orden): en un cambio de rol exitoso, `updateUserMetadata` se llama una vez con `{ publicMetadata: { role: <nuevo> } }` **antes** del update de BD, y después se inserta la auditoría. Test de orden de llamadas con Clerk y `@/db` mockeados.
- AC-7 (fallo de Clerk): si `updateUserMetadata` rechaza, el resultado es `{ ok: false, error }` con mensaje claro, no hay update de BD ni auditoría. Test.
- AC-8 (fallo de BD tras Clerk): si el update de BD lanza o afecta 0 filas, se llama de nuevo a `updateUserMetadata` con el rol anterior y se devuelve error; si esa restauración también falla, el mensaje es «El cambio no se completó del todo. Revisa el rol del usuario.». Tests de ambos casos.
- AC-9 (auditoría): un cambio efectivo inserta una fila con `actorId` = actor, `usuarioId` = destino, acción correcta y valores anterior/nuevo (`admin`, `activo`…); nunca incluye `clerkId`, correo ni tokens. Si la inserción falla el resultado sigue siendo `ok: true` y se registra el error. Tests.
- AC-10 (desactivación efectiva): `setActivo` no llama a Clerk. Verificación de lectura por el reviewer: `requireRole` redirige a `/cuenta-desactivada` a un inactivo, `getOrCreateUser` no modifica `activo` al sincronizar (nuevo caso en `user.service.test.ts`) y todos los `route.ts` de `app/api/**` y `app/mi-cuenta/pago/confirmar/route.ts` rechazan o redirigen inactivos. El reviewer deja constancia del grep.
- AC-11 (UI): botones «Cambiar rol» y «Desactivar»/«Reactivar» en cada fila/tarjeta y en el detalle, de al menos 44 px de alto (`h-11`), con `aria-label` que nombra al usuario. Cambiar rol y desactivar abren un `AlertDialog` con título de pregunta, descripción del efecto, botón «Cancelar» y botón de confirmación (destructivo en desactivar) que muestra «…ando» mientras corre; el error de la acción aparece en `role="alert"` dentro del diálogo y el diálogo no se cierra. En la fila propia los botones están deshabilitados con el texto «No puedes modificar tu propia cuenta». Foco gestionado por `AlertDialog`; operable con teclado. Sin desborde a 360/768/1280 px (manual).
- AC-12 (retroalimentación): tras un éxito el diálogo se cierra y la lista/detalle muestran el valor nuevo (`revalidatePath`), incluida la nueva fila de auditoría en el detalle.
- AC-13: textos en español sin términos técnicos; solo tokens del tema; `NEXT_PUBLIC_*` sin secretos (grep de `CLERK_SECRET_KEY` solo en código de servidor, nunca en archivos con `"use client"`). `npm run build`, `npm run lint` y `npx vitest run` pasan.

## Tareas
### T1 — Reglas puras y schemas de entrada
- Archivos: `modules/usuarios/utils/guardas-usuarios.ts` (crear), `modules/usuarios/utils/guardas-usuarios.test.ts` (crear), `modules/usuarios/schemas/usuario-gestion.schema.ts` (crear), `modules/usuarios/schemas/usuario-gestion.schema.test.ts` (crear)
- Depende de: ninguna (spec anterior implementada)
- Grupo paralelo: G1
- Cubre: AC-3, AC-4, AC-5
- Detalle: `evaluarCambioRol({ actorId, destino: { id, rol, activo }, nuevoRol, superadminsActivos })` y `evaluarCambioEstado({ actorId, destino, nuevoActivo, superadminsActivos })` devuelven `{ ok: true } | { ok: false; error: string }` con los mensajes de AC-4/AC-5 y el de no-op («Ya tiene ese rol.» / «Ya está activo/inactivo.»). Schemas zod v4: `cambiarRolSchema` (`id: z.uuid()`, `rol: roleSchema`) y `cambiarEstadoSchema` (`id`, `activo: z.boolean()`).
- Tests: guardas — propio, mismo valor, último superadmin (degradar y desactivar), con dos superadmins procede, degradar a `cliente`/`admin`, usuario inactivo no cuenta como superadmin activo; schemas — válidos e inválidos (id no uuid, rol desconocido, `activo` string).
- [x] Completada

### T2 — Servicio de escritura con Clerk
- Archivos: `modules/usuarios/services/usuario-gestion.service.ts` (crear), `modules/usuarios/services/usuario-gestion.service.test.ts` (crear), `modules/usuarios/services/user.service.test.ts` (modificar: un caso)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-2, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10 (parte de test)
- Detalle: `cambiarRol(actor, id, nuevoRol)` y `setActivo(actor, id, activo)` devuelven un resultado tipado `{ ok: true; data: { id; rol; activo } } | { ok: false; error: string }` (los casos esperados no lanzan; solo falla de autorización lanza). Implementan exactamente el orden de «Decisiones de diseño». Conteo de superadmins activos con `count(*)`. `setActivo` no importa `clerkClient`.
- Tests: Clerk (`clerkClient`) y `@/db` mockeados; cubren AC-2 (actor `admin`/`cliente`), AC-4, AC-5 (incluye 0 filas), AC-6 (orden por `mock.invocationCallOrder`), AC-7, AC-8 (restauración y doble fallo), AC-9 (campos de auditoría, fallo de auditoría no revierte), `setActivo` sin llamadas a Clerk, destino inexistente sin llamada a Clerk. Caso nuevo en `user.service.test.ts`: el `set` del `onConflictDoUpdate` no incluye `activo`.
- [x] Completada

### T3 — Server Actions
- Archivos: `modules/usuarios/actions/usuario.actions.ts` (crear), `modules/usuarios/actions/usuario.actions.test.ts` (crear)
- Depende de: T2
- Grupo paralelo: G3
- Cubre: AC-1, AC-3, AC-12 (revalidación)
- Detalle: `"use server"`; `cambiarRolAction(id: string, rol: string)` y `setUsuarioActivoAction(id: string, activo: boolean)` → `Promise<ActionResult<{ id: string; rol: Role; activo: boolean }>>`. Orden: `requireRole("superadmin")` → zod → servicio → `revalidatePath("/panel/usuarios")` y `revalidatePath(\`/panel/usuarios/${id}\`)` → resultado. Excepción inesperada → «No se pudo guardar el cambio. Inténtalo de nuevo.»
- Tests: `requireRole` mockeado (rechaza → no llama servicio); validación inválida no llama servicio; éxito revalida ambas rutas; error del servicio se propaga sin revalidar.
- [x] Completada

### T4 — Interfaz de acciones con confirmación
- Archivos: `modules/usuarios/components/UsuarioAcciones.tsx` (crear), `modules/usuarios/components/CambiarRolDialog.tsx` (crear), `modules/usuarios/components/UsuarioAcciones.test.tsx` (crear), `modules/usuarios/components/UsuariosView.tsx` (modificar), `modules/usuarios/components/UsuarioDetalleView.tsx` (modificar)
- Depende de: T3
- Grupo paralelo: G4
- Cubre: AC-4 (UX), AC-11, AC-12, AC-13
- Detalle: `UsuarioAcciones({ usuario })` (`"use client"`) recibe `{ id, nombre, rol, activo, esActual }`, renderiza los botones y el `AlertDialog` de desactivación (patrón `ToggleInspectorDialog`) y delega el cambio de rol a `CambiarRolDialog` (radios nativos con `fieldset`/`legend`, rol actual preseleccionado y deshabilitado como destino). Las vistas solo montan `<UsuarioAcciones>` en la columna de acciones, tarjeta y slot `acciones` del detalle.
- Tests: `UsuarioAcciones.test.tsx` con acciones mockeadas — `esActual` deshabilita botones y muestra el texto; desactivar exige confirmar antes de llamar a la acción; el error se muestra en `role="alert"` y el diálogo sigue abierto; reactivar llama directo; cambiar rol no permite confirmar el rol actual.
- [x] Completada

## Grupos paralelos
G1: T1. G2: T2. G3: T3. G4: T4. (Cadena lineal por contratos: guardas → servicio → acción → UI.)

## Fases siguientes
- Cierre de documentación: actualizar `docs/reglas-negocio-itse.md` §11 (orquestador, al terminar la última spec de usuarios).
