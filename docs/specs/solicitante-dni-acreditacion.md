# DNI del solicitante y acreditación de representación

Estado: approved

## Objetivo
En el paso 3 "Solicitante" del wizard, el cliente declara su calidad (propietario, representante legal o administrador), sube su DNI (ambas caras, un solo PDF) y, si no es propietario, el documento que acredita su representación (poder, designación, etc.). Ambos son obligatorios para pagar y se muestran en el Resumen. Datos siempre ficticios.

## Fuera de alcance
- Validar el contenido del DNI o del poder (revisión humana del admin, otra spec).
- Verificación contra RENIEC.
- Limpieza de la acreditación ya subida cuando la calidad vuelve a Propietario (el archivo se conserva, solo deja de ser requerido).
- Bloquear "Siguiente" del paso 3 por falta de archivos (se exige al pagar, igual que el paso 4).
- Mostrar estos documentos en el paso 4 (siguen fuera de él).

## Reutilización
- Existente que se reutiliza: `DocumentoUploader` (subida, "Ver archivo", "Quitar" vía `removeDocumentoAction`), `documentosFaltantes`/`faltantesBorrador`/`prepararPago` (ya consumen `documentosRequeridos`, sin cambios de lógica), `registerDocumento`, ruta `/api/documentos/[id]` (descarga por `tipo`), `NOMBRES_FALTANTE` (itera `DOCUMENTOS`, toma las etiquetas nuevas sin tocarlo), `checkbox`/`texto` de `solicitud.schema.ts`.
- Existente que se extiende: `db/schema.ts` (enum `tipo_documento` + enum `calidad_solicitante` + columna en `expedientes`); `utils/documentos.ts` (catálogo, `ContextoDocumentos`, regla); `utils/archivo.ts` (`validateArchivo` con `tipo` opcional); `app/api/uploadthing/core.ts` (pasa `tipo` a `validateArchivo`); `paso3Schema`; `patchToValues`; `parsePaso(3)`; `StepSolicitante`, `DocumentoUploader`, `StepDocumentos`, `StepResumen`, `SolicitudWizard`; `docs/reglas-negocio-itse.md`.
- Nuevo (y por qué): constantes `DOCUMENTOS_SOLICITANTE` y `TIPOS_SOLO_PDF` en `utils/documentos.ts` (no existe agrupación de documentos del paso 3). Ningún componente nuevo.
- Dependencias / componentes shadcn a instalar antes de implementar: ninguno. Preparación del orquestador: `DATABASE_URL="postgres://u:p@localhost/db" npm run db:generate` (T1) y, tras T1, el humano corre `npm run db:migrate`.

## Decisiones y supuestos
1. Enum de BD `calidad_solicitante` = `PROPIETARIO | REPRESENTANTE_LEGAL | ADMINISTRADOR`; columna `calidad_solicitante` not null default `PROPIETARIO` (los borradores existentes quedan como propietario). `tipo_documento` suma `DNI_AMBAS_CARAS` y `ACREDITACION_REPRESENTACION` con `ADD VALUE` (migración `0010`, sin DROP).
2. Catálogo: `DNI_AMBAS_CARAS` -> "DNI (ambas caras, en un solo PDF)"; `ACREDITACION_REPRESENTACION` -> "Documento que acredita la representación (poder, designación u otro)". Se agregan al inicio de `DOCUMENTOS` (orden de salida de `documentosRequeridos`: DNI, acreditación, luego el resto).
3. `documentosRequeridos` (mismas reglas previas) con una excepción: si `nivelRiesgo` es null devuelve `[]` como hoy (el paso 2 ya figura como faltante). Con nivel: `DNI_AMBAS_CARAS` siempre; `ACREDITACION_REPRESENTACION` si `calidadSolicitante !== "PROPIETARIO"`. `ContextoDocumentos` suma `calidadSolicitante` (requerido; viene de `Expediente`).
4. `DOCUMENTOS_SOLICITANTE = ["DNI_AMBAS_CARAS", "ACREDITACION_REPRESENTACION"]` = lo que se sube en el paso 3 y se excluye del paso 4. `TIPOS_SOLO_PDF` = los mismos dos.
5. Solo PDF: `validateArchivo({ name, type, size, tipo? })` rechaza con "Este documento debe ser un PDF." si `tipo` está en `TIPOS_SOLO_PDF` y `type !== "application/pdf"`; el límite de 8 MB de PDF ya existe. Cliente: `DocumentoUploader` pasa `tipo` y usa `accept="application/pdf"` para esos tipos. Servidor: `onUploadComplete` del file router pasa `metadata.tipo`; si falla borra el archivo (flujo actual). No se crea un segundo file route (YAGNI).
6. Paso 3: radios nativos (`fieldset`/`legend` "Calidad del solicitante", `name="calidadSolicitante"`) y la lista de uploaders va fuera del `<form>` (la acción de guardar no depende de los archivos). La acreditación se muestra según la opción elegida en el estado local del formulario; que sea requerida depende de la calidad guardada.
7. `StepSolicitante` recibe `documentos: ExpedienteDocumento[]` desde `SolicitudWizard` y renderiza un `<ul>` con `DocumentoUploader` (`obligatorio` true).
8. Seguridad: el tipo se valida contra el enum en el input del file router; la acción usa `requireRole("cliente")` y filtro por dueño (ya existente); `calidadSolicitante` se valida con `z.enum` en el servidor, nunca se confía en el cliente para decidir qué es requerido.

## Specs afectadas
- `solicitud-itse-datos`: **AC-5** (`paso3Schema` suma `calidadSolicitante`) y el catálogo (suma 2 tipos); AC de IDOR/`registerDocumento` siguen vigentes.
- `solicitud-itse-wizard`: ACs del paso 3 Solicitante (suma radios y uploaders) y del Resumen (suma "Calidad" y los 2 documentos); AC de límites de archivo (imagen permitida) quedan acotados: no aplica a los 2 tipos nuevos.
- `documentos-por-riesgo`: **AC-3** y **AC-4** (`documentosRequeridos`/`documentosFaltantes` incluyen DNI siempre y acreditación según calidad; "ninguna salida incluye..." sigue); **AC-9** (el paso Documentos lista `documentosRequeridos` **menos** `DOCUMENTOS_SOLICITANTE`; el Resumen sí los lista).
- `pago-stripe`: **AC-2/AC-5/AC-10/AC-14** (`faltantesBorrador` ahora exige DNI y, si corresponde, acreditación; `prepararPago` devuelve `incompleto` si faltan; borradores sin DNI dejan de estar "completos", así que `pagoPendiente` y el paso inicial 5 cambian en consecuencia).

## Criterios de aceptación
- AC-1: `tipoDocumentoEnum` contiene `DNI_AMBAS_CARAS` y `ACREDITACION_REPRESENTACION`; existe `calidadSolicitanteEnum` (3 valores) y `expedientes.calidad_solicitante` not null default `PROPIETARIO`. `db:generate` produce `0010` con `ADD VALUE` y `CREATE TYPE`/`ADD COLUMN` (sin DROP); `db:migrate` la aplica.
- AC-2: `documentosRequeridos` con nivel no nulo incluye siempre `DNI_AMBAS_CARAS`; incluye `ACREDITACION_REPRESENTACION` solo con `REPRESENTANTE_LEGAL` o `ADMINISTRADOR`; con nivel null devuelve `[]`; sin duplicados; DNI y acreditación van antes del resto del catálogo.
- AC-3: `documentosFaltantes` y `faltantesBorrador` reportan `DNI_AMBAS_CARAS` si no está subido y `ACREDITACION_REPRESENTACION` si la calidad no es propietario y no está subida; con propietario y acreditación subida (sobrante) no hay faltante ni bloqueo.
- AC-4: `validateArchivo` con `tipo` `DNI_AMBAS_CARAS` o `ACREDITACION_REPRESENTACION` rechaza `image/jpeg`, `image/png` y `image/webp` con "Este documento debe ser un PDF."; acepta PDF de hasta 8 MB y rechaza PDF de más de 8 MB; sin `tipo` o con otro tipo el comportamiento previo no cambia (imagen aceptada).
- AC-5: el file router llama `validateArchivo` con `tipo: metadata.tipo`; ante imagen para un tipo solo-PDF borra el archivo (`deleteUploadedFile`) y lanza `UploadThingError` sin llamar `registerDocumento` (revisión de código/grep; no hay test de `core.ts`).
- AC-6: `paso3Schema` exige `calidadSolicitante` en `PROPIETARIO|REPRESENTANTE_LEGAL|ADMINISTRADOR` (valor ajeno o ausente -> error "Selecciona la calidad del solicitante."); `parsePaso(3)` la lee del formulario y `patchToValues` la persiste; `updateBorrador` paso 3 guarda la calidad.
- AC-7: `StepSolicitante` muestra el grupo de radios "Calidad del solicitante" con Propietario preseleccionado (o el valor guardado), operable con teclado (radios nativos con `label`); siempre muestra el uploader del DNI; muestra el uploader de la acreditación solo si la opción elegida no es Propietario; ambos aceptan solo PDF (`accept="application/pdf"`) y muestran el error de `validateArchivo` ante una imagen sin llamar a `startUpload`. "Siguiente" no queda deshabilitado por la falta de archivos.
- AC-8: `StepDocumentos` no lista `DNI_AMBAS_CARAS` ni `ACREDITACION_REPRESENTACION` aunque sean requeridos; el resto del listado no cambia. `StepResumen` los lista con estado Subido/Pendiente, muestra "Calidad del solicitante" (Propietario / Representante legal / Administrador) y los incluye en el mensaje "Faltan documentos obligatorios".
- AC-9: `iniciarPagoAction`/`prepararPago` devuelve `incompleto` con las etiquetas "DNI (ambas caras, en un solo PDF)" y, si corresponde, "Documento que acredita la representación..." cuando faltan.
- AC-10: `docs/reglas-negocio-itse.md` sección 4 documenta la calidad del solicitante, el DNI obligatorio siempre, la acreditación obligatoria para representante legal/administrador y que ambos son solo PDF.
- AC-11: `npm run build`, `npm run lint` y `npx vitest run` pasan.

## Tareas
### T1 — Enums y columna en la BD
- Archivos: `db/schema.ts` (modificar), `drizzle/0010_*.sql` (crear, generado), `drizzle/meta/0010_snapshot.json` (crear, generado), `drizzle/meta/_journal.json` (modificar, generado)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-1
- Tests: no aplica (esquema; se verifica con `db:generate`/`db:migrate` y el build según SETUP.md 3.2)
- [x] Completada

### T2 — Regla de negocio documentada
- Archivos: `docs/reglas-negocio-itse.md` (modificar: sección 4)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-10
- Tests: no aplica (documentación)
- [x] Completada

### T3 — Catálogo, regla de requeridos y validación de archivo
- Archivos: `modules/expedientes/utils/documentos.ts` (modificar), `modules/expedientes/utils/documentos.test.ts` (modificar), `modules/expedientes/utils/archivo.ts` (modificar), `modules/expedientes/utils/archivo.test.ts` (modificar), `app/api/uploadthing/core.ts` (modificar)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-2, AC-3, AC-4, AC-5
- Tests: `documentos.test.ts` — DNI siempre con nivel, nunca con nivel null; acreditación con cada calidad (no con propietario); orden y sin duplicados; faltantes con acreditación sobrante en propietario; fixtures existentes con `calidadSolicitante: "PROPIETARIO"`. `archivo.test.ts` — imagen rechazada para ambos tipos, PDF 8 MB ok y 8 MB + 1 byte rechazado, sin `tipo` la imagen sigue aceptada
- [x] Completada

### T4 — Schema del paso 3 y persistencia
- Archivos: `modules/expedientes/schemas/solicitud.schema.ts` (modificar), `modules/expedientes/schemas/solicitud.schema.test.ts` (modificar), `modules/expedientes/services/expediente.service.ts` (modificar: `patchToValues`), `modules/expedientes/services/expediente.service.test.ts` (modificar)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-6 (schema y servicio), AC-3 (completitud vía `faltantesBorrador`)
- Tests: schema — cada valor válido, valor ajeno, ausente; servicio — `updateBorrador` paso 3 persiste `calidadSolicitante`, `prepararPago`/`faltantesBorrador` con DNI faltante -> `incompleto`, con DNI subido y propietario -> ok, representante sin acreditación -> `incompleto` (ajustar fixtures/`TIPOS` para incluir el DNI donde se espera borrador completo)
- [x] Completada

### T5 — Uploader solo PDF, paso Documentos y Resumen
- Archivos: `modules/expedientes/components/DocumentoUploader.tsx` (modificar), `modules/expedientes/components/DocumentoUploader.test.tsx` (modificar), `modules/expedientes/components/StepDocumentos.tsx` (modificar), `modules/expedientes/components/StepResumen.tsx` (modificar)
- Depende de: T3
- Grupo paralelo: G3
- Cubre: AC-4 (cliente), AC-8
- Tests: `DocumentoUploader.test.tsx` — para `DNI_AMBAS_CARAS` el input tiene `accept="application/pdf"` y una imagen muestra el error sin llamar `startUpload`; otro tipo sigue aceptando imágenes. `StepDocumentos`/`StepResumen`: cubiertos vía `SolicitudWizard.test.tsx` (T6, componentes de composición sin lógica propia)
- [x] Completada

### T6 — Paso 3: calidad, uploaders y acción
- Archivos: `modules/expedientes/components/StepSolicitante.tsx` (modificar), `modules/expedientes/components/SolicitudWizard.tsx` (modificar), `modules/expedientes/components/SolicitudWizard.test.tsx` (modificar), `modules/expedientes/actions/expediente.actions.ts` (modificar: `parsePaso(3)`), `modules/expedientes/actions/expediente.actions.test.ts` (modificar)
- Depende de: T4, T5
- Grupo paralelo: G4
- Cubre: AC-6 (action), AC-7, AC-8, AC-9
- Tests: `expediente.actions.test.ts` — el paso 3 pasa `calidadSolicitante` al schema y valor ajeno -> `fieldErrors`. `SolicitudWizard.test.tsx` — Propietario preseleccionado y sin uploader de acreditación; elegir Representante legal lo muestra; DNI siempre visible y con `accept` PDF; paso 4 no lista DNI/acreditación; Resumen los lista y muestra la calidad; el formulario envía `calidadSolicitante`; fixtures con `calidadSolicitante` y el DNI donde se espera borrador completo
- [x] Completada

## Fases siguientes
- (ninguna)
