# Detalle del expediente para el cliente y marca «Pagado» (parte 2 de 2)

Estado: approved

Parte 2 de 2. **Depende de `bandeja-estados.md`** (T1 etiquetas y tipos, T2 `getExpedienteDetalle`, T5 `ExpedienteDatos`, `HistorialTimeline` y `format-fecha`); no puede implementarse antes de que esas tareas estén hechas.

## Objetivo
Que el administrado vea en «Mis expedientes» que su solicitud está pagada y en qué estado va, y abra un detalle de solo lectura con los datos de su solicitud, sus documentos descargables y la línea de tiempo con los movimientos (incluido el motivo cuando el personal observa o anula).

## Fuera de alcance
- Corregir o subir documentos (la subsanación `OBSERVADO_REQUISITOS → PRESENTADO` es de la spec `subsanacion-plazos`): el cliente solo ve el estado y el motivo.
- Detalle de borradores: se retoman con «Continuar»/«Pagar» (wizard), no tienen detalle.
- Descarga de comprobante de pago o recibo, certificados, plazos y días restantes.
- Notificaciones por correo/SMS.

## Decisiones
1. **Marca «Pagado»:** se muestra cuando `pagadoAt` no es nulo, como `Badge` aparte del `EstadoBadge` (el estado y el pago son cosas distintas), con el texto «Pagado» y, en la tarjeta, la fecha («Pagado el dd/MM/yyyy»). No se muestra el monto (no se guarda; ver `pago-stripe`).
2. **«Ver detalle»** aparece solo en tarjetas con `numero` (expedientes presentados); los borradores conservan «Continuar»/«Pagar» y «Anular» sin cambios.
3. **Privacidad:** el cliente ve el motivo (`comentario`) de cada movimiento pero **no** el nombre del personal que lo hizo (el servicio ya omite `actorNombre` para el rol `cliente`).
4. **404 indistinguible:** un expediente ajeno, inexistente, con id no uuid o nunca presentado produce `notFound()` igual (sin filtrar su existencia).
5. Se reutiliza `getExpedienteDetalle`, `ExpedienteDatos` y `HistorialTimeline` de la parte 1; esta spec solo los compone en la ruta del cliente.

## Reutilización
- Existente que se reutiliza: `getExpedienteDetalle` (`bandeja.service.ts`), `ExpedienteDatos`, `HistorialTimeline`, `format-fecha.ts`, `expediente-labels.ts` (parte 1); `EstadoBadge`; `PageHeader`; `Badge`, `Button`/`buttonVariants`, `Card`; `requireRole`; la ruta de descarga `GET /api/documentos/[id]?tipo=` (ya autoriza al dueño).
- Existente que se extiende: `modules/expedientes/components/ExpedientesView.tsx` (agrega «Pagado» y «Ver detalle»; sustituye su `TIPO_TRAMITE_LABELS` y `fechaFormatter` locales por los compartidos, DRY) y `ExpedientesView.test.tsx`.
- Nuevo (y por qué): `app/mi-cuenta/expedientes/[id]/page.tsx` (no existe ruta de detalle del cliente) y `modules/expedientes/components/ExpedienteDetalleCliente.tsx` (composición de solo lectura con el encabezado, sin acciones; la versión del panel tiene acciones y otro rol, así que no se fuerza un componente único).
- Dependencias / componentes shadcn a instalar antes de implementar: ninguno.

## Specs afectadas
- `mis-expedientes`: **AC-3** se amplía (la tarjeta suma la marca «Pagado» con fecha y «Ver detalle»); **AC-4** sin cambios (los borradores conservan «Continuar»); su "Fuera de alcance" (detalle, línea de tiempo) pasa a cubrirse aquí.
- `pago-stripe`: **AC-13** (tarjetas con «Falta el pago»/«Pagar» para borradores) sin cambios; `pagado_at` pasa a mostrarse.
- `bandeja-estados` (parte 1): consume sus tareas T1, T2 y T5; no las modifica.

## Criterios de aceptación
- AC-1 (tarjeta): en `ExpedientesView`, toda tarjeta con `pagadoAt` no nulo muestra una `Badge` «Pagado» y el texto «Pagado el dd/MM/yyyy» (fecha en `America/Lima`) además del `EstadoBadge`; las tarjetas sin `pagadoAt` (borradores) no muestran ninguna de las dos. El estado y el pago se leen como texto, no solo por color.
- AC-2 (acción): las tarjetas con `numero` muestran un enlace «Ver detalle» a `/mi-cuenta/expedientes/<id>` con nombre accesible que incluye el número (`Ver detalle del expediente EXP-2026-00001`), altura táctil `h-11` y foco visible; los borradores (sin `numero`) no lo muestran y conservan «Continuar»/«Pagar» y «Anular» sin cambios.
- AC-3 (DRY): `ExpedientesView` ya no define `TIPO_TRAMITE_LABELS` ni `Intl.DateTimeFormat` propios: importa `TIPO_TRAMITE_LABELS` de `expediente-labels.ts` y `formatFecha` de `format-fecha.ts`; el resto de su salida no cambia (los tests existentes siguen pasando).
- AC-4 (aislamiento e IDOR): `/mi-cuenta/expedientes/[id]` llama `requireRole("cliente")` **antes** de leer datos (con redirección no se consulta el servicio; `admin`/`superadmin` son redirigidos a `/panel`). Llama `getExpedienteDetalle(usuario, id)` con el usuario devuelto por `requireRole`. Un `id` no uuid, o un resultado `null` (inexistente, ajeno o nunca presentado), produce `notFound()` y, en el caso del id no uuid, sin llamar al servicio.
- AC-5 (contenido): el detalle muestra: `PageHeader` con el número del expediente; `EstadoBadge`; `Badge` «Pagado» con fecha cuando corresponde; los bloques de `ExpedienteDatos` (solicitud, solicitante, establecimiento, documentos con enlace de descarga a `/api/documentos/<expedienteId>?tipo=<TIPO>`); y `HistorialTimeline` con los movimientos y sus motivos, **sin** nombre del personal. No hay botones de edición ni de cambio de estado. Un enlace «Volver a mis expedientes» a `/mi-cuenta/expedientes`.
- AC-6 (responsive y accesibilidad): sin desborde horizontal a 360, 768 y 1280 px (una columna en móvil; solicitud/establecimiento en dos columnas desde `lg`); un único `<h1>`; la línea de tiempo es una `<ol>` con `<time dateTime>`; enlaces de descarga con nombre accesible que incluye el tipo de documento; foco visible; solo tokens del tema (grep de `#[0-9a-f]{3,6}` y `oklch(` sin resultados); textos en español sin términos técnicos; sin `any`/`@ts-ignore`.
- AC-7: `npm run build`, `npm run lint` y `npx vitest run` pasan.

## Tareas
### T1 — Tarjeta de «Mis expedientes»: Pagado y Ver detalle
- Archivos: `modules/expedientes/components/ExpedientesView.tsx` (modificar), `modules/expedientes/components/ExpedientesView.test.tsx` (modificar)
- Depende de: `bandeja-estados` T1 y T5
- Grupo paralelo: G1
- Cubre: AC-1, AC-2, AC-3, AC-6 (tarjeta)
- Detalle: agrega la `Badge` y la fecha de pago, el enlace «Ver detalle» para tarjetas con `numero`, y cambia las constantes locales por los compartidos. No cambia la lógica de borradores («Continuar», «Pagar», «Anular»).
- Tests: `ExpedientesView.test.tsx` — tarjeta presentada con `pagadoAt` muestra «Pagado» y «Pagado el 15/03/2026»; sin `pagadoAt` no; «Ver detalle» con `href` correcto y nombre accesible solo cuando hay `numero`; los casos existentes (vacío, borrador, «Falta el pago») no cambian.
- [x] Completada

### T2 — Ruta de detalle del cliente
- Archivos: `app/mi-cuenta/expedientes/[id]/page.tsx` (crear), `app/mi-cuenta/expedientes/[id]/page.test.tsx` (crear), `modules/expedientes/components/ExpedienteDetalleCliente.tsx` (crear)
- Depende de: `bandeja-estados` T2 y T5
- Grupo paralelo: G1
- Cubre: AC-4, AC-5, AC-6
- Detalle: la página es un Server Component: `requireRole("cliente")`, valida el `id` con `z.uuid()`, `getExpedienteDetalle(usuario, id)`, `notFound()` si no hay resultado, y compone `ExpedienteDetalleCliente`, que es presentacional (encabezado con estado y pago, `ExpedienteDatos`, `HistorialTimeline`, enlace de regreso). `params` es una promesa en esta versión de Next.js (ver `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md`).
- Tests: `page.test.tsx` (patrón de `app/mi-cuenta/expedientes/page.test.tsx`) — `requireRole("cliente")` antes del servicio; con redirección no se consulta; id no uuid → `notFound` sin llamar al servicio; servicio `null` → `notFound`; el servicio recibe el usuario devuelto. `ExpedienteDetalleCliente` es presentacional (SETUP.md 3.2).
- [x] Completada

## Grupos paralelos
- G1: T1, T2 (archivos disjuntos). Ambas esperan a las tareas indicadas de `bandeja-estados`.

## Fases siguientes
- Spec `subsanacion-plazos`: acción del cliente sobre un expediente observado y días restantes en este detalle.
- Spec `certificados`: descarga del certificado y la resolución desde este detalle cuando llegue a `FINALIZADO`.
