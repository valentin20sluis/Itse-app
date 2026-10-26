# Solicitud de ITSE: modelo de datos, reglas y servicios (parte 1 de 3)

Estado: approved

Esta es la parte 1 de `solicitud-itse`. Partes siguientes: `solicitud-itse-wizard.md` (acciones, UploadThing, wizard) y `mis-expedientes.md` (listado del cliente). Ambas dependen de esta.

## Objetivo
Dejar listo, sin UI, todo lo que el wizard necesita: tablas `expedientes`, `expediente_documentos` y `historial_estados`; reglas puras (tipo de ITSE, sugerencia de nivel de riesgo, documentos requeridos, validación de archivos, número de expediente); schemas zod por paso; y servicios con autorización por dueño (borrador, envío, documentos). Además, impide archivar un establecimiento con expedientes en trámite (pendiente anotado en la spec `establecimientos`).

## Fuera de alcance
- Pantallas, Server Actions, UploadThing y wizard (parte 2). Listado "Mis expedientes" (parte 3).
- Bandeja del admin, máquina de estados completa y transiciones del admin (spec 4 `bandeja-estados`). Aquí solo existen `BORRADOR` y `PRESENTADO` en la lógica; el enum de BD ya incluye los 16 estados de reglas-negocio sección 6 para no migrar después.
- Confirmación del nivel de riesgo por el admin (columna propia en `bandeja-estados`; aquí solo se guarda el nivel declarado por el cliente).
- Pagos: reglas-negocio sección 12 deja fuera el pago en línea; solo se registra el número de boleta y se sube el comprobante. No se integra Stripe ni pasarela.
- Descartar/eliminar borradores, subsanar un expediente `OBSERVADO_REQUISITOS` y volver a presentar (spec `subsanacion-plazos`/`bandeja-estados`). Aquí solo se edita en `BORRADOR`.
- Tabla `feriados`, días hábiles, plazos; generación de PDF; snapshot de los datos del establecimiento al presentar (ver "Riesgos").
- Certificado anterior en renovaciones (las reglas no lo piden como dato del trámite).

## Hallazgos (estado actual del repo)
- Existen `usuarios` y `establecimientos` (migraciones 0000 y 0001). `db` usa `neon-http`: sin transacciones interactivas; cada operación debe ser una sentencia (patrón del proyecto). Es la base de la regla de propiedad: filtro `usuario_id` dentro del `WHERE` del `UPDATE/SELECT`, resultado `null` sin distinguir "no existe" de "es de otro".
- `modules/establecimientos/services/establecimiento.service.ts` expone `getEstablecimientoById(actor, id)` (cliente: propio y no archivado; staff: cualquiera). Se reutiliza para validar el establecimiento del borrador.
- `Actor = Pick<Usuario, "id" | "rol">` en `modules/establecimientos/types/establecimiento.types.ts`; `ActionResult` en `lib/action-result.ts`.
- Las reglas de negocio NO definen el formato del número de expediente (solo el del certificado, `0001-2026`). Se decide aquí (ver Decisiones).
- Reglas sección 2.1: el cliente declara el riesgo con preguntas orientativas (función, área, pisos, sótano, inflamables) y el admin confirma; el sistema solo sugiere. Confirmado: el riesgo NO va en `establecimientos`.
- Reglas sección 4: documentos requeridos "configurables por el superadmin"; sección 12: sin firma digital ni pago en línea. Los anexos 1 (solicitud/FUT) y 3 (reporte de nivel de riesgo) equivalen a los datos que el wizard captura.
- No hay UploadThing instalado ni variable `UPLOADTHING_TOKEN` (se usa en la parte 2).

## Decisiones de diseño
- **Anexos 1 y 3 = formulario del wizard.** No se suben como archivo: el sistema los representa con los datos de los pasos 1 a 3. El **Anexo 4** (declaración jurada) es una aceptación electrónica con fecha (`declaracion_aceptada_at`) y texto distinto según el caso: bajo/medio ("cumplimiento de condiciones de seguridad") y renovación de alto/muy alto ("se mantienen las condiciones de seguridad"). Para nueva alto/muy alto no aplica el Anexo 4; la declaración igual se acepta como veracidad de los datos. Resultado: la aceptación es siempre obligatoria, solo cambia el texto (en la parte 2).
- **Documentos subidos** (catálogo en código, no tabla: lo "configurable por el superadmin" queda para `configuracion`): requeridos `PLANO_UBICACION`, `PLANO_DISTRIBUCION`, `PLAN_SEGURIDAD`, `COMPROBANTE_PAGO` (más `numero_boleta` en el expediente); opcionales `POZO_TIERRA`, `EXTINTORES`. Las reglas no condicionan los requeridos por tipo de ITSE (solo el Anexo 4, ya resuelto). Un archivo por tipo (índice único `expediente_id, tipo`); reemplazar = sustituir la fila.
- **Tipo de ITSE no se guarda**: se deriva con `tipoItsePorRiesgo(nivelRiesgo)` (reglas sección 2).
- **Sugerencia de riesgo** (`sugerirNivelRiesgo`), heurística orientativa de reglas 2.1: base `MEDIO` si pisos <= 3 y área <= 750 m²; `ALTO` si pisos > 3 o área > 750; cada factor (sótano, inflamables) sube un nivel, tope `MUY_ALTO`. Nunca sugiere `BAJO` (el cliente puede declararlo; la matriz oficial lo decide el admin). Siempre es solo una sugerencia.
- **Número de expediente**: `EXP-<año>-<correlativo 5 dígitos>` (ej. `EXP-2026-00001`), correlativo por año, año en zona `America/Lima`, asignado al presentar (los borradores no tienen número). Se calcula dentro del `UPDATE` de envío (`max + 1` de ese año en una subconsulta) con índice único sobre `numero`; si choca (`23505`) se reintenta hasta 3 veces. Sin tabla de contadores (YAGNI).
- **Atomicidad del envío**: `UPDATE expedientes SET estado='PRESENTADO', numero, presentado_at, declaracion_aceptada_at ... WHERE id AND usuario_id AND estado='BORRADOR' RETURNING` y luego `INSERT` en `historial_estados`. `neon-http` no da transacción; si falla el segundo paso el expediente queda presentado sin fila de historial (aceptado, `ponytail:` usar `db.batch` si se vuelve crítico). Doble clic: la segunda ejecución no encuentra `BORRADOR`, devuelve `null` y no consume número.
- **Borrador editable solo en `BORRADOR`** y solo por su dueño: toda escritura incluye `usuario_id` y `estado='BORRADOR'` en el `WHERE`.
- **Autorización explícita en servicios** (defensa en profundidad): mutaciones y `listOwn`: solo `cliente` (otro rol lanza `Error("No autorizado")`). Lectura por id y de documentos: `cliente` solo lo propio; `admin`/`superadmin` cualquiera, solo lectura. Funciones nunca reciben `usuarioId` desde fuera: usan `actor.id`.
- **Validación de archivos**: PDF hasta 8 MB, imágenes (JPEG, PNG, WebP) hasta 4 MB (constitución sección 4). Función pura reutilizada por el servidor y el cliente.
- **Archivado de establecimientos**: se rechaza si tiene expedientes en estado distinto de `BORRADOR`, `ANULADO`, `ENTREGADO` o `DERIVADO_COMERCIALIZACION`. Los borradores no bloquean; si el establecimiento se archiva, el envío falla con mensaje y el cliente elige otro en el paso 1.

## Modelo de datos

Enums (`pgEnum`, reutilizados en zod con `.enumValues`): `estado_expediente` (los 16 de reglas sección 6), `tipo_tramite` (`NUEVA`, `RENOVACION`), `nivel_riesgo` (`BAJO`, `MEDIO`, `ALTO`, `MUY_ALTO`), `tipo_documento` (los 6 de arriba).

Tabla `expedientes`:

| Columna SQL | Tipo | Reglas |
|---|---|---|
| `id` | uuid pk | default aleatorio |
| `numero` | text, nulo | único; nulo en borrador |
| `usuario_id` | uuid, no nulo | FK `usuarios.id` `restrict`, índice |
| `establecimiento_id` | uuid, no nulo | FK `establecimientos.id` `restrict`, índice |
| `tipo_tramite` | enum, no nulo | |
| `estado` | enum, no nulo | default `BORRADOR` |
| `nivel_riesgo` | enum, nulo | declarado por el cliente (paso 2) |
| `tiene_sotano`, `almacena_inflamables` | boolean, no nulo | default false |
| `solicitante_nombre` | text, nulo | 3 a 120 caracteres |
| `solicitante_documento` | text, nulo | DNI (8 dígitos) o RUC (11) |
| `solicitante_telefono` | text, nulo | 7 a 9 dígitos |
| `solicitante_email` | text, nulo | email válido |
| `es_representante` | boolean, no nulo | default false |
| `razon_social` | text, nulo | obligatoria si `es_representante`, 3 a 150 |
| `numero_boleta` | text, nulo | 3 a 30, letras, números y guion |
| `declaracion_aceptada_at` | timestamptz, nulo | |
| `presentado_at` | timestamptz, nulo | |
| `created_at`, `updated_at` | timestamptz | default `now()` |

Tabla `expediente_documentos`: `id` uuid pk; `expediente_id` FK `expedientes.id` `restrict`; `tipo` enum; `file_key` text no nulo (clave de UploadThing); `nombre_original` text; `mime_type` text; `tamano_bytes` integer; `created_at`; índice único (`expediente_id`, `tipo`).

Tabla `historial_estados`: `id` uuid pk; `expediente_id` FK `restrict`, índice; `estado_anterior` enum nulo; `estado_nuevo` enum no nulo; `usuario_id` FK `usuarios.id` `restrict`; `comentario` text nulo; `created_at` default `now()`.

## Reutilización
- Existente que se reutiliza: `getEstablecimientoById` y tipo `Actor` de `modules/establecimientos/`; `ActionResult` (`lib/action-result.ts`, lo usa la parte 2); `db`; patrón de servicio con `assertCliente` y fake de BD en tests de `establecimiento.service.test.ts`; `z.flattenError` y estilo de mensajes de `establecimiento.schema.ts`.
- Existente que se extiende: `db/schema.ts` (enums y tablas nuevas); `modules/establecimientos/services/establecimiento.service.ts`, su test y `actions/establecimiento.actions.ts` + test (guardia de archivado, T6).
- Nuevo (y por qué): `modules/expedientes/` (módulo de dominio, constitución sección 2; nada existente cubre expedientes). Helpers de dominio puros en el propio módulo; no son transversales, no van a `lib/`.
- Dependencias / componentes shadcn a instalar antes de implementar: ninguno.
- Prerrequisito manual del usuario: `npm run db:migrate` tras T1 (y antes de usar los servicios contra Neon).

## Criterios de aceptación
- AC-1: `db/schema.ts` define los 4 enums y las 3 tablas de "Modelo de datos" (SQL en snake_case, Drizzle en camelCase), FKs con `restrict`, índices en `usuario_id` y `establecimiento_id` de `expedientes`, índice único en `expedientes.numero` y en (`expediente_id`, `tipo`) de documentos. `npm run db:generate` produce la migración `0002` y `npm run db:migrate` la aplica sin errores.
- AC-2: `tipoItsePorRiesgo` devuelve `POSTERIOR` para BAJO/MEDIO y `PREVIA` para ALTO/MUY_ALTO. `sugerirNivelRiesgo({ areaM2, numeroPisos, tieneSotano, almacenaInflamables })`: 3 pisos y 750 m² sin factores → `MEDIO`; 4 pisos o 750,01 m² → `ALTO`; un factor sube un nivel; ALTO con factor → `MUY_ALTO`; con dos factores nunca excede `MUY_ALTO`. Nunca devuelve `BAJO`.
- AC-3: `DOCUMENTOS` (catálogo con tipo, etiqueta en español y `requerido`) y `documentosFaltantes(subidos)` devuelven exactamente los requeridos que faltan (lista vacía si están los 4 requeridos; los opcionales no cuentan).
- AC-4: `validateArchivo({ name, type, size })` acepta PDF <= 8 MB e imágenes JPEG/PNG/WebP <= 4 MB y rechaza, con mensaje en español: tipo no permitido, PDF > 8 MB, imagen > 4 MB, tamaño 0 y nombre vacío. Los límites son constantes exportadas.
- AC-5: Los schemas `paso1Schema` (establecimientoId `z.uuid()`, tipoTramite enum), `paso2Schema` (nivelRiesgo enum, checkboxes `tieneSotano`/`almacenaInflamables` aceptan `"on"`/ausente), `paso3Schema`, `paso4Schema` (`numeroBoleta`) y `declaracionSchema` (debe ser aceptada) validan lo descrito en "Modelo de datos", recortan espacios y devuelven mensajes en español; `razonSocial` es obligatoria solo si `esRepresentante`.
- AC-6: `formatNumeroExpediente(año, n)` produce `EXP-2026-00001`; el año se calcula con `America/Lima` (test en el límite 31/12 23:30 Lima).
- AC-7: `createBorrador(actor, paso1)` solo `cliente`, fija `usuarioId = actor.id` ignorando cualquier `usuarioId` del input, crea `estado = BORRADOR` y devuelve `null` si el establecimiento no es propio, no existe o está archivado (mismo resultado en ambos casos).
- AC-8: `updateBorrador(actor, id, patch)` actualiza solo campos de paso (nunca `estado`, `numero`, `usuarioId`) con `WHERE id AND usuario_id AND estado='BORRADOR'`; devuelve `null` si el expediente es de otro cliente, no existe o ya no es `BORRADOR`; si el patch trae `establecimientoId`, valida que sea propio y activo.
- AC-9 (IDOR): con un cliente B y un expediente (y documento) del cliente A: `getExpedienteById`, `updateBorrador`, `enviarExpediente`, `listDocumentos`, `registerDocumento`, `removeDocumento` y `getDocumentoForDownload` devuelven `null`/vacío igual que para un id inexistente y no modifican nada.
- AC-10: `getExpedienteById` y `getDocumentoForDownload`: `admin`/`superadmin` leen cualquiera; `cliente` solo lo propio. `createBorrador`, `updateBorrador`, `enviarExpediente`, `listOwnExpedientes`, `registerDocumento` y `removeDocumento` lanzan `Error("No autorizado")` si el actor no es `cliente` (test por rol y función).
- AC-11: `listOwnExpedientes(actor)` devuelve solo los del actor, más reciente primero, con el nombre comercial del establecimiento.
- AC-12: `enviarExpediente(actor, id, declaracionAceptada)` devuelve `{ status: "incompleto", faltantes }` (sin modificar nada) si falta algún paso, `declaracionAceptada` no es `true`, faltan documentos requeridos o el establecimiento está archivado; `{ status: "no_encontrado" }` si no es propio o no está en `BORRADOR`; en éxito pasa a `PRESENTADO`, fija `numero` (`EXP-<año Lima>-<n>`), `presentadoAt`, e inserta en `historial_estados` (`BORRADOR` → `PRESENTADO`, `usuarioId = actor.id`, comentario "Solicitud presentada"). Un segundo envío devuelve `no_encontrado` y no consume número. Si el índice único choca, reintenta hasta 3 veces y luego lanza.
- AC-13: `registerDocumento` solo sobre un expediente propio en `BORRADOR`, valida con `validateArchivo`, reemplaza el archivo del mismo tipo y devuelve la `file_key` anterior (para borrarla de UploadThing); `removeDocumento` es una sola sentencia con filtro de dueño y `BORRADOR`; `listDocumentos` devuelve vacío si el expediente no es visible para el actor.
- AC-14: `archiveEstablecimiento` lanza un error tipado `EstablecimientoConExpedientesError` cuando el establecimiento (propio) tiene expedientes en trámite (estados fuera de la lista de "Decisiones"); con solo borradores o finalizados archiva normalmente; un establecimiento ajeno sigue devolviendo `null` sin revelar nada. `archiveEstablecimientoAction` responde `{ ok: false, error: "No puedes archivar un establecimiento con expedientes en trámite." }` en ese caso.
- AC-15: Todo en español, sin `any` ni `@ts-ignore`, nombres de archivos según SETUP.md; servicios sin imports de Clerk, `next/*` ni `requireRole`. `npm run build`, `npm run lint` y `npx vitest run` pasan.

## Tareas
### T1 — Enums, tablas y tipos
- Archivos: `db/schema.ts` (modificar: solo agregar enums, tablas y tipos inferidos), `modules/expedientes/types/expediente.types.ts` (crear: re-exporta `Expediente`, `ExpedienteDocumento`, `EstadoExpediente`, `NivelRiesgo`, `TipoTramite`, `TipoDocumento` y `ExpedienteListItem = Expediente & { establecimientoNombre: string }`), migración `drizzle/0002_*.sql` y `drizzle/meta/*` (generados con `npm run db:generate`)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-1
- Tests: no aplica (esquema declarativo; se verifica con `db:generate` y build, SETUP.md 3.2)
- [x] Completada

### T2 — Reglas puras: riesgo y catálogo de documentos
- Archivos: `modules/expedientes/utils/riesgo.ts` (crear: `tipoItsePorRiesgo`, `sugerirNivelRiesgo`), `modules/expedientes/utils/riesgo.test.ts` (crear), `modules/expedientes/utils/documentos.ts` (crear: `DOCUMENTOS`, `documentosFaltantes`), `modules/expedientes/utils/documentos.test.ts` (crear)
- Depende de: T1 (tipos de enum)
- Grupo paralelo: G2
- Cubre: AC-2, AC-3
- Tests: `riesgo.test.ts` — tipo de ITSE por cada nivel; sugerencia en los límites (3/4 pisos, 750/750,01 m²), cada factor, ambos factores, tope `MUY_ALTO`, nunca `BAJO`. `documentos.test.ts` — faltantes con 0, 3 y 4 requeridos; opcionales no cuentan; etiquetas en español.
- [x] Completada

### T3 — Schemas zod por paso y validación de archivos
- Archivos: `modules/expedientes/schemas/solicitud.schema.ts` (crear: `paso1Schema` a `paso4Schema`, `declaracionSchema` y tipos `Paso1Input`...), `modules/expedientes/schemas/solicitud.schema.test.ts` (crear), `modules/expedientes/utils/archivo.ts` (crear: `validateArchivo`, `MAX_PDF_BYTES`, `MAX_IMAGE_BYTES`, `ALLOWED_MIME_TYPES`), `modules/expedientes/utils/archivo.test.ts` (crear)
- Depende de: T1 (`enumValues`)
- Grupo paralelo: G2
- Cubre: AC-4, AC-5
- Tests: `solicitud.schema.test.ts` — caso válido por paso; uuid inválido; enums inválidos; checkboxes `"on"`/ausente; DNI 8 y RUC 11 válidos, 9 dígitos y letras inválidos; teléfono; email; `razonSocial` obligatoria solo con representante; boleta con caracteres inválidos; declaración no aceptada; trim; mensajes en español. `archivo.test.ts` — PDF 8 MB válido y 8 MB + 1 inválido; imagen 4 MB válida y 4 MB + 1 inválida; tipo `.exe`/`text/html`; tamaño 0; nombre vacío.
- [x] Completada

### T4 — Servicio de expedientes (borrador, envío, lectura)
- Archivos: `modules/expedientes/services/expediente.service.ts` (crear: `createBorrador`, `updateBorrador`, `getExpedienteById`, `listOwnExpedientes`, `enviarExpediente`, `formatNumeroExpediente`, `getAnioLima`), `modules/expedientes/services/expediente.service.test.ts` (crear)
- Depende de: T1, T2, T3
- Grupo paralelo: G3
- Cubre: AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12
- Detalle: `updateBorrador` recibe un patch tipado (unión de `Paso1Input | Paso2Input | Paso3Input | Paso4Input`) y mapea a columnas; no acepta un objeto libre. `enviarExpediente` re-valida con los schemas `paso1` a `paso4`, `declaracionSchema` (a partir de `declaracion_aceptada_at`, que `enviarExpediente(actor, id, declaracionAceptada: boolean)` fija al aceptar) y `documentosFaltantes` leyendo `expediente_documentos` directamente (no depende de T5). Sin Clerk, `next/*` ni `requireRole`.
- Tests: con `@/db` y `getEstablecimientoById` mockeados (fake en memoria que respete el `where`, como en `establecimiento.service.test.ts`): todos los casos de AC-6 a AC-12, incluido el reintento por conflicto de número y el límite de año.
- [x] Completada

### T5 — Servicio de documentos
- Archivos: `modules/expedientes/services/documento.service.ts` (crear: `listDocumentos`, `registerDocumento`, `removeDocumento`, `getDocumentoForDownload`), `modules/expedientes/services/documento.service.test.ts` (crear)
- Depende de: T1, T3 (`validateArchivo`)
- Grupo paralelo: G3
- Cubre: AC-9 (documentos), AC-10 (documentos), AC-13
- Detalle: sin llamar a UploadThing (el borrado del archivo remoto lo hace la capa de acciones con la clave devuelta).
- Tests: `@/db` mockeado: registrar con archivo válido e inválido; reemplazo devuelve la clave anterior; cliente B no registra, borra, lista ni descarga lo de A; no se registra ni borra en un expediente ya `PRESENTADO`; staff lista y descarga; roles no cliente lanzan `No autorizado` en mutaciones.
- [x] Completada

### T6 — No archivar establecimientos con expedientes en trámite
- Archivos: `modules/establecimientos/services/establecimiento.service.ts` (modificar: agregar `EstablecimientoConExpedientesError` y la guardia en `archiveEstablecimiento`), `modules/establecimientos/services/establecimiento.service.test.ts` (modificar), `modules/establecimientos/actions/establecimiento.actions.ts` (modificar: capturar el error tipado con el mensaje de AC-14), `modules/establecimientos/actions/establecimiento.actions.test.ts` (modificar)
- Depende de: T1 (tabla `expedientes`)
- Grupo paralelo: G2
- Cubre: AC-14
- Detalle: el `UPDATE` de archivado incluye `NOT EXISTS (expedientes en trámite)` además del filtro de dueño; la consulta previa solo se ejecuta tras comprobar que el establecimiento es propio, para no revelar existencia. No se tocan los demás comportamientos.
- Tests: ampliar los existentes: con expediente `PRESENTADO` lanza el error; con solo `BORRADOR`/`ENTREGADO` archiva; ajeno devuelve `null`; la acción traduce el error al mensaje.
- [x] Completada

## Grupos paralelos
G1: T1. G2: T2, T3, T6 (archivos disjuntos). G3: T4, T5 (archivos disjuntos).

## Riesgos conocidos (no se resuelven aquí)
- El expediente referencia al establecimiento "en vivo": si el cliente edita el local después de presentar, el admin ve los datos nuevos. Mitigación futura: copiar los datos al presentar o bloquear la edición; se decide en `bandeja-estados`/`certificados`.
- El envío no es transaccional (ver Decisiones).

## Fases siguientes
- `solicitud-itse-wizard`: acciones, UploadThing, descarga protegida y wizard.
- `mis-expedientes`: listado del cliente.
- `bandeja-estados`: máquina de transiciones completa, nivel de riesgo confirmado por el admin, lectura de historial y de todos los expedientes para staff.
