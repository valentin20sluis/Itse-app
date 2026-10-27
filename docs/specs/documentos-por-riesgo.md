# Documentos por nivel de riesgo

Estado: approved

## Objetivo
El paso 4 "Documentos" del wizard de solicitud ITSE deja de usar un catálogo fijo y pasa a depender del nivel de riesgo declarado y de dos características del local (cocina, grifo), más si almacena inflamables. El cliente ve solo lo que debe subir y un aviso del Plan de seguridad (que se revisa en físico en la diligencia). `enviarExpediente` exige exactamente esos documentos. Datos ficticios siempre.

## Fuera de alcance
- Subida real de archivos (UploadThing, `StepDocumentos` con carga, `removeDocumentoAction`, descarga): siguen pendientes (Fase B de `solicitud-itse-wizard`) y se construirán sobre este catálogo.
- Hospedaje (matriz CENEPRED, `numero_camas`, casillas de uso mixto y gran escala): spec `riesgo-hospedaje`, que depende de esta.
- Validar que un grifo tenga Función "Oficinas administrativas": solo se documenta en el aviso, no se bloquea.
- Subir el Plan de seguridad como archivo (se revisa en físico).
- Limpieza de documentos ya subidos que dejan de ser requeridos (se conservan).

## Reutilización
- Existente que se reutiliza: `modules/expedientes/utils/riesgo.ts` (`MAX_PISOS_MEDIO`, `MAX_AREA_MEDIO_M2` ya exportadas y usadas por `sugerirNivelRiesgo`) — solo cambian los valores; `paso4Schema` (`numeroBoleta`, sin archivo) sin cambios; `establecimiento.areaM2`/`numeroPisos` ya existen para `planSeguridadFisico` (no falta ningún dato del establecimiento); `checkbox` de `solicitud.schema.ts`; clases `OPCION` de `StepRiesgo`.
- Existente que se extiende: `db/schema.ts` (enum `tipo_documento` + 2 columnas en `expedientes`); `utils/documentos.ts` (catálogo y reglas); `solicitud.schema.ts` (`paso2Schema`); `expediente.service.ts` (`patchToValues`, `enviarExpediente`); `expediente.actions.ts` (parseo del paso 2 y mapa de etiquetas, que ya itera `DOCUMENTOS`); `StepRiesgo`, `StepResumen`, `SolicitudWizard`.
- Nuevo (y por qué): `documentosRequeridos` y `planSeguridadFisico` en `utils/documentos.ts` (no existe regla condicional); migración `drizzle/0007_*`.
- Dependencias / componentes shadcn a instalar antes de implementar: ninguno. Preparación del orquestador: hay cambios sin commitear en `solicitud.schema.ts`, `solicitud.schema.test.ts` y `StepSolicitante.tsx`; commitearlos antes de T4 (el developer parte de ellos y no los revierte). `npm run db:migrate` lo ejecuta el orquestador/humano tras T1.

## Decisiones y supuestos
1. **Migración de enum: `ALTER TYPE ... ADD VALUE`** (8 valores nuevos, los 5 viejos sin uso quedan en el enum). Es lo que genera `drizzle-kit` sin SQL manual, no toca la tabla ni bloquea, y es seguro porque `expediente_documentos` no tiene filas. Riesgo: Postgres no permite quitar valores de un enum, así que `PLANO_UBICACION`, `PLANO_DISTRIBUCION`, `PLAN_SEGURIDAD`, `COMPROBANTE_PAGO` y `EXTINTORES` quedan en la BD y en `tipoDocumentoEnum.enumValues` (se marcan con comentario "obsoleto" en `schema.ts`); el catálogo en código es la fuente de verdad de lo que se acepta. Alternativa (recrear el enum con `ALTER COLUMN ... TYPE text` + `DROP TYPE` + `CREATE TYPE`) deja el enum limpio, es viable por estar la tabla vacía, pero exige SQL manual y es más frágil en Neon; se descarta salvo que el humano la prefiera. Se mantiene `POZO_TIERRA`.
2. Umbrales generales: `MAX_PISOS_MEDIO` = 2 y `MAX_AREA_MEDIO_M2` = 500 (decisión del proyecto, distinta del 3 pisos/750 m² de la Matriz para Comercio). La lógica de `sugerirNivelRiesgo` no cambia; el cliente sigue declarando el nivel y el admin lo confirma.
3. Catálogo (9 tipos): `FICHA_RUC`, `EXTINTORES_PQS`, `EXTINTORES_TIPO_K`, `CAPACITACION_EXTINTORES`, `LICENCIA_OSINERGMIN`, `PLANO_ARQUITECTURA_AFORO`, `PLANOS_ELECTRICOS`, `POZO_TIERRA`, `MEMORIA_PRUEBAS_EQUIPOS`. Un archivo por tipo (índice único existente). `CAPACITACION_EXTINTORES` es un solo documento que cubre PQS, Tipo K o ambos.
4. Reglas, con `ctx = { nivelRiesgo: NivelRiesgo | null; tieneCocina: boolean; esGrifo: boolean; almacenaInflamables: boolean }`:
   - `nivelRiesgo` null → `[]` (el paso 2 ya figura como faltante).
   - Siempre (todo nivel): `FICHA_RUC`, `EXTINTORES_PQS`, `CAPACITACION_EXTINTORES`.
   - `EXTINTORES_TIPO_K` si `tieneCocina`.
   - `LICENCIA_OSINERGMIN` si `esGrifo` (cualquier nivel) o (`almacenaInflamables` y nivel ALTO/MUY_ALTO).
   - Solo ALTO/MUY_ALTO: `PLANO_ARQUITECTURA_AFORO`, `PLANOS_ELECTRICOS`, `POZO_TIERRA`, `MEMORIA_PRUEBAS_EQUIPOS`.
   - Orden de salida: el del catálogo.
5. `planSeguridadFisico({ nivelRiesgo, numeroPisos, tieneSotano, areaM2 })`: ALTO/MUY_ALTO → true; BAJO/MEDIO → `numeroPisos <= MAX_PISOS_MEDIO && !tieneSotano && areaM2 <= MAX_AREA_MEDIO_M2`; null → false. Aviso informativo, nunca entra en `documentosRequeridos` ni en `faltantes`.
6. Documentos ya subidos que dejan de ser requeridos se conservan y no bloquean el envío (`documentosFaltantes` solo mira los requeridos).
7. **Grifo (decisión del usuario):** la municipalidad no tiene competencia técnica para evaluar tanques de gasolina o diésel ni el área de despacho (lo regula Osinergmin); la ITSE de un grifo se hace solo a sus oficinas administrativas, por lo que **un grifo siempre es riesgo MEDIO**, y como requisito se pide la licencia o certificado de Osinergmin (`LICENCIA_OSINERGMIN`, ya cubierto en la regla del punto 4). `DatosRiesgo` de `sugerirNivelRiesgo` suma `esGrifo`: si es `true` devuelve `MEDIO` sin importar pisos, área, sótano ni inflamables (el combustible no es objeto de la ITSE municipal). Es una sugerencia: el cliente puede elegir otro nivel y el admin lo confirma. Esta regla tiene prioridad sobre las demás (también sobre la matriz de `riesgo-hospedaje`).
8. Límite aceptado: `tieneCocina`/`esGrifo` se declaran en el paso 2; si el cliente cambia el riesgo o estas casillas después de subir, la lista del paso 4 se recalcula al volver a entrar.

## Specs afectadas (reemplazado)
- `solicitud-itse-datos`: línea del catálogo de "Modelo de datos" (requeridos PLANO_UBICACION, PLANO_DISTRIBUCION, PLAN_SEGURIDAD, COMPROBANTE_PAGO; opcionales POZO_TIERRA, EXTINTORES) y **AC-3** (`DOCUMENTOS` con `requerido` y `documentosFaltantes(subidos)` de un argumento) quedan reemplazados por esta spec; **AC-2** se actualiza solo en los umbrales (3/750 pasan a 2/500); **AC-1/AC-5** se amplían con las columnas `tiene_cocina`/`es_grifo` y los checkboxes del paso 2. El resto (IDOR, `registerDocumento`, etc.) sigue vigente.
- `solicitud-itse-wizard`: la lista fija de documentos del paso Documentos (T3, Fase B) y del Resumen (**AC-12**, documentos con estado) y la validación de **AC-6** (lista de faltantes) usan ahora `documentosRequeridos`. `removeDocumentoAction`, UploadThing (T1/T3) y el `StepDocumentos` real siguen pendientes.
- `mis-expedientes`: sin cambios (la descarga usa el `tipo` almacenado, que sigue siendo del enum).
- `docs/reglas-negocio-itse.md` secciones 2.1 y 4 se actualizan en T2.

## Criterios de aceptación
- AC-1: `tipoDocumentoEnum` contiene los 8 valores nuevos y `POZO_TIERRA`; `expedientes` tiene `tiene_cocina` y `es_grifo` boolean not null default false. `npm run db:generate` produce `0007` con `ADD VALUE` (sin DROP) y `db:migrate` la aplica sin errores.
- AC-2: `MAX_PISOS_MEDIO === 2` y `MAX_AREA_MEDIO_M2 === 500`; `sugerirNivelRiesgo` da MEDIO con 2 pisos/500 m² sin factores y ALTO con 3 pisos o 500,01 m² (tests en los límites; los tests existentes se ajustan). Con `esGrifo: true` devuelve `MEDIO` aunque haya 5 pisos, 2000 m², sótano e inflamables.
- AC-3: `documentosRequeridos`: nivel null → `[]`; BAJO y MEDIO sin cocina/grifo/inflamables → `[FICHA_RUC, EXTINTORES_PQS, CAPACITACION_EXTINTORES]`; `tieneCocina` agrega `EXTINTORES_TIPO_K` en cualquier nivel; `esGrifo` agrega `LICENCIA_OSINERGMIN` en BAJO, MEDIO, ALTO y MUY_ALTO; `almacenaInflamables` agrega Osinergmin solo en ALTO/MUY_ALTO; ALTO y MUY_ALTO agregan además los 4 documentos técnicos (incluido `POZO_TIERRA`); ninguna salida repite tipos ni incluye los 5 tipos obsoletos.
- AC-4: `documentosFaltantes(subidos, ctx)` devuelve los requeridos no subidos; un documento subido no requerido (p. ej. tras bajar de ALTO a MEDIO) no aparece ni bloquea; con nivel null devuelve `[]`.
- AC-5: `planSeguridadFisico` true en ALTO/MUY_ALTO siempre; en BAJO/MEDIO true con 2 pisos, sin sótano y 500 m²; false con 3 pisos, con sótano o 500,01 m²; false con nivel null.
- AC-6: `paso2Schema` acepta `tieneCocina` y `esGrifo` como checkbox (`"on"`/ausente → boolean); `patchToValues` los persiste y `parsePaso(2)` los lee del formulario.
- AC-7: `enviarExpediente` lee `nivelRiesgo`, `tieneCocina`, `esGrifo`, `almacenaInflamables` de la fila y llama `documentosFaltantes(subidos, ctx)`; con riesgo ALTO y solo el catálogo básico subido devuelve `incompleto` con los técnicos faltantes; con MEDIO y los 3 básicos subidos no hay faltantes de documentos; con nivel null los faltantes incluyen `paso2` y ningún documento.
- AC-8: `StepRiesgo` muestra las casillas "¿Tiene cocina (restaurante)?" y "¿Es un grifo / estación de servicio?" junto a sótano e inflamables, precargadas desde el expediente y operables con teclado (`label` + checkbox nativo); el texto de ayuda del grifo indica que la municipalidad solo realiza la ITSE a sus oficinas administrativas (riesgo medio) y que se pide la licencia de Osinergmin por el área de combustible; `StepRiesgo` pasa `esGrifo` a `sugerirNivelRiesgo`, de modo que marcarlo sugiere "Riesgo medio".
- AC-9: El paso Documentos y `StepResumen` listan solo `documentosRequeridos(...)` con etiquetas en español y estado subido/pendiente (sin archivo, sin los tipos obsoletos), conservan el campo de número de boleta, y muestran el aviso "El Plan de seguridad no se sube: el inspector lo revisa en físico durante la diligencia" solo cuando `planSeguridadFisico(...)` es true. El Resumen sin nivel de riesgo no lista documentos.
- AC-10: `docs/reglas-negocio-itse.md` 2.1 refleja 2 pisos/500 m² como decisión del proyecto y la sección 4 describe el catálogo por riesgo, el Plan de seguridad físico y que ya no hay comprobante de pago como archivo.
- AC-11: No quedan referencias a `PLANO_UBICACION|PLANO_DISTRIBUCION|PLAN_SEGURIDAD|COMPROBANTE_PAGO|EXTINTORES\b` fuera de `db/schema.ts` (comentario de obsoletos), `drizzle/` y specs (grep). `npm run build`, `npm run lint` y `npx vitest run` pasan.

## Tareas
### T1 — Enum de documentos y columnas del paso 2
- Archivos: `db/schema.ts` (modificar), `drizzle/0007_*.sql` (crear, generado), `drizzle/meta/0007_snapshot.json` (crear, generado), `drizzle/meta/_journal.json` (modificar, generado)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-1
- Tests: no aplica (esquema; se verifica con `db:generate`/`db:migrate` y el build según SETUP.md 3.2)
- [ ] Completada

### T2 — Umbrales de riesgo y reglas de negocio
- Archivos: `modules/expedientes/utils/riesgo.ts` (modificar), `modules/expedientes/utils/riesgo.test.ts` (modificar), `docs/reglas-negocio-itse.md` (modificar: 2.1 y 4)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-2, AC-10
- Tests: `riesgo.test.ts` — grifo siempre MEDIO (con muchos pisos, área, sótano e inflamables); 2 pisos/500 m² MEDIO; 3 pisos ALTO; 500,01 m² ALTO; resto de casos existentes con los nuevos límites (sótano, inflamables, tope MUY_ALTO, nunca BAJO)
- [ ] Completada

### T3 — Reglas puras de documentos
- Archivos: `modules/expedientes/utils/documentos.ts` (modificar), `modules/expedientes/utils/documentos.test.ts` (modificar), `modules/expedientes/services/documento.service.test.ts` (modificar: reemplazar los literales `PLANO_UBICACION` por un tipo vigente, p. ej. `FICHA_RUC`)
- Depende de: T1, T2
- Grupo paralelo: G2
- Cubre: AC-3, AC-4, AC-5
- Tests: `documentos.test.ts` — matriz nivel x cocina/grifo/inflamables (Osinergmin en BAJO por grifo, no en BAJO/MEDIO por inflamables, sí en ALTO), tipo K, técnicos solo ALTO/MUY_ALTO, nivel null, no duplicados, faltantes con subidos extra no requeridos, `planSeguridadFisico` en los límites 2/3 pisos y 500/500,01 m² y con sótano; catálogo con etiquetas en español para los 9 tipos
- [ ] Completada

### T4 — Schema del paso 2 y servicio de envío
- Archivos: `modules/expedientes/schemas/solicitud.schema.ts` (modificar), `modules/expedientes/schemas/solicitud.schema.test.ts` (modificar), `modules/expedientes/services/expediente.service.ts` (modificar), `modules/expedientes/services/expediente.service.test.ts` (modificar: constante `TIPOS` y el caso `faltantes: ["COMPROBANTE_PAGO"]`)
- Depende de: T1, T3
- Grupo paralelo: G3
- Cubre: AC-6 (schema y `patchToValues`), AC-7
- Tests: schema — `tieneCocina`/`esGrifo` con `"on"`, ausente y `true`; servicio — `updateBorrador` paso 2 persiste ambas, `enviarExpediente` con ALTO sin técnicos → `incompleto`, MEDIO con los 3 básicos → ok, nivel null → `paso2` sin documentos, docs subidos no requeridos no bloquean
- [ ] Completada

### T5 — Action del paso 2 y casillas en StepRiesgo
- Archivos: `modules/expedientes/actions/expediente.actions.ts` (modificar), `modules/expedientes/actions/expediente.actions.test.ts` (modificar: caso `faltantes: ["paso3", "PLANO_UBICACION"]`), `modules/expedientes/components/StepRiesgo.tsx` (modificar)
- Depende de: T4
- Grupo paralelo: G4
- Cubre: AC-6 (`parsePaso(2)`), AC-8
- Tests: actions — `StepRiesgo` pasa `esGrifo` a `sugerirNivelRiesgo`; el paso 2 pasa `tieneCocina`/`esGrifo` al schema; el mensaje de `incompleto` usa etiquetas del catálogo nuevo; StepRiesgo cubierto vía `SolicitudWizard.test.tsx` (T6)
- [ ] Completada

### T6 — Paso Documentos y Resumen según riesgo
- Archivos: `modules/expedientes/components/SolicitudWizard.tsx` (modificar), `modules/expedientes/components/StepResumen.tsx` (modificar), `modules/expedientes/components/SolicitudWizard.test.tsx` (modificar: fixtures con `tieneCocina`/`esGrifo`, documentos nuevos, casillas del paso 2)
- Depende de: T1, T3
- Grupo paralelo: G4
- Cubre: AC-8 (casillas, test), AC-9, AC-11
- Tests: `SolicitudWizard.test.tsx` — MEDIO lista 3 documentos; ALTO lista los técnicos; marcar cocina agrega Tipo K; aviso del Plan de seguridad según `planSeguridadFisico`; Resumen sin nivel no lista documentos; casillas del paso 2 enviadas en el formulario
- [ ] Completada

## Fases siguientes
- Fase B de `solicitud-itse-wizard`: UploadThing, `StepDocumentos` con carga, `removeDocumentoAction` y descarga, sobre el catálogo de esta spec.
- `riesgo-hospedaje` (spec aparte, depende de esta).
