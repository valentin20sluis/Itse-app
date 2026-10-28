# Evidencia de subsanación y evaluación (EN_SUBSANACION → CUMPLE | NO_CUMPLE)

Estado: approved

> Nota (cambio posterior): se retira el campo «Informe» de los formularios del personal. Ya no hay texto del admin ni `motivo_requerido` en estos flujos: el servicio guarda un comentario automático en el historial («Resultado de la inspección: Cumple.» / «No cumple.» / «Observaciones subsanables.», con el plazo y la reprogramación como hasta ahora; «Evaluación de la subsanación: Cumple.» / «Sigue en subsanación.» / «No cumple.»). Donde esta spec menciona el informe (10 a 1000 caracteres), léase sustituido por ese comentario.

Parte 4 de 4 de `subsanacion-plazos`. **Depende de `observaciones-diligencia`** (columna `subsanacion_limite`, estado `EN_SUBSANACION` con observaciones, `PlazoSubsanacion`, `getResumenSubsanacion`), de `plazos-dias-habiles` (`estadoPlazo`, `TipoItse`) y de `subsanacion-requisitos` (comparten `documento.service.ts`, `documentos.ts` y `app/api/uploadthing/core.ts`, que esa spec ya generalizó a «estados editables»).

## Objetivo
Cerrar la subsanación de la diligencia. En **ITSE posterior** el cliente sube una declaración jurada y un panel fotográfico dentro del plazo (3 días hábiles) y los presenta; el admin evalúa si cumple, si debe corregir más dentro del mismo plazo o si no cumple. En **ITSE previa** (20 días hábiles) no hay archivos del cliente: los inspectores vuelven en la fecha reprogramada y el admin registra el resultado (`reglas-negocio` 7.2). Si el plazo vence sin subsanación completa, el admin registra «No cumple» (7.5).

## Fuera de alcance
- Marca de «plazo vencido» en la **bandeja** de expedientes (ver decisión 6): aquí se ve en el detalle del cliente y del personal.
- Job o cron que pase solo a `NO_CUMPLE` al vencer el plazo (el vencimiento se calcula al leer; el admin decide).
- Ampliar el plazo ni más de una devolución con plazo nuevo: «sigue en subsanación» no extiende la fecha límite.
- `CUMPLE → CERTIFICADO_PENDIENTE_FIRMA` y `NO_CUMPLE → DERIVADO_COMERCIALIZACION`: specs `certificados` y de derivación.
- Resultados 7.1.4 y 7.1.5: spec `diligencia-no-concluida`.
- Correo o SMS de aviso.

## Decisiones (a confirmar al aprobar)
1. **Evidencia como documentos del expediente** con dos tipos nuevos en `tipoDocumentoEnum`: `SUBSANACION_DECLARACION_JURADA` (solo PDF, hasta 8 MB) y `SUBSANACION_PANEL_FOTOGRAFICO` (PDF hasta 8 MB o imagen hasta 4 MB; un solo archivo con la leyenda de cada foto, por ejemplo un PDF). Se reutilizan `DocumentoUploader`, `documentoExpediente` y el índice único `(expediente, tipo)`: reemplazar un archivo lo sustituye. No hay tabla nueva.
2. **«Presentar» no cambia el estado:** `reglas-negocio` 6.1 solo permite `EN_SUBSANACION → CUMPLE | NO_CUMPLE`. Presentar fija `expedientes.subsanacion_presentada_at` y registra una entrada de historial con el mismo estado (`EN_SUBSANACION → EN_SUBSANACION`, como ya hace el cambio de riesgo). Mientras esté presentada, el cliente no puede cambiar los archivos.
3. **«Sigue en subsanación»** = el admin devuelve la evidencia con un comentario (obligatorio, el cliente lo ve): limpia `subsanacion_presentada_at` y el cliente puede corregir y volver a presentar **dentro del mismo plazo**. Solo en posterior, solo si hay evidencia presentada y el plazo no venció.
4. **Reglas de evaluación (función pura `opcionesEvaluacion`):** POSTERIOR: «Cumple» solo si hay evidencia presentada; «Sigue en subsanación» solo si hay evidencia presentada y el plazo no venció; «No cumple» siempre. PREVIA: «Cumple» y «No cumple» siempre (sin «Sigue»). Con el plazo vencido y sin evidencia presentada en posterior, solo queda «No cumple». Una evidencia presentada a tiempo se puede evaluar aunque el plazo ya haya vencido.
5. **Plazo vencido para el cliente:** vencido = la fecha de hoy en Lima es posterior a la fecha límite (`estadoPlazo`). Vencido, el cliente no puede subir, quitar ni presentar.
6. **Bandeja sin marca de vencimiento** en esta spec (necesitaría cambiar `bandeja.service`, sus tipos y la vista): se propone como spec corta posterior. El detalle del expediente sí muestra «Plazo vencido» (de la parte 3) en cliente y personal.
7. Un `NO_CUMPLE` desde `EN_SUBSANACION` conserva las observaciones ya registradas; el informe de evaluación es el comentario del historial y lo ve el cliente (el formulario lo avisa).

## Reutilización
- Existente que se reutiliza: `aplicar` (`transicion.service.ts`, incluso con `desde === hasta`); `DocumentoUploader`; `documentoFileRouter`; `registerDocumento`/`removeDocumento`; `PlazoSubsanacion`, `ObservacionesLista` y `getResumenSubsanacion` (parte 3); `estadoPlazo`; `formatFecha`; `requireRole`; `ActionResult`; `AlertDialog`, `Button`, `Label`, `Textarea`, `Card` de `components/ui/`; patrón de formularios con `useActionState` de `ResultadoDiligenciaForm`.
- Existente que se extiende: `db/schema.ts` (+2 valores de enum, +1 columna); `transiciones.ts` (`EN_SUBSANACION → CUMPLE | NO_CUMPLE`); `utils/documentos.ts`; `documento.service.ts`; `core.ts`; `PanelInspeccion.tsx`; `ExpedienteDetalleCliente.tsx`; `ExpedienteDatos.tsx`; `HistorialTimeline.tsx`.
- Nuevo (y por qué): `utils/subsanacion.ts` (reglas 7.2 y 7.5 compartidas por servicio y formulario); `services/subsanacion.service.ts` (presentar y evaluar: flujos con reglas propias, distintos de `registrarResultadoDiligencia`); `schemas/subsanacion.schema.ts`; `actions/subsanacion.actions.ts`; `components/SubsanacionCliente.tsx`; `components/EvaluarSubsanacionForm.tsx`.
- Dependencias / componentes shadcn a instalar: ninguno.
- **Migración (la genera el developer en T1; el humano corre `npm run db:migrate`):** siguiente número libre (hoy `0017`): `ALTER TYPE "tipo_documento" ADD VALUE` ×2 y `ALTER TABLE "expedientes" ADD COLUMN "subsanacion_presentada_at"`. Solo agrega.

## Specs afectadas
- `subsanacion-requisitos`: `documento.service.ts`, `core.ts` y `documentos.ts` ganan una rama por tipo (los tipos de requisitos siguen exigiendo `BORRADOR` u `OBSERVADO_REQUISITOS`; los de subsanación exigen `EN_SUBSANACION` en las condiciones de AC-3). Sin cambios para el flujo de requisitos.
- `observaciones-diligencia`: `EN_SUBSANACION` gana sus salidas; `PanelInspeccion` agrega el formulario de evaluación; `ExpedienteDetalleCliente` agrega `SubsanacionCliente`.
- `diligencia-inspeccion` / `bandeja-estados`: la matriz 18 × 18 suma `EN_SUBSANACION → CUMPLE | NO_CUMPLE`.
- `solicitud-itse-wizard`: `TIPOS_SOLO_PDF` incluye la declaración jurada; el wizard no lista los tipos de subsanación (`DOCUMENTOS` no cambia).
- `docs/reglas-negocio-itse.md`: sin cambios; implementa 7.2 y 7.5.

## Criterios de aceptación
- AC-1 (esquema): `tipoDocumentoEnum` incluye `SUBSANACION_DECLARACION_JURADA` y `SUBSANACION_PANEL_FOTOGRAFICO`; `expedientes.subsanacionPresentadaAt` (timestamptz, nula); migración que solo hace `ALTER TYPE ... ADD VALUE` ×2 y `ALTER TABLE ... ADD COLUMN`.
- AC-2 (máquina pura): `transicionesPermitidas("EN_SUBSANACION", "admin")` es `["CUMPLE", "NO_CUMPLE"]` (superadmin además `ANULADO`); `transicionesGenericas("EN_SUBSANACION", rol)` solo deja `ANULADO` (superadmin); `cliente` siempre `[]`; la matriz 18 × 18 falla si algún par no listado es permitido.
- AC-3 (reglas puras, `utils/subsanacion.ts`): `opcionesEvaluacion({ tipoItse, presentada, vencido })` devuelve, en el orden `["CUMPLE", "SIGUE_EN_SUBSANACION", "NO_CUMPLE"]` filtrado, las opciones de la decisión 4 (tabla completa de 2 × 2 × 2 combinaciones). `puedeSubirEvidencia({ tipoItse, presentada, vencido })` es `true` solo si `tipoItse === "POSTERIOR"`, `presentada` es `false` y `vencido` es `false`.
- AC-4 (documentos): `documentos.ts` exporta `DOCUMENTOS_SUBSANACION` (los 2 tipos nuevos con etiquetas «Declaración jurada de subsanación» y «Panel fotográfico de subsanación (con leyenda)»), `esDocumentoSubsanacion(tipo)`, y `TIPOS_SOLO_PDF` incluye la declaración jurada; `DOCUMENTOS` y `documentosRequeridos` no los incluyen. `validateArchivo` rechaza una imagen para la declaración jurada («Este documento debe ser un PDF.») y acepta imagen o PDF para el panel.
- AC-5 (autorización de documentos): `registerDocumento`, `removeDocumento` y el `middleware` de `documentoExpediente` (vía una función exportada `puedeSubirDocumento(actor, expedienteId, tipo, ahora?)` del servicio, para no duplicar la condición) aceptan un tipo de subsanación solo si el expediente es del cliente, está en `EN_SUBSANACION`, su `nivel_riesgo` es BAJO o MEDIO, `subsanacion_presentada_at` es nula y `subsanacion_limite + 1 día > ahora` (el último día vale completo en Lima). Para otros estados, ajeno, presentada o vencida: `null` sin escribir (el middleware lanza «No se encontró la solicitud.»). Los tipos de requisitos conservan su regla de `subsanacion-requisitos` y no se pueden subir en `EN_SUBSANACION`. El rol distinto de `cliente` lanza `Error("No autorizado")`.
- AC-6 (presentar, servicio): `presentarSubsanacion(actor, id, ahora?)` lanza `Error("No autorizado")` si `actor.rol !== "cliente"`. Resultados en orden: `no_encontrado` (no existe o no es suyo) → `no_permitido` (estado distinto de `EN_SUBSANACION`, tipo PREVIA, o ya presentada) → `vencido` → `incompleto` (falta alguno de los 2 documentos) → `conflicto` → `ok`. En `ok`, **un** `db.batch` (vía `aplicar` con `EN_SUBSANACION → EN_SUBSANACION`) que fija `subsanacion_presentada_at = ahora` con guarda `presentada IS NULL` y plazo vigente, y registra el historial «Subsanación presentada por el solicitante.». Sin `ok`/`conflicto` no se invoca `db.batch`.
- AC-7 (evaluar, servicio): `evaluarSubsanacion(actor, id, { resultado, informe }, ahora?)` con `resultado ∈ {CUMPLE, NO_CUMPLE, SIGUE_EN_SUBSANACION}` lanza `Error("No autorizado")` para `cliente`. Resultados en orden: `no_encontrado` → `no_permitido` (estado distinto de `EN_SUBSANACION`, o `nivelRiesgo` nulo, o `SIGUE_EN_SUBSANACION` en PREVIA) → `motivo_requerido` (informe de menos de 10 caracteres) → `sin_evidencia` (`CUMPLE` o `SIGUE` en posterior sin evidencia presentada) → `plazo_vencido` (`SIGUE` con plazo vencido) → `conflicto` → `ok`. La permisión coincide siempre con `opcionesEvaluacion`. En `ok`, **un** `db.batch` (vía `aplicar`): `CUMPLE` y `NO_CUMPLE` cambian el estado; `SIGUE` mantiene `EN_SUBSANACION`, pone `subsanacion_presentada_at = null` y exige en el `WHERE` que siga presentada y vigente; el comentario del historial es el informe recortado. Sin `ok`/`conflicto` no se invoca `db.batch`.
- AC-8 (schema y acciones): `evaluacionSubsanacionSchema` valida `resultado` (los 3 valores, mensaje «Elige el resultado.») e `informe` de 10 a 1000 caracteres. `presentarSubsanacionAction(id)`: `requireRole("cliente")` primero, id uuid, servicio con el usuario de `requireRole`. `evaluarSubsanacionAction(id, prev, formData)`: `requireRole("admin", "superadmin")` primero, id uuid, Zod con `fieldErrors`, servicio con el usuario de `requireRole`. Mensajes: `no_encontrado` «No se encontró el expediente.»; `no_permitido` «Esa acción no está disponible para este expediente.»; `vencido` «El plazo para subsanar venció.»; `incompleto` «Sube la declaración jurada y el panel fotográfico antes de presentar.»; `sin_evidencia` «El solicitante aún no presentó la subsanación.»; `plazo_vencido` «El plazo venció: solo puedes registrar "Cumple" o "No cumple".»; `motivo_requerido` «Escribe un informe de al menos 10 caracteres.»; `conflicto` «El expediente cambió de estado. Actualiza la página e inténtalo de nuevo.»; error inesperado «No se pudo guardar el cambio. Inténtalo de nuevo.». Solo en éxito revalidan `/panel/expedientes`, `/panel/expedientes/<id>`, `/mi-cuenta/expedientes` y `/mi-cuenta/expedientes/<id>`.
- AC-9 (UI del personal): en `EN_SUBSANACION`, `PanelInspeccion` muestra, además de lo de la parte 3, `EvaluarSubsanacionForm` con las opciones de `opcionesEvaluacion` (las no permitidas no se muestran; si solo queda una, igual se elige con radio), los documentos de subsanación como enlaces de descarga (vía `ExpedienteDatos`), el estado de la evidencia («Presentada el dd/MM/yyyy» / «Aún no presentada») y `PlazoSubsanacion`. El formulario: `<fieldset>` con `<legend>` «Resultado» y radios «Cumple» / «Sigue en subsanación» / «No cumple»; `<label>` «Informe» con `textarea` (`required`, `minLength=10`, `maxLength=1000`) y el aviso «El solicitante verá este informe.»; errores por campo con `aria-invalid`/`aria-describedby` y mensaje general en `role="alert"`; `AlertDialog` de confirmación antes de enviar.
- AC-10 (UI del cliente): en `EN_SUBSANACION`, `ExpedienteDetalleCliente` muestra `SubsanacionCliente`: en POSTERIOR, las instrucciones en lenguaje llano («Sube una declaración jurada y un panel fotográfico con una leyenda que muestre cómo corregiste cada observación.»), un `DocumentoUploader` por cada tipo de subsanación (ambos «Obligatorio») mientras `puedeSubirEvidencia`, y el botón «Presentar subsanación» (`h-11`, deshabilitado hasta tener ambos archivos) con `useActionState`; si ya presentó, «Presentada el dd/MM/yyyy. Estamos evaluándola.» sin uploaders; si venció sin presentar, «El plazo venció. Ya no puedes subir archivos.». En PREVIA muestra «La inspección se reprogramó para el dd/MM/yyyy. Los inspectores volverán: no necesitas subir archivos.». `ExpedienteDatos` etiqueta los documentos de subsanación con `DOCUMENTOS_SUBSANACION` (no «Documento adjunto»). `HistorialTimeline` muestra «Seguimiento de la subsanación» para entradas `EN_SUBSANACION → EN_SUBSANACION` (el «Nivel de riesgo actualizado» actual se conserva para las demás) y no muestra nombres del personal al cliente.
- AC-11 (aislamiento): ningún servicio ni acción de evaluación acepta a `cliente`; ninguno de presentación acepta personal; un cliente no puede subir, quitar ni presentar sobre un expediente ajeno; la UI del cliente no contiene el formulario de evaluación.
- AC-12 (responsive y accesibilidad): sin desborde horizontal a 360, 768 y 1280 px; botones `h-11`; estado y plazo siempre con texto; foco visible; solo tokens del tema; sin `any`/`@ts-ignore`.
- AC-13: `npm run build`, `npm run lint` y `npx vitest run` pasan.

## Tareas
### T1 — Esquema y migración
- Archivos: `db/schema.ts` (modificar), `drizzle/0017_*.sql` (crear, generado), `drizzle/meta/0017_snapshot.json` (crear, generado), `drizzle/meta/_journal.json` (modificar, generado)
- Depende de: `observaciones-diligencia` T1
- Grupo paralelo: G1
- Cubre: AC-1
- Detalle: `DATABASE_URL="postgres://u:p@localhost/db" npm run db:generate`; usar el siguiente número libre. El humano corre `npm run db:migrate`.
- Tests: no aplica (esquema generado).
- [x] Completada

### T2 — Máquina de estados y reglas de evaluación
- Archivos: `modules/expedientes/utils/transiciones.ts` (modificar), `modules/expedientes/utils/transiciones.test.ts` (modificar), `modules/inspecciones/utils/subsanacion.ts` (crear), `modules/inspecciones/utils/subsanacion.test.ts` (crear)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-2, AC-3
- Tests: matriz 18 × 18 rol por rol; `opcionesEvaluacion` y `puedeSubirEvidencia` en las 8 combinaciones cada una.
- [x] Completada

### T3 — Documentos de subsanación: tipos, autorización y UploadThing
- Archivos: `modules/expedientes/utils/documentos.ts` (modificar), `modules/expedientes/utils/documentos.test.ts` (modificar), `modules/expedientes/services/documento.service.ts` (modificar), `modules/expedientes/services/documento.service.test.ts` (modificar), `app/api/uploadthing/core.ts` (modificar)
- Depende de: T1, `subsanacion-requisitos` T2
- Grupo paralelo: G2
- Cubre: AC-4, AC-5, AC-11 (documentos)
- Tests: `documentos.test.ts` (lista, `esDocumentoSubsanacion`, `TIPOS_SOLO_PDF`, `validateArchivo` con DJ imagen/PDF y panel imagen/PDF); `documento.service.test.ts` — cada condición de AC-5 por separado (estado, riesgo, presentada, límite exacto: `limite + 1 día` es vencido), tipo de requisitos rechazado en `EN_SUBSANACION`, ajeno, personal.
- [x] Completada

### T4 — Servicio y schema de subsanación
- Archivos: `modules/inspecciones/services/subsanacion.service.ts` (crear), `modules/inspecciones/services/subsanacion.service.test.ts` (crear), `modules/inspecciones/schemas/subsanacion.schema.ts` (crear), `modules/inspecciones/schemas/subsanacion.schema.test.ts` (crear)
- Depende de: T1, T2
- Grupo paralelo: G2
- Cubre: AC-6, AC-7, AC-8 (schema), AC-11 (servicios)
- Tests: servicio con `db` mockeado — cada resultado de AC-6 y AC-7 en su orden, un solo `db.batch`, `SIGUE` limpia la presentación, `CUMPLE` en PREVIA sin evidencia permitido, `Error("No autorizado")` en ambos sentidos, coherencia con `opcionesEvaluacion`; schema — resultado inválido, informe 9/10/1000/1001 caracteres, espacios.
- [x] Completada

### T5 — Acciones y formulario de evaluación del personal
- Archivos: `modules/inspecciones/actions/subsanacion.actions.ts` (crear), `modules/inspecciones/actions/subsanacion.actions.test.ts` (crear), `modules/inspecciones/components/EvaluarSubsanacionForm.tsx` (crear), `modules/inspecciones/components/EvaluarSubsanacionForm.test.tsx` (crear), `modules/inspecciones/components/PanelInspeccion.tsx` (modificar)
- Depende de: T4
- Grupo paralelo: G3
- Cubre: AC-8 (acciones), AC-9, AC-11 (acciones y UI), AC-12 (personal)
- Detalle: `PanelInspeccion` calcula `vencido` con `estadoPlazo(limite, new Date())` y `presentada` con `expediente.subsanacionPresentadaAt`, y pasa `tipoItse` de `getResumenSubsanacion`; ambas acciones comparten el helper de revalidación dentro del archivo.
- Tests: acciones — orden `requireRole` → uuid → (Zod) → servicio, usuario de `requireRole`, cada mensaje, `revalidatePath` solo en éxito; formulario — solo muestra las opciones permitidas según props, botón de envío abre la confirmación.
- [x] Completada

### T6 — Vista del cliente, documentos e historial
- Archivos: `modules/inspecciones/components/SubsanacionCliente.tsx` (crear), `modules/expedientes/components/ExpedienteDetalleCliente.tsx` (modificar), `modules/expedientes/components/ExpedienteDatos.tsx` (modificar), `modules/expedientes/components/HistorialTimeline.tsx` (modificar)
- Depende de: T3, T5
- Grupo paralelo: G4
- Cubre: AC-10, AC-11 (UI), AC-12 (cliente)
- Detalle: `ExpedienteDetalleCliente` calcula `puedeSubirEvidencia` (con `estadoPlazo` y `expediente.subsanacionPresentadaAt`) y se lo pasa a `SubsanacionCliente`, que es presentacional con `useActionState`; las páginas no se tocan.
- Tests: componentes presentacionales (SETUP.md 3.2): sin test propio; la lógica ya está probada en T2.
- [x] Completada

## Grupos paralelos
- G1: T1 y T2 (archivos disjuntos). G2: T3 y T4 (archivos disjuntos). G3: T5. G4: T6.

## Fases siguientes
- Marca de plazos vencidos en la bandeja (spec corta).
- `certificados` (`CUMPLE → CERTIFICADO_PENDIENTE_FIRMA`) y derivación (`NO_CUMPLE → DERIVADO_COMERCIALIZACION`).
- `diligencia-no-concluida` (7.1.4 y 7.1.5).
