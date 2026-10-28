# Listados de certificados y certificados por vencer

Estado: approved

Parte 4 de 4 de `certificados`. **Depende de `certificado-emision`** (tabla `certificados`, `estadoCertificado`, `diasParaVencer`, `CertificadoEstadoBadge`) y, para los enlaces de descarga, de `certificado-pdf-verificacion` (`/api/expedientes/<id>/certificado`) y `certificado-resolucion-entrega` (`/api/expedientes/<id>/resolucion`; también aporta `emitido_at` al aprobar, sin el cual no hay filas). No toca archivos de las otras specs.

## Objetivo
El personal ve en `/panel/certificados` los certificados emitidos y puede filtrar los que están **por vencer** (60 días o menos) o **vencidos**, para avisar a los administrados a tiempo (`reglas-negocio` 8: alerta de renovación a 60 días). El cliente ve y descarga los suyos en `/mi-cuenta/certificados`. Ambas rutas existen hoy como «Próximamente» (`app/panel/[section]` y `app/mi-cuenta/[section]`) y sus enlaces ya están en el menú.

## Fuera de alcance
- Dashboard de métricas y reportes (spec `dashboard-reportes`, que podrá reutilizar `listCertificadosPanel`).
- Enviar avisos por correo o SMS; notificaciones push.
- Iniciar la renovación desde el listado (el cliente usa «Nueva solicitud» con tipo `RENOVACION`); marcar un certificado como «renovado».
- Paginación, búsqueda por texto y exportación: el listado muestra hasta 100 filas ordenadas (límite aceptado; se agrega paginación como la bandeja cuando haga falta).
- Revocar o anular certificados (se hace anulando el expediente, spec 1).

## Decisiones (a confirmar al aprobar)
1. **Tres filtros por enlace** (`?filtro=`): `todos` (por defecto), `por-vencer` y `vencidos`. Un valor desconocido equivale a `todos`. Los certificados de expedientes `ANULADO` aparecen solo en `todos` (como «Anulado»), nunca en `por-vencer` ni `vencidos`.
2. **Por vencer = `estadoCertificado` `POR_VENCER`**, calculado en SQL con los mismos límites: `vence_at` entre el inicio de hoy (Lima) y el inicio de hoy + 60 días, ambos inclusive; `vencidos` = `vence_at` anterior al inicio de hoy. Coincide con la regla pura de la spec 1 (un test lo comprueba en las fronteras). Los filtros ordenan por `vence_at` ascendente (los más urgentes primero); `todos` por `emitido_at` descendente.
3. **Qué certificados se listan:** los que tienen `emitido_at` (aprobados por el superadmin; la vigencia corre desde ese momento). Personal: expedientes en `FINALIZADO`, `ENTREGADO` y `ANULADO` (los `CERTIFICADO_PENDIENTE_FIRMA` no tienen `emitido_at` y quedan fuera). Cliente: solo los suyos con expediente `ENTREGADO`, o sea después de que el admin se los envió; en `FINALIZADO` no ve nada.
4. **Datos en el listado del personal:** número del certificado, número del expediente (enlace al detalle), nombre comercial y distrito, fecha de vencimiento, días restantes y estado. No se muestra el código de verificación ni datos personales del solicitante.

## Reutilización
- Existente que se reutiliza: `estadoCertificado`, `diasParaVencer`, `CERTIFICADO_ESTADO_LABELS` y `CertificadoEstadoBadge` (spec 1); `requireRole`; `PageHeader` y `EmptyState` (`components/shared/`); `formatFecha`; `aInputLima`/`parseFechaLima`; `buttonVariants`; entradas de menú ya existentes en `NAV_ITEMS` (`/panel/certificados`, `/mi-cuenta/certificados`); patrón de `searchParams` y filtros por enlace de `BandejaView`/`filtros-bandeja.schema.ts`; la ruta de descarga de la spec 3.
- Existente que se extiende: nada. Las rutas estáticas `app/panel/certificados/page.tsx` y `app/mi-cuenta/certificados/page.tsx` tienen prioridad sobre las dinámicas `[section]`, que quedan para las demás secciones «Próximamente».
- Nuevo (y por qué): `certificado-lista.service.ts` y `filtro-certificados.schema.ts` (consultas con reglas de acceso propias de este listado); `CertificadosPanelView` y `CertificadosClienteView` (vistas distintas por rol y sin lógica compartida más allá del badge).
- Dependencias / componentes shadcn a instalar: ninguno. Sin migración.

## Specs afectadas
- `layouts-por-rol`: las secciones «Certificados» y «Mis certificados» dejan de mostrar «Próximamente»; el menú no cambia.
- `certificado-pdf-verificacion` y `certificado-resolucion-entrega`: los enlaces de descarga del cliente reutilizan sus rutas.

## Criterios de aceptación
- AC-1 (schema): `filtroCertificadosSchema.parse({})` devuelve `{ filtro: "todos" }`; acepta `todos`, `por-vencer`, `vencidos`; un valor desconocido (`"xyz"`, `["a","b"]`) devuelve `{ filtro: "todos" }` sin lanzar.
- AC-2 (servicio del personal): `listCertificadosPanel(actor, filtro, ahora?)` lanza `Error("No autorizado")` para `cliente`. Devuelve filas con `expedienteId`, `expedienteNumero`, `numero`, `nombreComercial`, `distrito`, `emitidoAt`, `venceAt`, `diasRestantes` y `estado`. Solo incluye certificados con `emitidoAt`. Con `por-vencer` solo `estado === "POR_VENCER"` y con `vencidos` solo `VENCIDO`, siempre excluyendo expedientes `ANULADO`; en las fronteras (61, 60, 0 y -1 días) la consulta y `estadoCertificado` coinciden. Máximo 100 filas, ordenadas según la decisión 2. No devuelve `codigo`, documento, teléfono ni correo del solicitante.
- AC-3 (servicio del cliente): `listCertificadosCliente(actor, ahora?)` lanza `Error("No autorizado")` si `actor.rol !== "cliente"`; devuelve solo certificados de expedientes del actor en `ENTREGADO` con `emitidoAt` (nunca en `FINALIZADO`), con `expedienteId`, `numero`, `nombreComercial`, `emitidoAt`, `venceAt`, `diasRestantes` y `estado`; nunca de otro usuario; sin `codigo`.
- AC-4 (página del personal): `/panel/certificados` usa `requireRole("admin", "superadmin")` primero, lee `searchParams.filtro` con el schema y muestra el título «Certificados», tres enlaces de filtro «Todos», «Por vencer» y «Vencidos» (el activo con `aria-current="page"`, `min-h-11`), y la lista. Cada fila: número del certificado, enlace «Expediente EXP-…» a `/panel/expedientes/<id>`, nombre comercial y distrito, vencimiento `dd/MM/yyyy`, «Faltan N días» / «Vence hoy» / «Venció hace N días» y `CertificadoEstadoBadge`. Sin filas: `EmptyState` con «No hay certificados en esta lista.». Disposición en tarjetas apiladas en móvil, sin desborde horizontal a 360, 768 y 1280 px.
- AC-5 (página del cliente): `/mi-cuenta/certificados` usa `requireRole("cliente")` primero y lista sus certificados con número, establecimiento, emisión y vencimiento, `CertificadoEstadoBadge`, enlaces «Descargar certificado» (`/api/expedientes/<id>/certificado`) y «Descargar resolución» (`/api/expedientes/<id>/resolucion`) y enlace «Ver expediente» a `/mi-cuenta/expedientes/<id>`; en `POR_VENCER` muestra «Tu certificado vence en N días. Cuando falte poco, inicia una nueva solicitud para renovarlo.» y en `VENCIDO` «Tu certificado venció. Inicia una nueva solicitud para renovarlo.». Sin certificados: `EmptyState` «Aún no tienes certificados. Aparecerán aquí cuando termine tu trámite.».
- AC-6 (aislamiento): ningún cliente ve datos de otro; el personal no puede acceder a `/mi-cuenta/certificados` ni el cliente a `/panel/certificados` (cubierto por `requireRole`, verificado por lectura y por test de página).
- AC-7 (accesibilidad): estado siempre con texto (no solo color), foco visible, solo tokens del tema, sin `any`/`@ts-ignore`.
- AC-8: `npm run build`, `npm run lint` y `npx vitest run` pasan.

## Tareas
### T1 — Servicio de listados y schema de filtro
- Archivos: `modules/certificados/services/certificado-lista.service.ts` (crear), `modules/certificados/services/certificado-lista.service.test.ts` (crear), `modules/certificados/schemas/filtro-certificados.schema.ts` (crear), `modules/certificados/schemas/filtro-certificados.schema.test.ts` (crear)
- Depende de: `certificado-emision` completa
- Grupo paralelo: G1
- Cubre: AC-1, AC-2, AC-3, AC-6 (datos)
- Tests: `filtro-certificados.schema.test.ts` (AC-1); `certificado-lista.service.test.ts` — rol incorrecto lanza `No autorizado`, mapeo de filas, `diasRestantes` y `estado` en las fronteras, exclusión de `ANULADO` en los filtros, ausencia de `codigo`, límite de 100. `db` mockeado.
- [x] Completada

### T2 — Página y vista del personal
- Archivos: `app/panel/certificados/page.tsx` (crear), `app/panel/certificados/page.test.tsx` (crear), `modules/certificados/components/CertificadosPanelView.tsx` (crear)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-4, AC-6, AC-7
- Tests: `page.test.tsx` — `requireRole` con `admin` y `superadmin`, el filtro llega al servicio, valor desconocido → `todos` (patrón de `app/panel/expedientes/page.test.tsx`). La vista es presentacional (SETUP.md 3.2).
- [x] Completada

### T3 — Página y vista del cliente
- Archivos: `app/mi-cuenta/certificados/page.tsx` (crear), `app/mi-cuenta/certificados/page.test.tsx` (crear), `modules/certificados/components/CertificadosClienteView.tsx` (crear)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-5, AC-6, AC-7
- Tests: `page.test.tsx` — `requireRole("cliente")` y el servicio invocado con el usuario de `requireRole`. La vista es presentacional (SETUP.md 3.2).
- [x] Completada

## Grupos paralelos
- G1: T1. G2: T2, T3 (archivos disjuntos).

## Fases siguientes
- `dashboard-reportes`: métricas y gráficos; puede reutilizar `listCertificadosPanel`.
