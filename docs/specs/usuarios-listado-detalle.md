# Usuarios: listado, detalle y auditoría (solo lectura)

Estado: approved

## Objetivo
El jefe de GRDyDC (`superadmin`) necesita ver quiénes usan el sistema: listar usuarios con búsqueda, filtros y paginación, y abrir un detalle de solo lectura con su rol, estado, fecha de alta, cuántos expedientes presentó y quién cambió qué sobre esa cuenta. Es la fase 1 de «Gestionar usuarios y roles» (`docs/reglas-negocio-itse.md` §11, hoy «Próximamente»). Los cambios (rol, estado, alta de personal) van en `usuarios-gestion-acciones` y `usuarios-invitar-personal`.

## Fuera de alcance
- Cambiar rol, activar/desactivar, invitar (specs `usuarios-gestion-acciones` y `usuarios-invitar-personal`).
- «Configuración» (otra spec), perfil del cliente, recuperación de contraseña, eliminación física de usuarios, correo/SMS.
- Listar invitaciones pendientes o usuarios de Clerk que nunca entraron al sistema (no tienen fila en `usuarios`; no hay webhooks).
- Ordenamiento configurable (orden fijo: apellidos, nombres).

## Decisiones de diseño
- **Lecturas en Server Components**, sin React Query. Filtros y página viajan en la URL (`/panel/usuarios?q=&rol=&estado=&pagina=`) con un `<form method="get">` nativo: funciona sin JS, es enlazable y no necesita estado de cliente.
- **Paginación simple** de 10 por página con enlaces «Anterior / Siguiente» y «Página X de Y». Total con `count(*)` sobre el mismo filtro.
- **Búsqueda** `ilike` sobre nombres, apellidos y correo, escapando `%`, `_` y `\` del texto del usuario; máximo 100 caracteres.
- **Datos expuestos:** la lista solo lleva nombre completo, correo, rol, estado y fecha de alta. El detalle agrega documento y teléfono (el superadmin necesita identificar a la persona). `clerkId` **nunca** sale del servidor: el DTO `UsuarioListItem` / `UsuarioDetalle` no lo incluye; las acciones futuras lo releen de la BD por `id`.
- **Detalle como ruta** `/panel/usuarios/[id]` (enlazable, sin diálogo con estado). `id` es el uuid de `usuarios.id`; si no es uuid o no existe → `notFound()`.
- **Auditoría:** tabla simple `usuarios_auditoria` (una fila por cambio: quién, a quién, qué, valor anterior y nuevo, cuándo). Se crea aquí para que la lectura exista antes que las escrituras; sin secretos, solo valores `cliente|admin|superadmin` o `activo|inactivo`.
- **Conteos del detalle (baratos):** «Expedientes presentados» = expedientes del usuario con `estado <> 'BORRADOR'` y «Establecimientos registrados». Solo se muestran si el usuario es `cliente`.
- La página real `app/panel/usuarios/page.tsx` toma prioridad sobre `app/panel/[section]/page.tsx` (ya documentado en `layouts-por-rol`).

## Reutilización
- Existente que se reutiliza: `requireRole` (`modules/usuarios/services/authorization.service.ts`); `PageHeader`, `EmptyState` (`components/shared/`); `Table`, `Card`, `Badge`, `Button`, `Input`, `Label` (`components/ui/`); `ROLE_LABELS` (`modules/navigation/constants/role-labels.ts`); `roleSchema` (`modules/usuarios/schemas/role.schema.ts`); `ActionResult` no se usa aquí; patrón de tabla `md+` / tarjetas móvil de `modules/inspecciones/components/InspectoresView.tsx`; ítem «Usuarios» ya existe en `nav-items.ts`.
- Existente que se extiende: `db/schema.ts` (tabla nueva y enum nuevo, sin tocar `usuarios`).
- Nuevo (y por qué): `usuarios_auditoria` (no hay tabla de auditoría de cuentas; `historial_estados` es de expedientes); `usuario-admin.service.ts` (el `user.service.ts` actual es de sesión propia, no de gestión; archivo separado para no mezclar responsabilidades).
- Dependencias / componentes shadcn a instalar antes de implementar: ninguno. El filtro de rol y estado usa `<select>` nativo con clases de tokens (no existe `select` en `components/ui/` y no justifica instalarlo).
- Migración: la siguiente libre es `0021` (verificado: existen `0000`..`0020`). Se genera con `npm run db:generate`; el nombre de archivo lo asigna drizzle-kit (`drizzle/0021_*.sql`) y el orquestador/humano aplica `npm run db:migrate`.

## Specs afectadas
- `docs/specs/layouts-por-rol.md`: la fase siguiente «Gestión de usuarios y roles en `/panel/usuarios`» se cumple entre esta spec y las dos siguientes. No requiere cambios.
- `docs/reglas-negocio-itse.md` §11: tras implementar las tres specs se actualiza la fila «Gestionar usuarios y roles» (quitar «Próximamente») y la nota de `usuarios.activo`. Lo hace el orquestador al cerrar la última spec.

## Criterios de aceptación
- AC-1 (autorización): `/panel/usuarios` y `/panel/usuarios/[id]` llaman `requireRole("superadmin")` por sí mismas, antes de leer datos. Un `admin` es redirigido a `/panel`, un `cliente` a `/mi-cuenta`, un inactivo a `/cuenta-desactivada`, sin sesión a `/sign-in`. Verificado con test de página (`requireRole` mockeado).
- AC-2 (autorización en servicio): cada función de `usuario-admin.service.ts` rechaza (lanza error) si el actor no es `superadmin`, aunque la página ya haya validado (defensa en profundidad). Test por función con actor `admin` y `cliente`.
- AC-3 (listado): devuelve 10 usuarios por página ordenados por apellidos y nombres, más el total; `pagina` fuera de rango o inválida se normaliza a 1 (o a la última), nunca falla.
- AC-4 (filtros): `q` filtra por nombre, apellido o correo sin distinguir mayúsculas; `rol` y `estado` (`activo|inactivo`) se combinan con `q` (AND); valores inválidos en la URL se ignoran. Un `q` con `%` o `_` se trata como texto literal (test).
- AC-5 (datos mínimos): ningún objeto devuelto por el servicio ni pasado a un componente cliente contiene `clerkId`; la lista no contiene `documento` ni `telefono`. Test del servicio comprueba las claves exactas.
- AC-6 (UI listado): desde `md` (768 px) se muestra tabla con encabezados `scope="col"` y `TableCaption` `sr-only`; bajo `md`, tarjetas. Hay formulario de búsqueda con `Label` visibles o `sr-only`, selects de rol y estado y botón «Buscar», más enlace «Limpiar» cuando hay filtros. Sin resultados: `EmptyState` con texto distinto para «no hay usuarios con esos filtros». Sin desborde horizontal a 360, 768 y 1280 px (verificación manual del reviewer).
- AC-7 (detalle): muestra nombre, correo, documento, teléfono («—» si falta), rol (etiqueta de `ROLE_LABELS`), estado (Badge), fecha de alta `dd/MM/yyyy` (America/Lima), y para `cliente` «Expedientes presentados» y «Establecimientos registrados». `id` no uuid o inexistente → `notFound()` (IDOR: el id es solo un identificador; el acceso depende del rol del actor, no del id).
- AC-8 (auditoría lectura): el detalle lista los últimos 20 cambios de `usuarios_auditoria` del usuario (más reciente primero) con texto en español («Rol: Admin → Jefe GRDyDC», «Cuenta desactivada»), nombre de quien lo hizo y fecha `dd/MM/yyyy HH:mm`. Sin cambios: texto «Sin cambios registrados». No se muestra ningún identificador técnico.
- AC-9 (BD): migración `0021` crea `usuarios_auditoria` con FK `restrict` a `usuarios` (usuario y actor), enum de acción, índice por `(usuario_id, created_at)`; no altera `usuarios`. `npm run build` valida tipos.
- AC-10: Todo texto en español sin términos técnicos; colores solo con tokens del tema (grep de `#[0-9a-f]{3,6}` y `oklch(` sin resultados en los archivos nuevos). `npm run build`, `npm run lint` y `npx vitest run` pasan.

## Tareas
### T1 — Tabla de auditoría y migración
- Archivos: `db/schema.ts` (modificar), `drizzle/0021_*.sql` (crear, generado), `drizzle/meta/0021_snapshot.json` (crear, generado), `drizzle/meta/_journal.json` (modificar, generado)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-9
- Detalle: `accionUsuarioEnum = pgEnum("accion_usuario", ["CAMBIO_ROL", "ACTIVACION", "DESACTIVACION"])`; tabla `usuarios_auditoria` (`id` uuid pk, `usuarioId` uuid not null → `usuarios.id` restrict, `actorId` uuid not null → `usuarios.id` restrict, `accion`, `valorAnterior` text null, `valorNuevo` text null, `createdAt` timestamptz default now). Exportar tipo `UsuarioAuditoria`. Generar con `npm run db:generate`, sin editar el SQL a mano.
- Tests: no aplica (esquema declarativo; el servicio lo ejercita en T2)
- [x] Completada

### T2 — Servicio de lectura y filtros (con tests)
- Archivos: `modules/usuarios/types/usuario-admin.types.ts` (crear), `modules/usuarios/schemas/usuario-filtros.schema.ts` (crear), `modules/usuarios/schemas/usuario-filtros.schema.test.ts` (crear), `modules/usuarios/services/usuario-admin.service.ts` (crear), `modules/usuarios/services/usuario-admin.service.test.ts` (crear)
- Depende de: T1 (tabla de auditoría)
- Grupo paralelo: G2
- Cubre: AC-2, AC-3, AC-4, AC-5, AC-8 (datos)
- Detalle: el schema zod v4 parsea `searchParams` (`q` recortado y ≤100, `rol` con `roleSchema`, `estado` `activo|inactivo`, `pagina` entero ≥1) usando `.catch`/`safeParse` para ignorar valores inválidos. Servicio: `listUsuarios(actor, filtros)` → `{ items, total, pagina, totalPaginas }`; `getUsuarioDetalle(actor, id)` → detalle + conteos (si `cliente`) + auditoría (con nombre del actor, vía join) o `null`. Ambas llaman un `assertSuperadmin(actor)` local (patrón `assertPersonal` de `inspector.service.ts`). `escapeLike` como función pura exportada en el mismo archivo. Tipos `UsuarioListItem`, `UsuarioDetalle`, `AuditoriaItem` sin `clerkId`, ambos con `esActual: boolean` (`usuario.id === actor.id`, calculado en servidor para que la spec de acciones deshabilite los controles del propio superadmin).
- Tests: schema — válidos, `pagina=0/abc` → 1, `rol=otro` ignorado, `q` largo recortado/rechazado. Servicio con `@/db` mockeado: actor `admin`/`cliente` lanza; claves exactas sin `clerkId`/`documento`/`telefono` en lista; `escapeLike("50%_x")`; detalle inexistente → `null`; conteos solo para `cliente`.
- [x] Completada

### T3 — Página y vista del listado
- Archivos: `app/panel/usuarios/page.tsx` (crear), `app/panel/usuarios/page.test.tsx` (crear), `modules/usuarios/components/UsuariosView.tsx` (crear), `modules/usuarios/components/UsuariosFiltros.tsx` (crear), `modules/usuarios/components/UsuarioBadges.tsx` (crear)
- Depende de: T2
- Grupo paralelo: G3
- Cubre: AC-1, AC-6, AC-10
- Detalle: `page.tsx` (Server, `await searchParams`) → `requireRole("superadmin")` → `listUsuarios` → `UsuariosView`. `UsuariosFiltros` es Server Component con `<form method="get">`, `<select>` nativos con tokens, `h-11` táctil. `UsuariosView` sigue el patrón de `InspectoresView` (tabla `hidden md:block`, tarjetas `md:hidden`) con enlace «Ver detalle» por fila (`aria-label` con el nombre) y paginación por `Link` que conserva los filtros. `UsuarioBadges` exporta `RolBadge` y `EstadoBadge` (reutilizados por el detalle y por la spec de acciones). Server Components salvo que se necesite lo contrario.
- Tests: `page.test.tsx` — `requireRole` llamado con `"superadmin"` antes de `listUsuarios`; la redirección de `requireRole` (lanza) corta el flujo sin leer datos. Componentes presentacionales: no aplica (SETUP.md 3.2).
- [x] Completada

### T4 — Página de detalle con auditoría
- Archivos: `app/panel/usuarios/[id]/page.tsx` (crear), `app/panel/usuarios/[id]/page.test.tsx` (crear), `modules/usuarios/components/UsuarioDetalleView.tsx` (crear), `modules/usuarios/utils/auditoria-texto.ts` (crear), `modules/usuarios/utils/auditoria-texto.test.ts` (crear)
- Depende de: T2, T3 (reutiliza `UsuarioBadges`)
- Grupo paralelo: G4
- Cubre: AC-1, AC-7, AC-8, AC-10
- Detalle: `page.tsx` valida `z.uuid()` del id → `notFound()`, `requireRole("superadmin")`, `getUsuarioDetalle`, `notFound()` si `null`; enlace «Volver a usuarios». `auditoria-texto.ts` es una función pura `describirCambio(item)` que arma la frase en español usando `ROLE_LABELS`. `UsuarioDetalleView` usa `dl`/`Card` y deja un punto de extensión (`acciones?: ReactNode`) para la spec de acciones.
- Tests: `auditoria-texto.test.ts` — los tres tipos de acción y valores desconocidos sin romper; `page.test.tsx` — id inválido → `notFound` sin llamar al servicio; `requireRole("superadmin")`; detalle `null` → `notFound`.
- [x] Completada

## Grupos paralelos
G1: T1. G2: T2. G3: T3. G4: T4. (Cadena lineal: cada tarea consume contratos de la anterior; sin paralelismo útil.)

## Fases siguientes
- `usuarios-gestion-acciones`: cambiar rol y activar/desactivar con guardas y auditoría.
- `usuarios-invitar-personal`: alta de `admin` por invitación de Clerk.
