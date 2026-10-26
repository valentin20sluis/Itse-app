# Mis expedientes (listado del cliente y descarga protegida de archivos) (parte 3 de 3)

Estado: approved

Depende de `solicitud-itse-datos.md` (servicios) y, para el botón "Continuar", del wizard de `solicitud-itse-wizard.md` (`?borrador=<id>`). Puede implementarse en paralelo al wizard: solo comparten la URL.

## Objetivo
Que el cliente vea en `/mi-cuenta/expedientes` sus solicitudes con número, establecimiento, estado y fecha, retome sus borradores y pueda abrir sus archivos subidos de forma protegida (solo dueño y staff).

## Fuera de alcance
- Detalle del expediente, línea de tiempo, días restantes de plazos, descarga de certificados (specs `bandeja-estados`, `subsanacion-plazos`, `certificados`).
- Filtros, búsqueda, paginación (un cliente tiene pocos expedientes).
- Pantalla del panel para staff; aquí solo la ruta de descarga ya autoriza a staff.
- Etiquetas definitivas de los estados posteriores a `PRESENTADO`: se definen las 16 por completitud de tipo, pero solo `BORRADOR` y `PRESENTADO` son alcanzables hoy.

## Hallazgos (estado actual del repo)
- `/mi-cuenta/expedientes` hoy lo sirve el placeholder `app/mi-cuenta/[section]/page.tsx`; una ruta estática propia tiene prioridad y debe llamar `requireRole("cliente")`. El ítem "Mis expedientes" ya existe en `nav-items.ts`.
- Constitución sección 8: estados con `Badge` de color consistente en toda la app.
- `proxy.ts` ya protege `/api/documentos/*` con Clerk (no es ruta pública).
- Servicios de la parte 1: `listOwnExpedientes(actor)` (con nombre del establecimiento) y `getDocumentoForDownload(actor, id)`.

## Decisiones de diseño
- **Un solo mapa de presentación del estado** (`ESTADO_LABELS`: etiqueta y variante de color por cada `estado_expediente`) en el módulo `expedientes` y un `EstadoBadge` reutilizable (la bandeja lo reutilizará, DRY). Colores solo con variantes/tokens del tema.
- **Tarjetas, no tabla** (pocos registros; mismo criterio que establecimientos): cuadrícula 1/2/3 columnas.
- **Fecha**: `dd/MM/yyyy` en `America/Lima` con `Intl.DateTimeFormat` (stdlib; no se instala `date-fns` todavía). Para borradores se muestra la fecha de última modificación ("Actualizado"), para el resto la de presentación.
- **Descarga**: Route Handler `GET /api/documentos/[id]`: autentica con `getOrCreateUser()` (sin redirecciones; 401 sin sesión), usa `getDocumentoForDownload(usuario, id)` y responde 404 idéntico para "no existe" y "es de otro". Si hay acceso, responde `302` a la URL firmada de corta duración de UploadThing (o, si el plan no permite archivos privados, a la URL del archivo; ver preguntas abiertas de la parte 2). Nunca se expone la URL en el HTML de listados.

## Reutilización
- Existente que se reutiliza: `PageHeader`, `EmptyState`, `Card`, `Badge`, `Button`/`buttonVariants`; `listOwnExpedientes`, `getDocumentoForDownload`; `getOrCreateUser`/`requireRole`; `lib/uploadthing-server.ts` (de la parte 2, se extiende con `getSignedFileUrl(key)`).
- Existente que se extiende: `lib/uploadthing-server.ts` (agregar `getSignedFileUrl`).
- Nuevo (y por qué): `EstadoBadge` y `estado-labels` en `modules/expedientes/` (nada existente muestra estados; se comparte entre cliente y panel); `app/api/documentos/[id]/route.ts` (no hay otra ruta de descarga).
- Dependencias / componentes shadcn a instalar antes de implementar: ninguno (usa lo instalado en la parte 2).

## Criterios de aceptación
- AC-1: `ESTADO_LABELS` cubre los 16 estados de `estado_expediente` con etiqueta en español (ej. `PRESENTADO` → "Presentado", `BORRADOR` → "Borrador", `OBSERVADO_REQUISITOS` → "Observado") y variante de `Badge`; un test falla si se agrega un estado al enum sin etiqueta.
- AC-2: `/mi-cuenta/expedientes`: `requireRole("cliente")` en la página (`admin`/`superadmin` → `/panel`, sin sesión → `/sign-in`, inactivo → `/cuenta-desactivada`). Muestra `PageHeader` "Mis expedientes" y un botón "Nueva solicitud" (a `/mi-cuenta/nueva-solicitud`).
- AC-3: Sin expedientes muestra `EmptyState` ("Aún no tienes solicitudes") con botón a `/mi-cuenta/nueva-solicitud`. Con expedientes, una `Card` por cada uno con número (o "Sin número" en borrador), nombre del establecimiento, tipo de trámite, `EstadoBadge` y fecha `dd/MM/yyyy`; solo los del usuario (usa `listOwnExpedientes`).
- AC-4: Los borradores tienen un enlace "Continuar" a `/mi-cuenta/nueva-solicitud?borrador=<id>` con nombre accesible que incluya el establecimiento; los demás estados no tienen acción de edición.
- AC-5: `GET /api/documentos/[id]`: sin sesión o usuario inactivo → 401; id no uuid, inexistente o de otro cliente → 404 con el mismo cuerpo; dueño, `admin` o `superadmin` → redirección `302` a la URL del archivo; nunca devuelve la `file_key` ni datos del expediente en el cuerpo.
- AC-6: `getSignedFileUrl(key)` queda en `lib/uploadthing-server.ts`, solo servidor.
- AC-7: Cuadrícula 1/2/3 columnas sin desborde horizontal a 360, 768 y 1280 px; foco visible y navegación por teclado; textos en español sin términos técnicos; solo tokens del tema (grep de `#[0-9a-f]{3,6}` y `oklch(` sin resultados); sin `any`/`@ts-ignore`.
- AC-8: `npm run build`, `npm run lint` y `npx vitest run` pasan.

## Tareas
### T1 — Etiquetas de estado y `EstadoBadge`
- Archivos: `modules/expedientes/constants/estado-labels.ts` (crear), `modules/expedientes/constants/estado-labels.test.ts` (crear), `modules/expedientes/components/EstadoBadge.tsx` (crear)
- Depende de: `solicitud-itse-datos` T1 (enum)
- Grupo paralelo: G1
- Cubre: AC-1, AC-7
- Tests: `estado-labels.test.ts` — cubre cada valor de `estadoExpedienteEnum.enumValues` con etiqueta no vacía. (`EstadoBadge` es presentacional, SETUP.md 3.2.)
- [ ] Completada

### T2 — Descarga protegida de documentos
- Archivos: `app/api/documentos/[id]/route.ts` (crear), `app/api/documentos/[id]/route.test.ts` (crear), `lib/uploadthing-server.ts` (modificar: agregar `getSignedFileUrl`)
- Depende de: `solicitud-itse-datos` T5, `solicitud-itse-wizard` T1
- Grupo paralelo: G1
- Cubre: AC-5, AC-6
- Tests: `route.test.ts` — con `getOrCreateUser`, `getDocumentoForDownload` y `getSignedFileUrl` mockeados: sin sesión → 401; inactivo → 401; id no uuid → 404 sin llamar al servicio; servicio `null` → 404; éxito → 302 a la URL; el servicio se invoca con el usuario de la sesión.
- [ ] Completada

### T3 — Listado y página
- Archivos: `modules/expedientes/components/ExpedientesView.tsx` (crear: presentacional; tarjetas, estado vacío, "Continuar"), `app/mi-cuenta/expedientes/page.tsx` (crear), `app/mi-cuenta/expedientes/page.test.tsx` (crear)
- Depende de: T1, `solicitud-itse-datos` T4
- Grupo paralelo: G2
- Cubre: AC-2, AC-3, AC-4, AC-7
- Detalle: la página llama `requireRole("cliente")`, `listOwnExpedientes(usuario)` y compone `ExpedientesView`; sin lógica propia.
- Tests: `page.test.tsx` (estilo de `app/mi-cuenta/establecimientos/page.test.tsx`) — `requireRole("cliente")` antes de leer datos; con redirect no se llama al servicio; pasa al servicio el usuario devuelto.
- [ ] Completada

## Grupos paralelos
G1: T1, T2 (archivos disjuntos). G2: T3.

## Fases siguientes
- Detalle del expediente con línea de tiempo y días restantes (`bandeja-estados` / `subsanacion-plazos`).
- Filtros y paginación si un cliente acumula muchos expedientes.
