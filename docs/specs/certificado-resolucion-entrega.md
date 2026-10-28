# Aprobación del certificado, Resolución Gerencial y envío al cliente (CERTIFICADO_PENDIENTE_FIRMA → FINALIZADO → ENTREGADO)

Estado: approved
Nota (cambio posterior): el personal (admin y superadmin) ve el PDF del certificado como BORRADOR mientras el expediente está en `CERTIFICADO_PENDIENTE_FIRMA`, antes de aprobarlo (enlace «Ver certificado (borrador)»); esto revierte la decisión «sin vista previa». El cliente sigue sin verlo hasta `ENTREGADO` y la Resolución no tiene borrador.

Parte 2 de 4 de `certificados`. **Depende de `certificado-emision`** (tabla `certificados`, estado `CERTIFICADO_PENDIENTE_FIRMA`, `PanelCertificado`, `calcularVencimiento`, `certificadoDescargable`). No es paralela con ninguna otra spec de `certificados` (comparten `transiciones.ts`, `db/schema.ts`, el journal de `drizzle/` y `PanelCertificado.tsx`).

## Objetivo
El **superadmin** (jefe de GRDyDC) revisa el certificado que le envió el admin y, con un solo acto, lo **aprueba**: se fija la fecha de expedición y la vigencia de 2 años y el **sistema genera la Resolución Gerencial** (documento con número propio `RG-AAAA-NNNN`). El expediente queda en `FINALIZADO`, de vuelta con el admin. El **admin** entonces **envía** certificado y resolución al cliente (`ENTREGADO`); solo desde ese momento el cliente los ve y descarga. Esta spec incluye el PDF de la Resolución (es nuevo y propio de este paso); el PDF del certificado y la verificación pública son de la spec 3.

## Fuera de alcance
- Subir una Resolución desde un archivo externo (UploadThing): ya no hace falta, la genera el sistema. No se agrega el tipo de documento `RESOLUCION_GERENCIAL` ni migración de enum.
- Rechazar o devolver el certificado al admin (`reglas-negocio` 6.1 no lo permite; un error se corrige anulando, solo superadmin).
- Editar el texto de la Resolución o regenerarla con otro número; guardar el PDF (se genera al vuelo, como la constancia).
- PDF del certificado, QR, descarga del certificado, verificación pública y enlaces de descarga en las pantallas (spec 3).
- Firma digital real: la «firma» es el nombre del superadmin que aprueba, tomado del historial. Correo o SMS de aviso.

## Decisiones (a confirmar al aprobar)
1. **Mapa de estados:** `CERTIFICADO_PENDIENTE_FIRMA → FINALIZADO` (solo superadmin) = «certificado aprobado y Resolución generada, a la espera de que el admin lo envíe al cliente»; `FINALIZADO → ENTREGADO` (admin o superadmin) = «enviado al cliente». Encaja con `reglas-negocio` 6.1: `FINALIZADO` es el estado donde la oficina ya terminó su parte, y `ENTREGADO` ya era final y significa documentos entregados al administrado. Se reescribe la fila de `FINALIZADO` en la tabla 6 (hoy «Resolución subida… disponibles para el cliente») y se cambia su asignador a `superadmin`. **`PENDIENTE_RESOLUCION` queda en desuso** (como `EN_TRAMITE_EXTERNO`): nadie entra, no se borra del enum (evita migración), se marca «En desuso» en la tabla 6 y se quita de 6.1. Alternativa descartada: reutilizar `PENDIENTE_RESOLUCION` para «esperando envío», porque su nombre dice lo contrario (la resolución ya existe).
2. **Quién:** aprobar = **solo `superadmin`** (`reglas-negocio` 9 y 11); enviar al cliente = `admin` o `superadmin`, sin motivo, con el `cambiarEstado` genérico existente (botón «Enviar al cliente»).
3. **Resolución generada por el sistema:** dos columnas nuevas en `certificados`, `resolucion_numero` (texto único, nulo hasta aprobar) y `resolucion_at` (timestamptz, nulo). Número `RG-AAAA-NNNN` (`RG-2026-0001`), correlativo por año de Lima, asignado al aprobar con la misma técnica del número del certificado (`max + 1` en el UPDATE, índice único, hasta 3 reintentos ante `23505`). `resolucion_at` = `emitido_at` = instante de la aprobación. Contenido ficticio (proyecto académico): se arma al vuelo con datos del expediente (sin guardar el PDF).
4. **Atomicidad:** aprobar es **un solo `db.batch`** vía `aplicar` (cambio de estado + UPDATE de `certificados` con `emitido_at`, `vence_at`, `resolucion_numero`, `resolucion_at`, solo si el UPDATE del expediente ganó y `emitido_at IS NULL`). Nunca existe vigencia sin resolución ni al revés.
5. **Visibilidad del cliente:** hasta `ENTREGADO` no ve certificado, resolución ni sus números (`certificadoDescargable`, spec 1). Sí ve en su historial las entradas de estado, con comentarios neutros y **sin nombres del personal**: al aprobar «Certificado aprobado y Resolución Gerencial generada. Pendiente de entrega.» (sin número ni fechas); el envío usa el comentario del cambio de estado genérico.
6. **Superadmin que también generó el certificado:** puede aprobarlo (ver spec 1, decisión 1).

## Reutilización
- Existente que se reutiliza: `aplicar` con `extras`/`cambios`; `puedeTransicionar`; `calcularVencimiento`, `certificadoDescargable` (spec 1); `cambiarEstado`/`cambiarEstadoAction` y `AccionDirecta` para `ENTREGADO`; `requireRole`; `ActionResult`; `getOrCreateUser`; `formatFecha`; patrón de PDF y ruta de `ConstanciaDesignacionDocument.tsx` / `constancia.service.ts` / `app/api/expedientes/[id]/constancia/route.ts` (datos con el jefe tomado del historial); `tipoItsePorRiesgo`/`RIESGO_LABELS`; `AlertDialog`, `Button`; patrón de acción de `certificado.actions.ts`.
- Existente que se extiende: `db/schema.ts` (+2 columnas); `transiciones.ts`; `cambio-estado.schema.ts` (+`ENTREGADO` en `hasta`); `AccionesExpediente.tsx` (etiqueta); `PanelCertificado.tsx`; `docs/reglas-negocio-itse.md`.
- Nuevo (y por qué): `aprobacion.service.ts` (la atomicidad estado + certificado + resolución no cabe en `certificado.service.ts` ni en `transicion.service.ts`); `resolucion-numero.ts`; `aprobacion.actions.ts` y `AprobarCertificadoButton.tsx`; `resolucion-pdf.service.ts`, `ResolucionDocument.tsx` y la ruta de descarga (no existe otro PDF de resolución; su regla de acceso difiere de la constancia, que es solo para el personal).
- Dependencias / componentes shadcn a instalar: ninguno (`alert-dialog` y `@react-pdf/renderer` ya existen).
- **Migración `0019` (la genera el developer en T1 con `DATABASE_URL="postgres://u:p@localhost/db" npm run db:generate`; el humano corre `npm run db:migrate`):** `ALTER TABLE "certificados" ADD COLUMN "resolucion_numero"`, `ADD COLUMN "resolucion_at"` y su índice único. Solo agrega. (Reemplaza la migración de enum `RESOLUCION_GERENCIAL` de la versión anterior.)

## Specs afectadas
- `certificado-emision`: `CERTIFICADO_PENDIENTE_FIRMA` gana su salida (solo superadmin); `PanelCertificado` agrega el botón de aprobar; la matriz 18 × 18 suma `CERTIFICADO_PENDIENTE_FIRMA → FINALIZADO` y `FINALIZADO → ENTREGADO`. Su AC-9 (aprobar) se cubre aquí (AC-5).
- `certificado-pdf-verificacion` y `certificados-listados`: usan `FINALIZADO`/`ENTREGADO` (no `PENDIENTE_RESOLUCION`); la spec 3 agrega los enlaces de descarga que usan la ruta de esta spec.
- `docs/reglas-negocio-itse.md` 6, 6.1, 9 y 11 (ver AC-12).

## Criterios de aceptación
- AC-1 (esquema): `certificados` suma `resolucionNumero` (texto, **único**, nulo) y `resolucionAt` (timestamptz, nulo); migración `0019` que solo hace `ADD COLUMN` e índice único; `tipoDocumentoEnum` **no** cambia (grep: no aparece `RESOLUCION_GERENCIAL`).
- AC-2 (máquina pura): `transicionesPermitidas("CERTIFICADO_PENDIENTE_FIRMA", "admin")` es `[]` y para superadmin `["FINALIZADO", "ANULADO"]` (cualquier orden); `("FINALIZADO", "admin")` es `["ENTREGADO"]` (superadmin además `ANULADO`); `("ENTREGADO", rol)` es `[]`; `("PENDIENTE_RESOLUCION", "admin")` es `[]` y para superadmin solo `["ANULADO"]` (estado en desuso, nadie entra); `cliente` siempre `[]`. `transicionesGenericas("CERTIFICADO_PENDIENTE_FIRMA", rol)` no incluye `FINALIZADO` (flujo propio) y `transicionesGenericas("FINALIZADO", "admin")` es `["ENTREGADO"]`. La matriz 18 × 18 falla si algún par no listado es permitido.
- AC-3 (schema de cambio): `cambioEstadoSchema` acepta `hasta: "ENTREGADO"` sin motivo y sigue rechazando `FINALIZADO`, `CERTIFICADO_PENDIENTE_FIRMA`, `PENDIENTE_RESOLUCION` y `EN_TRAMITE_EXTERNO`. `cambiarEstado(admin, id, { hasta: "FINALIZADO" })` devuelve `no_permitido` (flujo propio) sin `db.batch`.
- AC-4 (número de la resolución): `formatNumeroResolucion(2026, 1)` devuelve `"RG-2026-0001"` y `(2026, 12345)` devuelve `"RG-2026-12345"`; `esNumeroResolucion` acepta `"RG-2026-0001"` y rechaza `""`, `"0001-2026"`, `"RG-26-1"` y `"CD-2026-00001"`.
- AC-5 (aprobar, servicio): `aprobarCertificado(actor, id, ahora?)` lanza `Error("No autorizado")` para `cliente`; para `admin` devuelve `no_permitido` sin `db.batch`. Para superadmin, en orden: `no_encontrado` → `no_permitido` (estado distinto de `CERTIFICADO_PENDIENTE_FIRMA`, o sin fila en `certificados`, o `emitido_at` no nulo, o `!puedeTransicionar`) → `conflicto` → `ok`. En `ok`, **un** `db.batch` vía `aplicar` (`CERTIFICADO_PENDIENTE_FIRMA → FINALIZADO`) cuyo `extras` hace `UPDATE certificados SET emitido_at = ahora, vence_at = calcularVencimiento(ahora), resolucion_numero = <RG-AAAA-NNNN por max+1>, resolucion_at = ahora WHERE expediente_id = id AND emitido_at IS NULL`, condicionado a que el UPDATE del expediente ganó; comentario del historial «Certificado aprobado y Resolución Gerencial generada. Pendiente de entrega.». Ante `23505` reintenta hasta 3 veces y relanza después. Sin `ok`/`conflicto` no se invoca `db.batch`. Doble clic: el segundo intento devuelve `conflicto` y no duplica ni cambia el número.
- AC-6 (acción): `aprobarCertificadoAction(id)` usa `requireRole("superadmin")` primero, valida `id` como uuid, pasa al servicio el usuario de `requireRole` y mapea los mismos mensajes que `prepararCertificadoAction` (spec 1, AC-11); revalida las mismas 6 rutas solo en éxito.
- AC-7 (UI del personal): `PanelCertificado` en `CERTIFICADO_PENDIENTE_FIRMA`: el superadmin ve «Aprobar certificado y generar resolución» (`h-11`) con `AlertDialog` («Se fijará hoy como fecha de expedición, el certificado vencerá en 2 años y se generará la Resolución Gerencial. Esta acción no se puede deshacer.»); el admin ve «Esperando la aprobación de Jefatura.» sin botón. En `FINALIZADO`: número, fechas, badge y «Certificado aprobado y Resolución Gerencial generada. Falta enviarlos al cliente.»; el botón «Enviar al cliente» (acción directa de `AccionesExpediente`, `h-11`) lo ven admin y superadmin. En `ENTREGADO`: «Enviado al cliente.» y sin acciones. Errores en `role="alert"`; foco visible; solo tokens del tema.
- AC-8 (datos del PDF de la resolución): `getResolucionPdfData(actor, expedienteId)` devuelve `null` si el expediente no existe, no tiene fila en `certificados`, `resolucionNumero` o `emitidoAt` son nulos, o `!certificadoDescargable(actor.rol, estado)`; para `cliente` además `null` si el expediente no es suyo (mismo `null` que inexistente). Si no, devuelve `resolucionNumero`, `resolucionAt`, `certificadoNumero`, `emitidoAt`, `venceAt`, `expedienteNumero`, `solicitante` (`nombre`, `razonSocial`), `establecimiento` (`nombreComercial`, `direccion`, `distrito`, `giro`), `nivelRiesgo` y `jefeNombre` (usuario que llevó el expediente a `FINALIZADO`, o `null`). No incluye `codigo`, documento, teléfono ni correo.
- AC-9 (ruta): `GET /api/expedientes/[id]/resolucion` responde 401 sin usuario o con usuario inactivo; 404 para id no uuid y cuando `getResolucionPdfData` devuelve `null` (cliente ajeno, inexistente, no descargable, anulado, o cliente antes de `ENTREGADO`: idéntico cuerpo y estado); y 200 con `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="resolucion-RG-2026-0001.pdf"` y `Cache-Control: private, no-store`. El cuerpo empieza con `%PDF`.
- AC-10 (documento): `ResolucionDocument` (A4, Helvetica, sin imágenes) contiene: título «Resolución Gerencial», número `RG-AAAA-NNNN`, fecha (`dd/MM/yyyy`, hora de Lima), texto en lenguaje llano que **aprueba el Certificado de ITSE N.° X** para el solicitante (y razón social si existe) y el establecimiento (dirección, distrito, giro, nivel de riesgo), con referencia al expediente y a la vigencia hasta la fecha de vencimiento, línea de firma con «Jefe de GRDyDC» y el nombre si existe, y el pie «Proyecto académico. Documento sin validez oficial.». Tildes correctas. `@react-pdf/renderer` solo se importa en `ResolucionDocument.tsx`, en los demás `*Document.tsx` y en los `route.ts` de PDF (grep); ningún `"use client"` lo importa.
- AC-11 (cliente y aislamiento): el cliente nunca ve `AprobarCertificadoButton` ni «Enviar al cliente»; hasta `ENTREGADO` no ve certificado ni resolución (`getResumenCertificado` devuelve `null` y la ruta responde 404, AC-9); su historial muestra «Finalizado» con el comentario de la decisión 5 y «Entregado», sin nombres del personal ni número de resolución.
- AC-12 (docs): `docs/reglas-negocio-itse.md`: tabla 6 (`FINALIZADO` = «Certificado aprobado y Resolución generada; pendiente de enviar al cliente», asignado por `superadmin`; `ENTREGADO` = «Certificado y resolución enviados al cliente», `admin`; `PENDIENTE_RESOLUCION` = «En desuso»); 6.1 (`CERTIFICADO_PENDIENTE_FIRMA → FINALIZADO [solo superadmin]`, `FINALIZADO → ENTREGADO`, sin `PENDIENTE_RESOLUCION`); 9 (la Resolución la genera el sistema, número `RG-AAAA-NNNN`, el cliente ve certificado y resolución solo en `ENTREGADO`); 11 (aprobar certificado y generar resolución: superadmin; enviar al cliente: admin y superadmin; descargar certificado y resolución: cliente solo tras el envío); `reglas-negocio` 5.8 aclara que en el MVP la Resolución es ficticia y generada por el sistema.
- AC-13: `npm run build`, `npm run lint` y `npx vitest run` pasan; sin `any`/`@ts-ignore`; solo tokens del tema.

## Tareas
### T1 — Esquema, migración y documentación
- Archivos: `db/schema.ts` (modificar), `drizzle/0019_*.sql` (crear, generado), `drizzle/meta/0019_snapshot.json` (crear, generado), `drizzle/meta/_journal.json` (modificar, generado), `docs/reglas-negocio-itse.md` (modificar)
- Depende de: `certificado-emision` completa
- Grupo paralelo: G1
- Cubre: AC-1, AC-12
- Detalle: agregar `resolucionNumero` (con `uniqueIndex`) y `resolucionAt` a `certificados`. Docs según AC-12.
- Tests: no aplica (esquema generado y documentación; SETUP.md 3.2).
- [x] Completada

### T2 — Máquina de estados, schema de cambio y botón de envío
- Archivos: `modules/expedientes/utils/transiciones.ts` (modificar), `modules/expedientes/utils/transiciones.test.ts` (modificar), `modules/expedientes/schemas/cambio-estado.schema.ts` (modificar), `modules/expedientes/schemas/cambio-estado.schema.test.ts` (modificar), `modules/expedientes/components/AccionesExpediente.tsx` (modificar)
- Depende de: `certificado-emision` completa
- Grupo paralelo: G1
- Cubre: AC-2, AC-3, AC-7 (botón de envío)
- Detalle: `FLUJO` suma `CERTIFICADO_PENDIENTE_FIRMA: [FINALIZADO]` y `FINALIZADO: [ENTREGADO]`; `DESTINOS_CON_FLUJO_PROPIO` suma `FINALIZADO`; `SOLO_SUPERADMIN` suma el par `CERTIFICADO_PENDIENTE_FIRMA → FINALIZADO`. En `AccionesExpediente`, `ACCION_LABELS.ENTREGADO = "Enviar al cliente"`; no cambia ninguna otra rama.
- Tests: `transiciones.test.ts` (matriz y casos de AC-2); `cambio-estado.schema.test.ts` (casos de AC-3).
- [x] Completada

### T3 — Servicio de aprobación y número de la resolución
- Archivos: `modules/certificados/utils/resolucion-numero.ts` (crear), `modules/certificados/utils/resolucion-numero.test.ts` (crear), `modules/certificados/services/aprobacion.service.ts` (crear), `modules/certificados/services/aprobacion.service.test.ts` (crear)
- Depende de: T1, T2
- Grupo paralelo: G2
- Cubre: AC-4, AC-5
- Tests: `resolucion-numero.test.ts` (AC-4); `aprobacion.service.test.ts` — cliente rechazado, admin `no_permitido` sin `batch`, orden de resultados, `ok` con un solo `db.batch`, fecha de vencimiento = `calcularVencimiento(ahora)`, reintento ante `23505` (hasta 3) y relanzamiento, `conflicto`. `db` mockeado como en `diligencia.service.test.ts`.
- [x] Completada

### T4 — Acción y UI de aprobación
- Archivos: `modules/certificados/actions/aprobacion.actions.ts` (crear), `modules/certificados/actions/aprobacion.actions.test.ts` (crear), `modules/certificados/components/AprobarCertificadoButton.tsx` (crear), `modules/certificados/components/PanelCertificado.tsx` (modificar)
- Depende de: T3
- Grupo paralelo: G3
- Cubre: AC-6, AC-7, AC-11
- Detalle: `AprobarCertificadoButton` es `"use client"` (`useActionState` + `AlertDialog`); `PanelCertificado` completa los textos por estado de AC-7.
- Tests: `aprobacion.actions.test.ts` — `requireRole("superadmin")` primero, id no uuid, mapeo de mensajes, revalidación solo en éxito, usuario de `requireRole` al servicio. Los componentes son presentacionales (SETUP.md 3.2).
- [x] Completada

### T5 — PDF de la Resolución Gerencial
- Archivos: `modules/certificados/services/resolucion-pdf.service.ts` (crear), `modules/certificados/services/resolucion-pdf.service.test.ts` (crear), `modules/certificados/components/ResolucionDocument.tsx` (crear), `app/api/expedientes/[id]/resolucion/route.ts` (crear), `app/api/expedientes/[id]/resolucion/route.test.ts` (crear)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-8, AC-9, AC-10
- Detalle: sigue el patrón de `constancia/route.ts` y `ConstanciaDesignacionDocument.tsx`; `jefeNombre` por historial como en `constancia.service.ts` (estado nuevo `FINALIZADO`).
- Tests: `resolucion-pdf.service.test.ts` — `null` por cada causa de AC-8; cliente propio solo en `ENTREGADO`, ajeno `null`; personal en `FINALIZADO`; `jefeNombre` nulo sin fila de historial; ausencia de `codigo`, documento, teléfono y correo. `route.test.ts` — 401, 404 (id no uuid y datos `null`), 200 con las tres cabeceras y `%PDF` (con `getOrCreateUser`, `getResolucionPdfData` y `renderToBuffer` mockeados). El documento es presentacional (SETUP.md 3.2).
- [x] Completada

## Grupos paralelos
- G1: T1, T2 (archivos disjuntos). G2: T3, T5 (disjuntos; ambos consumen T1, T3 también T2). G3: T4.

## Fases siguientes
- Spec 3 `certificado-pdf-verificacion`.
