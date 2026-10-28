# Inspectores (registro y gestión)

Estado: approved

Parte 1 de 4 de la funcionalidad `inspeccion`. Orden: `inspectores` → `designacion-inspectores` → `diligencia-inspeccion` → `constancia-designacion`.

## Objetivo
El `admin` y el `superadmin` de GRDyDC mantienen el registro de los inspectores que harán las diligencias. Los inspectores **no son usuarios** del sistema (no tienen cuenta de Clerk ni fila en `usuarios`): son fichas gestionadas por el personal. Sin este registro no se puede designar inspector (spec `designacion-inspectores`).

## Fuera de alcance
- Designar inspectores a un expediente, constancia, diligencia (specs siguientes).
- Cuentas de acceso, notificaciones al inspector, historial de designaciones por inspector, buscador/paginación de la lista (el equipo es pequeño: se listan todos).
- Borrado físico: no existe. Un inspector se **desactiva** (decisión 2).

## Decisiones (a confirmar al aprobar)
1. **Campos:** `nombres`, `apellidos`, `documento` (DNI o CIP ficticio, un solo campo, 5 a 8 dígitos, único), `telefono` (9 dígitos, empieza en 9), `email`, `habilitadoPrevia` (booleano: puede intervenir en ITSE previa, es decir riesgo ALTO/MUY_ALTO; implementa «autorizado para ese nivel de riesgo» de `reglas-negocio` sección 10 con el mínimo de datos), `activo`.
2. **Desactivar en vez de borrar:** el pedido dice «archivar en vez de borrar si tiene designaciones». Para no tener dos caminos (borrar si no tiene, archivar si tiene) se ofrece **solo** activar/desactivar, siempre. Un inspector inactivo no aparece al designar y conserva su historia. Si se quiere borrado físico de inspectores sin designaciones, es una spec posterior.
3. Roles: `admin` y `superadmin` gestionan (`reglas-negocio` sección 11, «Gestionar inspectores»); `cliente` no accede a nada.

## Reutilización
- Existente que se reutiliza: `requireRole` (`modules/usuarios/services/authorization.service.ts`); `Actor` (`modules/establecimientos/types/establecimiento.types.ts`); `ActionResult` (`lib/action-result.ts`); `PageHeader`, `EmptyState` (`components/shared/`); `Table`, `Card`, `Badge`, `Button`, `Dialog`, `AlertDialog`, `Input`, `Label` (`components/ui/`); el ítem «Inspectores» de `modules/navigation/constants/nav-items.ts` (ya apunta a `/panel/inspectores`, no se toca).
- Patrón a seguir (no se copia código): `modules/establecimientos/` (service con `assert*`, errores tipados, action con `run`, `EstablecimientoForm` en diálogo, `ArchiveEstablecimientoDialog`) y `BandejaView` (tabla desde `md`, tarjetas debajo).
- Existente que se extiende: `db/schema.ts` (tabla nueva).
- Nuevo (y por qué): módulo `modules/inspecciones/` (lo prevé la constitución, sección 2; ningún módulo cubre inspectores); `app/panel/inspectores/page.tsx` (la ruta estática tiene prioridad sobre el placeholder `app/panel/[section]/page.tsx`, cuyo test no cambia).
- Dependencias / componentes shadcn a instalar: **ninguno** (todo existe en `components/ui/`; la casilla es un `<input type="checkbox">` nativo). Preparación del humano tras T1: `DATABASE_URL="postgres://u:p@localhost/db" npm run db:generate` (lo hace el developer) y luego `npm run db:migrate` (lo corre el humano).

## Specs afectadas
- `layouts-por-rol`: el placeholder «Próximamente» de `/panel/inspectores` queda reemplazado por la pantalla real; el ítem de menú sigue igual.
- Ninguna otra.

## Criterios de aceptación
- AC-1 (esquema): `db/schema.ts` exporta la tabla `inspectores` (`id` uuid, `nombres`, `apellidos`, `documento` con índice único, `telefono`, `email`, `habilitadoPrevia` default `false`, `activo` default `true`, `createdAt`, `updatedAt`) y el tipo `Inspector`; existe una migración nueva en `drizzle/` que solo crea esa tabla (`CREATE TABLE "inspectores"`), sin tocar otras.
- AC-2 (validación): `inspectorSchema` recorta espacios y exige `nombres` y `apellidos` de 2 a 80 caracteres, `documento` `^\d{5,8}$`, `telefono` `^9\d{8}$`, `email` válido (minúsculas, máx. 120), `habilitadoPrevia` booleano (casilla ausente = `false`). Mensajes en español. Casos válidos e inválidos probados.
- AC-3 (lectura): `listInspectores(actor)` lanza `Error("No autorizado")` si el actor es `cliente`; para admin/superadmin devuelve todos los inspectores con activos primero y luego por apellidos (una sola consulta).
- AC-4 (crear/editar): `createInspector` y `updateInspector` lanzan `Error("No autorizado")` para `cliente`. `updateInspector` devuelve `null` si el id no existe y actualiza `updatedAt`. Un `documento` repetido (violación de unicidad `23505`, ya sea en el error o en `error.cause`) lanza `InspectorDuplicadoError`.
- AC-5 (activar/desactivar): `setInspectorActivo(actor, id, activo)` lanza `Error("No autorizado")` para `cliente`, devuelve `null` si no existe, es idempotente y no borra nada. Un grep de `delete(inspectores)` en el repo no da resultados.
- AC-6 (acciones): `crearInspectorAction`, `editarInspectorAction` y `setInspectorActivoAction` ejecutan en este orden: `requireRole("admin", "superadmin")`; id uuid (si no, «No se encontró el inspector.» sin tocar la BD); validación Zod con `fieldErrors`; servicio con el usuario de `requireRole` (nunca un rol del formulario); mapeo de resultados: inexistente → «No se encontró el inspector.», duplicado → «Ya existe un inspector con ese documento.», error inesperado → «No se pudo guardar el cambio. Inténtalo de nuevo.». Solo en éxito `revalidatePath("/panel/inspectores")` y devuelven `{ ok: true, data }`.
- AC-7 (aislamiento): `/panel/inspectores` llama `requireRole("admin", "superadmin")` antes de leer datos; un `cliente` es redirigido a su inicio por `requireRole`. Los servicios y acciones rechazan a `cliente` aunque se invoquen directamente (tests con actor `cliente`).
- AC-8 (lista, UI): `/panel/inspectores` muestra `PageHeader` «Inspectores» y un botón «Nuevo inspector» (`h-11`). A partir de `md` una tabla (`<caption class="sr-only">`, `<th scope="col">`) con Nombre, Documento, Teléfono, Correo, «Previa» (Sí/No en texto), Estado (`Badge` «Activo»/«Inactivo», siempre con texto) y Acciones; por debajo de `md`, una tarjeta por inspector con los mismos datos. Sin inspectores: `EmptyState` con el botón de crear.
- AC-9 (formulario, UI): diálogo único para crear y editar, con `<Label>` asociado a cada campo, `required`/`aria-required`, errores de campo con `aria-invalid` y `aria-describedby`, mensaje general en `role="alert"`, casilla «Habilitado para inspecciones previas (riesgo alto y muy alto)», botón con estado «Guardando…», y cierre al guardar con éxito.
- AC-10 (desactivar, UI): «Desactivar» abre un `AlertDialog` de confirmación («Dejará de aparecer al designar inspectores. Podrás reactivarlo.»); «Reactivar» actúa directo. Los errores se muestran en `role="alert"`.
- AC-11 (responsive y accesibilidad): sin desborde horizontal a 360, 768 y 1280 px (textos largos con `break-words`, un único `<h1>`); botones y enlaces con altura táctil `h-11` y foco visible; solo tokens del tema (grep de `#[0-9a-f]{3,6}` y `oklch(` sin resultados); textos en español sin términos técnicos; sin `any`/`@ts-ignore`; ningún dato de inspectores en `app/mi-cuenta/*`.
- AC-12: `npm run build`, `npm run lint` y `npx vitest run` pasan.

## Tareas
### T1 — Tabla `inspectores` y migración
- Archivos: `db/schema.ts` (modificar), `drizzle/0012_*.sql` (crear, generado), `drizzle/meta/0012_snapshot.json` (crear, generado), `drizzle/meta/_journal.json` (modificar, generado)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-1
- Detalle: generar con `DATABASE_URL="postgres://u:p@localhost/db" npm run db:generate`. Exportar `type Inspector = typeof inspectores.$inferSelect`.
- Tests: no aplica (esquema generado; SETUP.md 3.2).
- [x] Completada

### T2 — Schema Zod y servicio de inspectores
- Archivos: `modules/inspecciones/schemas/inspector.schema.ts` (crear), `modules/inspecciones/schemas/inspector.schema.test.ts` (crear), `modules/inspecciones/services/inspector.service.ts` (crear), `modules/inspecciones/services/inspector.service.test.ts` (crear)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-2, AC-3, AC-4, AC-5
- Tests: schema (válidos, cada regla inválida, espacios recortados, casilla ausente); servicio con `db` mockeado (cliente rechazado en las 4 funciones, orden de lista, `null` por id inexistente, `InspectorDuplicadoError` con `23505` directo y en `cause`).
- [x] Completada

### T3 — Acciones de servidor
- Archivos: `modules/inspecciones/actions/inspector.actions.ts` (crear), `modules/inspecciones/actions/inspector.actions.test.ts` (crear)
- Depende de: T2
- Grupo paralelo: G3
- Cubre: AC-6, AC-7 (acciones)
- Tests: orden `requireRole` → uuid → Zod → servicio; usuario de `requireRole` pasado al servicio; mensajes de cada resultado; `revalidatePath` solo en éxito.
- [x] Completada

### T4 — Pantalla `/panel/inspectores`
- Archivos: `app/panel/inspectores/page.tsx` (crear), `app/panel/inspectores/page.test.tsx` (crear), `modules/inspecciones/components/InspectoresView.tsx` (crear), `modules/inspecciones/components/InspectorForm.tsx` (crear), `modules/inspecciones/components/ToggleInspectorDialog.tsx` (crear)
- Depende de: T3
- Grupo paralelo: G4
- Cubre: AC-7 (página), AC-8, AC-9, AC-10, AC-11
- Tests: `page.test.tsx` — `requireRole("admin","superadmin")` se llama antes de `listInspectores` y recibe el usuario (patrón de `app/panel/expedientes/page.test.tsx`). Componentes: presentacionales con `useActionState` (SETUP.md 3.2), sin test propio.
- [x] Completada

## Grupos paralelos
Secuencial por contrato (esquema → servicio → acción → UI); no hay paralelismo útil.

## Fases siguientes
- Spec `designacion-inspectores`: designar desde el detalle del expediente.
