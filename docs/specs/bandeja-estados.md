# Bandeja del panel, detalle para el admin y máquina de estados (parte 1 de 2)

Estado: approved

Parte 1 de 2. La parte 2 es `expediente-detalle-cliente.md` y **depende de esta** (reutiliza `getExpedienteDetalle`, `ExpedienteDatos`, `HistorialTimeline`, las constantes de etiquetas y `format-fecha`).

## Objetivo
Hoy un expediente se detiene en `PRESENTADO` y el personal de GRDyDC no tiene pantalla. Esta spec da al `admin` y al `superadmin` una bandeja en `/panel/expedientes` (todos los expedientes presentados, con filtros y paginación) y un detalle `/panel/expedientes/[id]` desde el que revisan el expediente y lo mueven por el tramo inicial del flujo, con cada cambio registrado en `historial_estados`.

## Fuera de alcance
- Notificaciones por correo/SMS: el cliente solo ve el estado en la app.
- Designación de inspector, constancia y diligencia (spec `inspeccion`): por eso `INSPECTOR_DESIGNADO` y todo lo posterior **no** se alcanzan aquí (ver decisión 2).
- Subsanación del cliente `OBSERVADO_REQUISITOS → PRESENTADO` (spec `subsanacion-plazos`), plazos, días hábiles, días restantes.
- Certificados, `CUMPLE`/`NO_CUMPLE`, `DERIVADO_COMERCIALIZACION`, etc.
- Recalcular o cobrar diferencia de tasa si el admin cambia el nivel de riesgo, y recalcular los documentos requeridos: **límite aceptado**, el pago ya se hizo con el nivel declarado.
- Notas internas no visibles al cliente: todo `comentario` del historial lo ve el cliente (se avisa en el formulario).
- `@tanstack/react-table`: no se usa (ver Reutilización).

## Decisiones (y dos puntos que pido confirmar al aprobar)
1. **Transiciones de esta spec** (datos en `TRANSICIONES`, función pura): `PRESENTADO → EN_REVISION`; `EN_REVISION → OBSERVADO_REQUISITOS | EN_TRAMITE_EXTERNO`; `ANULADO` desde cualquier estado no final y no `BORRADOR` (finales: `ANULADO`, `ENTREGADO`, `DERIVADO_COMERCIALIZACION`). Cualquier otra se rechaza.
2. **A confirmar, `EN_REVISION → INSPECTOR_DESIGNADO`:** el pedido la menciona, pero `reglas-negocio` 6.1 solo permite `EN_REVISION → OBSERVADO_REQUISITOS | EN_TRAMITE_EXTERNO` y `EN_TRAMITE_EXTERNO → INSPECTOR_DESIGNADO`, y la sección 10 exige que ese estado traiga inspectores y constancia. **Esta spec no la incluye**; la llegada a `INSPECTOR_DESIGNADO` (desde `EN_TRAMITE_EXTERNO`) la define la spec `inspeccion`. Si el humano la quiere ya, se añade una línea a `TRANSICIONES` y su test, pero habría que reconocer que se salta la constancia.
3. **A confirmar, quién anula:** el pedido dice "por el admin"; `reglas-negocio` sección 11 y `constitucion` sección 4 dicen que **solo el superadmin** anula. Se implementa lo documentado: `transicionesPermitidas(estado, rol)` ofrece `ANULADO` solo al `superadmin`. Cambiar a admin+superadmin es una línea en `transiciones.ts` más su test.
4. **Motivo (`comentario`)**: obligatorio (mínimo 10 caracteres, máximo 500) al pasar a `OBSERVADO_REQUISITOS` y a `ANULADO`; opcional (máximo 500) en las demás.
5. **Nivel de riesgo**: el admin puede cambiarlo solo en `EN_REVISION`, con nota obligatoria (mínimo 10 caracteres) y nivel distinto al actual. "Confirmar" el nivel es implícito: avanzar desde `EN_REVISION` sin cambiarlo. El cambio se registra como una fila de historial con `estado_anterior = estado_nuevo = EN_REVISION` y comentario `Nivel de riesgo: MEDIO → ALTO. <nota>`; la línea de tiempo muestra esa fila como nota ("Nivel de riesgo actualizado"), no como cambio de estado.
6. **Atomicidad** (corrige el comentario "neon-http no tiene transacciones" de `presentarExpediente`): el driver `drizzle-orm/neon-http` expone `db.batch([...])`, que ejecuta las sentencias en **una sola transacción** (`client.transaction` en `node_modules/drizzle-orm/neon-http/session.js`). Cada cambio hace en un `db.batch`: (a) `UPDATE expedientes SET estado/nivel_riesgo, updated_at = :ahora WHERE id = :id AND estado = :estadoAnterior [AND nivel_riesgo = :anterior] RETURNING`, y (b) `INSERT INTO historial_estados ... SELECT ... WHERE EXISTS (SELECT 1 FROM expedientes WHERE id = :id AND updated_at = :ahora AND estado = :estadoNuevo)`. Así, si otro admin ganó la carrera, el UPDATE afecta 0 filas, el INSERT no inserta nada y el servicio devuelve `conflicto`: nunca queda un cambio sin historial ni un historial sin cambio. Límite documentado: no hay bloqueo pesimista; la protección es optimista (compara el estado de partida). `presentarExpediente` (cliente) no se toca aquí.
7. **Búsqueda y filtros por URL** (`?estado=&q=&page=`), con un `<form method="get">` nativo: sin estado de cliente, enlaces compartibles, Server Component. Entradas inválidas en la URL se ignoran (se usan valores por defecto), nunca producen error.
8. **Qué lista la bandeja:** expedientes con `numero` no nulo (es decir, alguna vez presentados). Excluye `BORRADOR` y borradores anulados. Orden: `presentado_at` descendente. Tamaño de página 20.
9. **Detalle:** devuelve `null` (la página responde 404) si el expediente no existe, o nunca fue presentado (`numero` nulo). El nombre del autor de cada fila del historial se entrega solo si quien consulta no es `cliente`.

## Reutilización
- Existente que se reutiliza: `requireRole` (`modules/usuarios/services/authorization.service.ts`); `PageHeader`, `EmptyState` (`components/shared/`); `Card`, `Badge`, `Button`/`buttonVariants`, `Input`, `Label` (`components/ui/`); `EstadoBadge` y `ESTADO_LABELS` (`modules/expedientes/`); `DOCUMENTOS` (etiquetas de documentos, `utils/documentos.ts`); la ruta `GET /api/documentos/[id]?tipo=` (ya permite a admin/superadmin; solo se enlaza); `ActionResult` (`lib/action-result.ts`); `Actor` y `getExpedienteById` ya existen en `expediente.service.ts` (se sigue su criterio de visibilidad por rol); el patrón `useActionState` + `iniciarPagoAction(id, prev, formData)`; el ítem "Expedientes" de `nav-items.ts` (ya apunta a `/panel/expedientes`).
- Existente que se extiende: nada se modifica. La ruta estática `app/panel/expedientes/page.tsx` tiene prioridad sobre el placeholder `app/panel/[section]/page.tsx` (que sigue sirviendo las demás secciones; su test no cambia).
- Nuevo (y por qué): módulo puro `transiciones.ts` (no existe máquina de estados); `bandeja.service.ts` (lectura para staff: `listOwnExpedientes` es solo del cliente); `transicion.service.ts` (mutaciones atómicas de staff); `HistorialTimeline` y `ExpedienteDatos` en `modules/expedientes/components/` (no existen; los usa también la parte 2, por eso van aquí y son presentacionales y neutrales al rol); `expediente-labels.ts` y `format-fecha.ts` (hoy `TIPO_TRAMITE_LABELS` y el formateador de fecha son locales de `ExpedientesView`; la parte 2 los reemplaza por estos).
- Tabla: **no** `@tanstack/react-table` v9 (sin ordenación, columnas dinámicas ni selección; el filtrado y la paginación los hace el servidor). Basta la tabla de shadcn (`table`) en pantallas `md+` y tarjetas en móvil.
- Dependencias / componentes shadcn a instalar antes de implementar (preparación del orquestador, una sola vez, porque tocan `components/ui/`): `npx shadcn@latest add table textarea`. Los `<select>` son nativos (`<select>` con las clases de `Input`), a propósito: viajan en un `<form method="get">` sin JS.

## Specs afectadas
- `mis-expedientes`: su "Fuera de alcance" (detalle, línea de tiempo) pasa a cubrirse entre esta spec y la parte 2; AC-3 se amplía en la parte 2 (Pagado, Ver detalle). Sin cambios en esta parte.
- `layouts-por-rol`: AC de `/panel/expedientes` (placeholder "Próximamente") queda reemplazado por la bandeja real; el ítem de menú y el test de `[section]` siguen vigentes.
- `pago-stripe`: sin cambios; solo se corrige por documentación la afirmación sobre transacciones (decisión 6). Los expedientes `PRESENTADO` que produce son la entrada de esta spec.
- `docs/reglas-negocio-itse.md`: sin cambios (la spec sigue la sección 6.1; las desviaciones pedidas están en las decisiones 2 y 3).

## Criterios de aceptación
- AC-1 (máquina pura): `TRANSICIONES` define exactamente las transiciones de la decisión 1 y `[]` para los demás estados. `transicionesPermitidas(estado, rol)` devuelve para `PRESENTADO` `["EN_REVISION", "ANULADO"]` (superadmin) y `["EN_REVISION"]` (admin); para `EN_REVISION` `OBSERVADO_REQUISITOS`, `EN_TRAMITE_EXTERNO` (+ `ANULADO` solo superadmin); para `OBSERVADO_REQUISITOS` y `EN_TRAMITE_EXTERNO` solo `ANULADO` (superadmin); para `BORRADOR`, `ANULADO`, `ENTREGADO`, `DERIVADO_COMERCIALIZACION` `[]`; para cualquier rol `cliente` `[]`. `puedeTransicionar(desde, hasta, rol)` es verdadero solo si `hasta` está en esa lista. `requiereMotivo(hasta)` es verdadero solo para `OBSERVADO_REQUISITOS` y `ANULADO`. Un test recorre los 16 × 16 pares y falla si alguno no listado en la decisión 1 es permitido.
- AC-2 (filtros): `filtrosBandejaSchema.parse` acepta `estado` (uno de los 15 estados distintos de `BORRADOR`), `q` (recortado, máximo 30 caracteres) y `page` (entero ≥ 1); cualquier valor inválido (estado desconocido, `BORRADOR`, `page=0`, `page=abc`, arreglo repetido) se reemplaza por el valor por defecto (sin filtro / página 1) y no lanza. `PAGE_SIZE === 20`.
- AC-3 (lectura de la bandeja): `listExpedientesPanel(actor, filtros)` lanza `Error("No autorizado")` si el actor es `cliente`; para admin/superadmin devuelve `{ items, total, page, pageSize }` con solo expedientes de `numero` no nulo, de todos los clientes, ordenados por `presentado_at` descendente, cada item con `id`, `numero`, `establecimientoNombre`, `clienteNombre` (nombres y apellidos, o email si están vacíos), `tipoTramite`, `nivelRiesgo`, `estado`, `presentadoAt`. Aplica `estado` y `q` (búsqueda `ILIKE` por número con los comodines `%` y `_` del texto escapados) y `LIMIT/OFFSET`. Una sola consulta de datos más una de conteo (sin N+1).
- AC-4 (detalle): `getExpedienteDetalle(actor, id)` devuelve `null` si el expediente no existe, tiene `numero` nulo, o el actor es `cliente` y no es el dueño (mismo resultado que inexistente). Devuelve `{ expediente, establecimiento, solicitante (datos de la solicitud: nombre, documento, teléfono, email, calidad, razón social), documentos, historial }`; el historial va ordenado de más antiguo a más reciente y cada fila incluye `actorNombre` solo si `actor.rol !== "cliente"` (para el cliente la propiedad es `undefined`).
- AC-5 (cambio de estado, servicio): `cambiarEstado(actor, id, { hasta, comentario })` lanza `Error("No autorizado")` si el actor es `cliente`. Devuelve `no_encontrado` (inexistente o `numero` nulo), `no_permitido` (`puedeTransicionar(estadoActual, hasta, actor.rol)` falso, incluida cualquier transición de la decisión 1 no listada y `ANULADO` pedido por admin), `conflicto` (el UPDATE afectó 0 filas porque el estado cambió entre la lectura y la escritura) u `ok`. En `ok`, el UPDATE y el INSERT en `historial_estados` (`estado_anterior`, `estado_nuevo`, `usuario_id` del actor, `comentario`, fecha) van en **un único `db.batch`** conforme a la decisión 6; un test verifica que ambas sentencias se pasan a la misma llamada `db.batch` y que con `conflicto` no se reporta éxito. Nunca se invoca el UPDATE con un estado de partida distinto del leído.
- AC-6 (riesgo, servicio): `actualizarRiesgo(actor, id, { nivelRiesgo, nota })` lanza `Error("No autorizado")` para `cliente`; devuelve `no_permitido` si el estado no es `EN_REVISION` o el nivel es igual al actual; `no_encontrado`/`conflicto` como en AC-5; en `ok` cambia `nivel_riesgo` y registra en el mismo `db.batch` una fila con `estado_anterior = estado_nuevo = EN_REVISION` y comentario `Nivel de riesgo: <ANTERIOR> → <NUEVO>. <nota>` (con las etiquetas de `RIESGO_LABELS`).
- AC-7 (acciones): `cambiarEstadoAction(id, prev, formData)` y `actualizarRiesgoAction(id, prev, formData)` ejecutan en este orden: `requireRole("admin", "superadmin")`; `id` uuid (si no: "No se encontró el expediente." sin tocar la BD); validación Zod (`cambioEstadoSchema` / `cambioRiesgoSchema`): `hasta` ∈ estados destino válidos, `comentario` obligatorio de 10 a 500 caracteres cuando `requiereMotivo(hasta)` y opcional hasta 500 en los demás, `nivelRiesgo` ∈ enum y `nota` de 10 a 500; llamada al servicio con el usuario devuelto por `requireRole` (nunca un rol o id tomado del formulario); mapeo de resultados a mensajes en español sin términos técnicos (`no_encontrado` → "No se encontró el expediente."; `no_permitido` → "Esa acción no está disponible para este expediente."; `conflicto` → "El expediente cambió de estado. Actualiza la página e inténtalo de nuevo."; error inesperado → "No se pudo guardar el cambio. Inténtalo de nuevo."). Solo en éxito `revalidatePath` de `/panel/expedientes`, `/panel/expedientes/<id>`, `/mi-cuenta/expedientes` y `/mi-cuenta/expedientes/<id>`, y devuelve `{ ok: true, data: null }`. `fieldErrors` en errores de validación.
- AC-8 (aislamiento por rol): `/panel/expedientes` y `/panel/expedientes/[id]` llaman `requireRole("admin", "superadmin")` **antes** de leer datos (con redirección no se llama a ningún servicio); `cliente` es redirigido por `requireRole` a su inicio. Las dos acciones y los servicios rechazan a `cliente` aunque se invoquen directamente (tests con actor `cliente`). Un id inexistente, no uuid o de un expediente nunca presentado produce `notFound()` en el detalle.
- AC-9 (bandeja, UI): `/panel/expedientes` muestra `PageHeader` "Expedientes", un formulario `GET` con campo "Buscar por número" (`<label>` asociado), `<select>` "Estado" (opción "Todos" + los 15 estados con `ESTADO_LABELS`) y botón "Filtrar" (más enlace "Limpiar" si hay filtros), con los valores actuales precargados. A partir de `md` una tabla con columnas Número, Establecimiento, Cliente, Trámite, Nivel de riesgo, Estado (`EstadoBadge`), Presentado (`dd/MM/yyyy`) y un enlace "Ver" por fila con nombre accesible que incluye el número (`Ver expediente EXP-2026-00001`) a `/panel/expedientes/<id>`; por debajo de `md`, una tarjeta por expediente con los mismos datos. Sin resultados: `EmptyState` distinto para "sin expedientes" y "sin coincidencias con los filtros". Paginación con enlaces "Anterior"/"Siguiente" (deshabilitados como texto, sin enlace, en los extremos) que conservan `estado` y `q`, y el texto "Página X de Y" y total de resultados.
- AC-10 (detalle, UI): `/panel/expedientes/[id]` muestra: encabezado con número y `EstadoBadge`; bloque de solicitud (tipo de trámite, nivel de riesgo declarado, fecha de presentación, fecha de pago, calidad del solicitante, razón social si existe); solicitante (nombre, documento, teléfono, correo); establecimiento (nombre comercial, dirección, distrito, giro, área, pisos); documentos con un enlace de descarga por documento a `/api/documentos/<expedienteId>?tipo=<TIPO>` con la etiqueta de `DOCUMENTOS` (tipo no catalogado: "Documento adjunto"); línea de tiempo del historial con autor, y la sección de acciones. Las acciones muestran **solo** un botón por cada transición devuelta por `transicionesPermitidas(estado, rol)` (etiquetas: "Iniciar revisión", "Observar requisitos", "Derivar a trámite externo", "Anular expediente"); si no hay ninguna, el texto "No hay acciones disponibles en este estado." En `EN_REVISION` se muestra además el formulario "Cambiar nivel de riesgo" (select con el nivel actual preseleccionado y nota). Los formularios muestran el aviso "El solicitante verá este motivo.", el `textarea` del motivo solo para las acciones que lo requieren (obligatorio con `required` y `aria-required`), errores de campo asociados con `aria-describedby`/`aria-invalid` y mensaje general en una región `role="alert"`.
- AC-11 (línea de tiempo): `HistorialTimeline` es una lista ordenada (`<ol>`) con `<time dateTime>` por fila, cada fila con estado (etiqueta de `ESTADO_LABELS`), fecha y hora `dd/MM/yyyy HH:mm` en `America/Lima`, autor si viene `actorNombre`, y comentario si existe. Las filas con estado anterior igual al nuevo se muestran como nota ("Nivel de riesgo actualizado" + comentario). Sin historial muestra "Sin movimientos registrados."
- AC-12 (responsive y accesibilidad): sin desborde horizontal de la página a 360, 768 y 1280 px (la tabla solo aparece desde `md` y ninguna celda larga la rompe: `break-words`); un único `<h1>`; la tabla lleva `<caption class="sr-only">` y `<th scope="col">`; el estado nunca se comunica solo con color (siempre texto); los botones y enlaces de acción tienen altura táctil `h-11` y foco visible; solo tokens del tema (grep de `#[0-9a-f]{3,6}` y `oklch(` sin resultados); textos en español sin términos técnicos; sin `any`/`@ts-ignore`.
- AC-13: `npm run build`, `npm run lint` y `npx vitest run` pasan.

## Tareas
### T1 — Máquina de estados pura, etiquetas y tipos base
- Archivos: `modules/expedientes/utils/transiciones.ts` (crear), `modules/expedientes/utils/transiciones.test.ts` (crear), `modules/expedientes/constants/expediente-labels.ts` (crear), `modules/expedientes/types/bandeja.types.ts` (crear)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-1
- Detalle: exporta `TRANSICIONES`, `ESTADOS_FINALES`, `transicionesPermitidas(estado, rol)`, `puedeTransicionar(desde, hasta, rol)` y `requiereMotivo(hasta)`. Usa los tipos `EstadoExpediente` y `Role` existentes; sin importar `db`. `expediente-labels.ts` exporta `TIPO_TRAMITE_LABELS` (mismos textos que hoy en `ExpedientesView`: "Nueva inspección", "Renovación"), `CALIDAD_LABELS` ("Propietario", "Representante legal", "Administrador") y `RIESGO_LABELS` ("Bajo", "Medio", "Alto", "Muy alto"). `bandeja.types.ts` define `ExpedientePanelItem`, `BandejaResultado`, `HistorialItem` y `ExpedienteDetalle` (contratos que consumen T2, T3, T5 y T6).
- Tests: `transiciones.test.ts` — matriz completa 16 × 16 contra la lista esperada; rol por rol (`admin`, `superadmin`, `cliente`); `ANULADO` solo superadmin; estados finales y `BORRADOR` sin salidas; `requiereMotivo`.
- [x] Completada

### T2 — Lectura para staff: bandeja y detalle (servicio, filtros, tipos)
- Archivos: `modules/expedientes/schemas/filtros-bandeja.schema.ts` (crear), `modules/expedientes/schemas/filtros-bandeja.schema.test.ts` (crear), `modules/expedientes/services/bandeja.service.ts` (crear), `modules/expedientes/services/bandeja.service.test.ts` (crear)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-2, AC-3, AC-4
- Detalle: `bandeja.service.ts` (tipos de `bandeja.types.ts`, T1) exporta `listExpedientesPanel` y `getExpedienteDetalle` (esta última la reutiliza la parte 2; la visibilidad por rol sigue el criterio de `getExpedienteById`). `clienteNombre` y `actorNombre` se resuelven con `usuarios` en consultas con join (no una consulta por fila).
- Tests: `filtros-bandeja.schema.test.ts` — válidos, inválidos con fallback, `BORRADOR` rechazado, recorte de `q`. `bandeja.service.test.ts` (patrón de `expediente.service.test.ts`, `db` mockeado) — `cliente` lanza; admin y superadmin leen; mapeo de `clienteNombre` con y sin nombres; escape de `%`/`_` en la búsqueda; detalle `null` para `numero` nulo y para cliente ajeno; `actorNombre` presente para staff y `undefined` para cliente; orden del historial.
- [x] Completada

### T3 — Escritura para staff: cambio de estado y de riesgo (servicio)
- Archivos: `modules/expedientes/services/transicion.service.ts` (crear), `modules/expedientes/services/transicion.service.test.ts` (crear)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-5, AC-6
- Detalle: `cambiarEstado` y `actualizarRiesgo` según decisión 6. Lee el expediente, valida con `puedeTransicionar`, ejecuta el `db.batch` con la comparación del estado de partida y registra el historial. Comentario del riesgo con `RIESGO_LABELS` de `expediente-labels.ts` (T1).
- Tests: `transicion.service.test.ts` — `cliente` lanza; cada transición permitida llama a `db.batch` una vez con dos sentencias; transición ilegal (p. ej. `PRESENTADO → OBSERVADO_REQUISITOS`) devuelve `no_permitido` sin `batch`; `ANULADO` por admin → `no_permitido`, por superadmin → `ok`; UPDATE con 0 filas → `conflicto`; inexistente → `no_encontrado`; riesgo: fuera de `EN_REVISION` o mismo nivel → `no_permitido`, comentario con formato exacto.
- [x] Completada

### T4 — Acciones de servidor y formulario de acciones
- Archivos: `modules/expedientes/schemas/cambio-estado.schema.ts` (crear), `modules/expedientes/schemas/cambio-estado.schema.test.ts` (crear), `modules/expedientes/actions/transicion.actions.ts` (crear), `modules/expedientes/actions/transicion.actions.test.ts` (crear), `modules/expedientes/components/AccionesExpediente.tsx` (crear)
- Depende de: T1, T3
- Grupo paralelo: G3
- Cubre: AC-7, AC-10 (acciones), AC-12
- Detalle: `cambioEstadoSchema` y `cambioRiesgoSchema` según AC-7. `AccionesExpediente` es un componente cliente que recibe `expedienteId`, `estado`, `rol`, `nivelRiesgo`, calcula los botones con `transicionesPermitidas` y usa `useActionState` con las dos acciones. Sigue el patrón y las convenciones de `pago.actions.ts` (`requireRole` primero, `ActionResult`, `revalidatePath`).
- Tests: `cambio-estado.schema.test.ts` — motivo obligatorio solo para `OBSERVADO_REQUISITOS`/`ANULADO`, límites 10/500, `hasta` inválido, nivel inválido. `transicion.actions.test.ts` — `requireRole` primero y, si redirige, no se llama al servicio; id no uuid; validación; el servicio recibe el usuario de `requireRole`; mapeo de los 4 resultados a mensajes; `revalidatePath` (4 rutas) solo en éxito. `AccionesExpediente` es de presentación con poca lógica (SETUP.md 3.2): sin test propio salvo que el developer agregue uno simple de qué botones se pintan por estado y rol.
- [x] Completada

### T5 — Componentes y utilidades compartidas de presentación
- Archivos: `modules/expedientes/utils/format-fecha.ts` (crear), `modules/expedientes/utils/format-fecha.test.ts` (crear), `modules/expedientes/components/HistorialTimeline.tsx` (crear), `modules/expedientes/components/ExpedienteDatos.tsx` (crear)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-10 (datos y documentos), AC-11, AC-12
- Detalle: `format-fecha.ts` exporta `formatFecha` (`dd/MM/yyyy`) y `formatFechaHora` (`dd/MM/yyyy HH:mm`), `Intl.DateTimeFormat` es-PE con `America/Lima`. `ExpedienteDatos` recibe un `ExpedienteDetalle` (T1) y pinta solicitud, solicitante, establecimiento y documentos con enlaces de descarga; es neutral al rol (la parte 2 lo reutiliza). `HistorialTimeline` recibe `HistorialItem[]` (T1). Ambos son presentacionales y de Server Component.
- Tests: `format-fecha.test.ts` — fecha en zona Lima cerca de la medianoche UTC (p. ej. `2026-01-01T03:00:00Z` es 31/12/2025 22:00), formato `dd/MM/yyyy` y con hora. Los componentes son presentacionales (SETUP.md 3.2).
- [x] Completada

### T6 — Páginas del panel: bandeja y detalle
- Archivos: `modules/expedientes/components/BandejaView.tsx` (crear), `app/panel/expedientes/page.tsx` (crear), `app/panel/expedientes/page.test.tsx` (crear), `app/panel/expedientes/[id]/page.tsx` (crear), `app/panel/expedientes/[id]/page.test.tsx` (crear)
- Depende de: T2, T4, T5
- Grupo paralelo: G4
- Cubre: AC-8, AC-9, AC-10, AC-12
- Detalle: ambas páginas son Server Components que llaman `requireRole("admin", "superadmin")`, leen con `searchParams`/`params` (promesas en esta versión de Next.js: ver `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md`), parsean filtros con `filtrosBandejaSchema`, y componen `BandejaView` / `ExpedienteDatos` + `HistorialTimeline` + `AccionesExpediente`. Detalle: `getExpedienteDetalle` `null` o id no uuid → `notFound()`. `BandejaView` es presentacional (tabla `md+`, tarjetas móvil, filtros, paginación).
- Tests: `page.test.tsx` (patrón de `app/mi-cuenta/expedientes/page.test.tsx`) — `requireRole("admin", "superadmin")` antes del servicio; si redirige no se consulta; los filtros inválidos de la URL llegan saneados al servicio. `[id]/page.test.tsx` — `requireRole` primero; id no uuid y detalle `null` llaman `notFound`; pasa el usuario al servicio.
- [x] Completada

## Grupos paralelos
- G1: T1 (contratos: máquina, etiquetas y tipos).
- G2: T2, T3, T5 (archivos disjuntos; todos dependen solo de T1).
- G3: T4 (necesita T3).
- G4: T6 (necesita T2, T4 y T5).

## Fases siguientes
- Parte 2: `expediente-detalle-cliente.md` (tarjeta con «Pagado», «Ver detalle» y detalle de solo lectura para el cliente).
- Spec `inspeccion`: `EN_TRAMITE_EXTERNO → INSPECTOR_DESIGNADO` (con inspectores y constancia) y el resto del flujo.
- Spec `subsanacion-plazos`: `OBSERVADO_REQUISITOS → PRESENTADO` y días hábiles.
- Opcional: usar `db.batch` también en `presentarExpediente` (hoy sin atomicidad entre UPDATE e INSERT de historial).
