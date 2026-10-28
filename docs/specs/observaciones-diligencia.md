# Observaciones de la diligencia y suspensión con plazo (EN_SUBSANACION)

Estado: approved

> Nota (cambio posterior): se retira el campo «Informe» de los formularios del personal. Ya no hay texto del admin ni `motivo_requerido` en estos flujos: el servicio guarda un comentario automático en el historial («Resultado de la inspección: Cumple.» / «No cumple.» / «Observaciones subsanables.», con el plazo y la reprogramación como hasta ahora; «Evaluación de la subsanación: Cumple.» / «Sigue en subsanación.» / «No cumple.»). Donde esta spec menciona el informe (10 a 1000 caracteres), léase sustituido por ese comentario.

Parte 3 de 4 de `subsanacion-plazos`. **Depende de `plazos-dias-habiles`** (`calcularLimiteSubsanacion`, `validarReprogramacion`, `estadoPlazo`, `TipoItse`). Se debe implementar junto con la parte 4 (`subsanacion-evidencia`): sin ella, un expediente en `EN_SUBSANACION` solo se puede anular.

## Objetivo
Al registrar el resultado de la diligencia, el `admin` o el `superadmin` puede **suspenderla con observaciones** (`DILIGENCIA_PROGRAMADA → EN_SUBSANACION`) según el tipo de ITSE: en posterior, solo si todas las observaciones son no relevantes (catálogo, 3 días hábiles); en previa, con observaciones de texto libre y una nueva fecha de inspección (hasta 20 días hábiles). El cliente ve las observaciones y la fecha límite.

## Fuera de alcance
- Que el cliente suba la declaración jurada y las fotos, y que el admin evalúe la subsanación (cumple / sigue / no cumple): parte 4.
- Administrar el catálogo desde la UI (decisión 1).
- Resultados 7.1.4 (riesgo distinto al declarado) y 7.1.5 (diligencia no realizada): ver «Fases siguientes».
- Marca de vencimiento en la bandeja de expedientes (parte 4, «Fases siguientes»).
- Copiar la lista completa del Anexo 9 oficial (pendiente en `reglas-negocio` 7.3): se parte de los 6 ejemplos documentados.

## Decisiones (a confirmar al aprobar)
1. **Catálogo = constante en código, sin tabla ni pantalla.** `reglas-negocio` 7.3 lo describe como tabla `catalogo_observaciones` y 11 da al superadmin su gestión. Se propone una lista fija en `modules/inspecciones/constants/observaciones-no-relevantes.ts` porque es una **lista cerrada oficial** (Anexo 9) que casi no cambia, se prueba con Vitest y evita seed, migración con datos y un CRUD. Cada entrada tiene un `codigo` estable. Alternativa: tabla + CRUD de superadmin en una spec `catalogo-observaciones` posterior.
2. **Relevante = no está en el catálogo** (`reglas-negocio` 7.4). En ITSE posterior, una observación escrita a mano cuenta como relevante; por eso hay dos entradas en el formulario: casillas del catálogo y «Otras observaciones (una por línea)».
3. **Observaciones guardadas en una tabla propia** `observaciones_diligencia` (una fila por observación, con la descripción copiada: aunque el catálogo cambie, el texto registrado no). Se guardan al suspender (obligatorias, mínimo 1) y, opcionalmente, al registrar «No cumple». Con «Cumple» no se aceptan.
4. **Solo una suspensión por expediente:** `reglas-negocio` 6.1 solo permite `EN_SUBSANACION → CUMPLE | NO_CUMPLE`, así que no hay ciclos.
5. **Tipo de ITSE** = `tipoItsePorRiesgo(expedientes.nivelRiesgo)` (el riesgo ya confirmado por el admin en revisión). Si el riesgo fuera nulo, la suspensión no se permite.
6. **Fecha límite** `expedientes.subsanacion_limite` = `calcularLimiteSubsanacion(tipo, ahora)`; en previa, la nueva fecha de inspección se guarda en la columna existente `diligencia_programada_para` (la fecha anterior queda en el comentario del historial), con la condición `hoy ≤ fecha ≤ límite` (`validarReprogramacion`).
7. **Comentario del historial** de la suspensión = informe recortado + « Plazo para subsanar: hasta el dd/MM/yyyy.» y, en previa, además « Nueva inspección: dd/MM/yyyy.». El informe es visible para el cliente (como hoy).

## Reutilización
- Existente que se reutiliza: `aplicar` con `extras` (UPDATE condicionado + historial + INSERT de observaciones en un `db.batch`, como `designarInspectores`); `registrarResultadoDiligencia`, `resultadoDiligenciaSchema`, `registrarResultadoAction`, `ResultadoDiligenciaForm`, `PanelInspeccion` (se extienden, no se duplican); `tipoItsePorRiesgo`; `formatFecha`, `aInputLima`, `parseFechaLima`; `Card`, `Badge`, `Button`, `Label`, `Textarea`, `AlertDialog` de `components/ui/` (checkboxes y radios nativos, como el formulario actual).
- Existente que se extiende: `db/schema.ts` (+1 tabla, +1 columna); `transiciones.ts` (+1 destino); `diligencia.service.ts`; `diligencia.schema.ts`; `diligencia.actions.ts`; `ResultadoDiligenciaForm.tsx`; `PanelInspeccion.tsx`; `ExpedienteDetalleCliente.tsx`; `app/mi-cuenta/expedientes/[id]/page.tsx`.
- Nuevo (y por qué): `constants/observaciones-no-relevantes.ts` y `utils/observaciones.ts` (reglas 7.3 a 7.5, no existen); `components/ObservacionesLista.tsx` y `components/PlazoSubsanacion.tsx` (los usan la vista del cliente y el panel del personal).
- Dependencias / componentes shadcn a instalar: ninguno.
- **Migración (la genera el developer en T1; el humano corre `npm run db:migrate`):** siguiente número libre (hoy `0016`): `CREATE TABLE "observaciones_diligencia"` + FK a `expedientes` + índice, y `ALTER TABLE "expedientes" ADD COLUMN "subsanacion_limite"`. Solo agrega; no toca datos.

## Specs afectadas
- `diligencia-inspeccion`: `DESTINOS_CON_FLUJO_PROPIO` pasa de 4 a 5 destinos; `DILIGENCIA_PROGRAMADA → ["EN_SUBSANACION", "CUMPLE", "NO_CUMPLE"]` (en ese orden); `registrarResultadoDiligencia`, `resultadoDiligenciaSchema`, `registrarResultadoAction` y `ResultadoDiligenciaForm` ganan una opción y campos opcionales (el comportamiento de `CUMPLE`/`NO_CUMPLE` sin observaciones no cambia). La matriz 18 × 18 se actualiza. Su «Fuera de alcance» sobre `EN_SUBSANACION` queda resuelto por las partes 3 y 4.
- `expediente-detalle-cliente`: la vista agrega observaciones y fecha límite; la página recibe un dato más.
- `docs/reglas-negocio-itse.md`: sin cambios; esta spec implementa 7.2 y 7.5 (la constante reemplaza a la tabla de 7.3: avisar si el humano prefiere tabla).

## Criterios de aceptación
- AC-1 (esquema): tabla `observaciones_diligencia` (`id` uuid pk default aleatorio, `expediente_id` uuid no nulo con FK `restrict` a `expedientes`, `codigo` text nulo, `descripcion` text no nulo, `created_at` timestamptz default `now()`, índice por `expediente_id`) y columna `expedientes.subsanacion_limite` (timestamptz, nula) en `db/schema.ts`, con la migración correspondiente que solo hace `CREATE TABLE`/`CREATE INDEX`/FK y `ALTER TABLE ... ADD COLUMN`. Se exporta `type ObservacionDiligencia`.
- AC-2 (catálogo): `OBSERVACIONES_NO_RELEVANTES` contiene exactamente 6 entradas `{ codigo, descripcion }` con códigos únicos y estables, cuyas descripciones son las de `reglas-negocio` 7.3: retirar obstáculos de los medios de evacuación (pasadizos, escaleras, accesos, salidas); colocar señalización de seguridad (salida, zona segura en caso de sismo, riesgo eléctrico, extintores); instalar, recargar o reubicar extintores; colocar tapas a las aberturas no usadas en los tableros eléctricos; colocar tapa a las cajas de paso de conductores eléctricos; instalar iluminación general y de emergencia en la zona de los tableros eléctricos. Un comentario señala que falta completar la lista con el Anexo 9 oficial. `buscarObservacion(codigo)` devuelve la entrada o `undefined`.
- AC-3 (reglas puras): `evaluarObservaciones(tipo, { codigos, libres })` devuelve `{ ok: true }` o `{ ok: false; motivo: "sin_observaciones" | "codigo_invalido" | "relevante" }`, evaluando en ese orden: `sin_observaciones` si no hay códigos ni libres; `codigo_invalido` si algún código no está en el catálogo o hay repetidos; `relevante` si `tipo === "POSTERIOR"` y hay al menos una observación libre; `ok` en los demás casos (en `PREVIA` las libres y los códigos se aceptan en cualquier combinación).
- AC-4 (máquina pura): `transicionesPermitidas("DILIGENCIA_PROGRAMADA", "admin")` es `["EN_SUBSANACION", "CUMPLE", "NO_CUMPLE"]` (superadmin además `ANULADO`); `EN_SUBSANACION` es destino de `DILIGENCIA_PROGRAMADA` pero aún no tiene salidas propias (solo `ANULADO` para el superadmin; las agrega la parte 4); `DESTINOS_CON_FLUJO_PROPIO` contiene exactamente `INSPECTOR_DESIGNADO`, `DILIGENCIA_PROGRAMADA`, `EN_SUBSANACION`, `CUMPLE`, `NO_CUMPLE` (y los que haya agregado `subsanacion-requisitos`); `transicionesGenericas("DILIGENCIA_PROGRAMADA", rol)` solo deja `ANULADO` (superadmin); `cliente` siempre `[]`; la matriz 18 × 18 falla si algún par no listado es permitido.
- AC-5 (schema Zod): `resultadoDiligenciaSchema` acepta `resultado ∈ {CUMPLE, NO_CUMPLE, EN_SUBSANACION}`; `informe` de 10 a 1000 caracteres (igual que hoy); `codigos` (arreglo de hasta 6 cadenas, por defecto `[]`); `libres` (arreglo de hasta 20 cadenas de 5 a 300 caracteres tras recortar, por defecto `[]`; las líneas vacías se descartan); `reprogramadaPara` opcional con formato `YYYY-MM-DD` válido (`parseFechaLima`), transformado a `Date`. Rechaza `CUMPLE` con `codigos` o `libres` no vacíos y `EN_SUBSANACION` sin ninguno de los dos, con mensajes en español por campo.
- AC-6 (servicio): `registrarResultadoDiligencia(actor, id, input, ahora?)` conserva su firma agregando campos opcionales (`codigos`, `libres`, `reprogramadaPara`) y sigue lanzando `Error("No autorizado")` para `cliente`. Para `EN_SUBSANACION` los resultados, en este orden, son: `no_encontrado` → `no_permitido` (estado distinto de `DILIGENCIA_PROGRAMADA`, o `nivelRiesgo` nulo, o `puedeTransicionar` falso) → `motivo_requerido` (informe < 10) → `observaciones_requeridas` / `observacion_invalida` / `observacion_relevante` (según `evaluarObservaciones`) → `reprogramacion_invalida` (en PREVIA falta la fecha o `validarReprogramacion` ≠ `ok`; en POSTERIOR se envió una fecha) → `conflicto` → `ok`. En `ok` hay **un** `db.batch` (vía `aplicar`, con `extras`) que: fija `estado = EN_SUBSANACION` y `subsanacion_limite = calcularLimiteSubsanacion(tipo, ahora)`; en PREVIA actualiza también `diligencia_programada_para`; registra el historial con el comentario de la decisión 7 (fechas de Lima); e inserta una fila por observación (los textos de catálogo salen del catálogo, nunca del cliente HTTP; las libres recortadas). Con `NO_CUMPLE` las observaciones (si llegan) se guardan en el mismo batch con las mismas validaciones de formato (`observacion_invalida` si un código no existe) pero sin exigir `relevante`; con `CUMPLE` y observaciones, `no_permitido`. Sin `ok`/`conflicto` no se invoca `db.batch`.
- AC-7 (lectura): `getResumenSubsanacion(actor, expedienteId)` devuelve `{ tipoItse: TipoItse | null, limite: Date | null, observaciones: { id, descripcion, esCatalogo }[] }` ordenadas por `created_at`; para `cliente` solo si el expediente es suyo (si no, `{ tipoItse: null, limite: null, observaciones: [] }`); nunca incluye datos del personal.
- AC-8 (acción): `registrarResultadoAction` mantiene `requireRole("admin", "superadmin")` primero, id uuid, validación Zod (`codigos` con `formData.getAll("codigo")`, `libres` con las líneas de `formData.get("libres")`), servicio con el usuario de `requireRole`. Mensajes nuevos: `observaciones_requeridas` «Agrega al menos una observación.»; `observacion_invalida` «Una de las observaciones elegidas no es válida.»; `observacion_relevante` «Hay observaciones relevantes: en una inspección posterior solo se puede registrar "No cumple".»; `reprogramacion_invalida` «Elige la nueva fecha de inspección: desde hoy y dentro del plazo de subsanación (hasta 20 días hábiles).»; los demás, sin cambios. Revalida las 4 rutas solo en éxito.
- AC-9 (UI del personal): en `DILIGENCIA_PROGRAMADA`, `ResultadoDiligenciaForm` agrega la opción «Observaciones subsanables» (solo si `tipoItse` no es nulo). Al elegir esa opción o «No cumple» aparece el bloque «Observaciones»: `<fieldset>` con una casilla por entrada del catálogo (`name="codigo"`) y `<label>` «Otras observaciones (una por línea)» con `textarea`. En posterior, si hay texto en «Otras observaciones» y la opción es «Observaciones subsanables», se muestra un aviso `role="status"` con el mensaje de `observacion_relevante`. En previa, al elegir la opción aparece `<label>` «Nueva fecha de inspección» con `<input type="date" required min max>` (`min` = hoy en Lima, `max` = fecha del límite de 20 días hábiles, calculados en el servidor con `aInputLima`) y se muestra «Plazo máximo: 20 días hábiles» (3 en posterior). El `AlertDialog` de confirmación describe la suspensión y el plazo en lenguaje llano. Errores por campo con `aria-invalid`/`aria-describedby` y mensaje general en `role="alert"`. En `EN_SUBSANACION`, `NO_CUMPLE` y `CUMPLE`, el panel muestra `ObservacionesLista` (si hay) y, en `EN_SUBSANACION`, `PlazoSubsanacion`, sin formularios nuevos.
- AC-10 (UI del cliente): `ExpedienteDetalleCliente` recibe `subsanacion` (de `getResumenSubsanacion`) y muestra, si hay observaciones, la lista «Observaciones de la inspección» y, en `EN_SUBSANACION` con límite, `PlazoSubsanacion`: «Fecha límite: dd/MM/yyyy», «Quedan N días hábiles» (o «Vence hoy»), y una insignia con texto «Plazo vencido» si `estadoPlazo(...).vencido`. En previa la nueva fecha de inspección se ve en `InspeccionResumen` (ya existente). El historial muestra «En subsanación» con el informe y sin `actorNombre`. La página del cliente llama a `getResumenSubsanacion(usuario, id)` con el usuario de `requireRole("cliente")`.
- AC-11 (aislamiento): ningún servicio ni acción nuevo acepta a `cliente` para escribir; la UI del cliente no contiene formularios de estas acciones; un cliente solo lee las observaciones de su propio expediente (IDOR).
- AC-12 (responsive y accesibilidad): sin desborde horizontal a 360, 768 y 1280 px (casillas apiladas, objetivos táctiles `min-h-11`); estados y plazos siempre con texto (no solo color); foco visible; solo tokens del tema; sin `any`/`@ts-ignore`.
- AC-13: `npm run build`, `npm run lint` y `npx vitest run` pasan.

## Tareas
### T1 — Esquema y migración
- Archivos: `db/schema.ts` (modificar), `drizzle/0016_*.sql` (crear, generado), `drizzle/meta/0016_snapshot.json` (crear, generado), `drizzle/meta/_journal.json` (modificar, generado)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-1
- Detalle: `DATABASE_URL="postgres://u:p@localhost/db" npm run db:generate`; usar el siguiente número libre. El humano corre `npm run db:migrate`.
- Tests: no aplica (esquema generado).
- [x] Completada

### T2 — Catálogo, reglas de observaciones y máquina de estados
- Archivos: `modules/inspecciones/constants/observaciones-no-relevantes.ts` (crear), `modules/inspecciones/utils/observaciones.ts` (crear), `modules/inspecciones/utils/observaciones.test.ts` (crear), `modules/expedientes/utils/transiciones.ts` (modificar), `modules/expedientes/utils/transiciones.test.ts` (modificar)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-2, AC-3, AC-4
- Tests: `observaciones.test.ts` — catálogo (6 entradas, códigos únicos, `buscarObservacion`), `evaluarObservaciones` en las 2 modalidades × {solo catálogo, solo libres, mezcla, vacío, código inválido, código repetido}; matriz 18 × 18 rol por rol.
- [x] Completada

### T3 — Servicio de diligencia con suspensión y lectura de observaciones
- Archivos: `modules/inspecciones/services/diligencia.service.ts` (modificar), `modules/inspecciones/services/diligencia.service.test.ts` (modificar)
- Depende de: T1, T2, `plazos-dias-habiles` T2
- Grupo paralelo: G2
- Cubre: AC-6, AC-7, AC-11 (servicio)
- Detalle: `DiligenciaResultado` suma los estados nuevos; `getResumenSubsanacion` vive en este servicio.
- Tests: con `db` mockeado — cada resultado de AC-6 en su orden para POSTERIOR y PREVIA, un solo `db.batch`, comentario exacto con fechas de Lima, límite correcto (`2026-11-02` para suspensión el 28/10/2026), fila por observación con texto de catálogo, `NO_CUMPLE` con y sin observaciones, `CUMPLE` con observaciones rechazado, `Error("No autorizado")`; `getResumenSubsanacion` de cliente dueño y ajeno.
- [x] Completada

### T4 — Schema y acción
- Archivos: `modules/inspecciones/schemas/diligencia.schema.ts` (modificar), `modules/inspecciones/schemas/diligencia.schema.test.ts` (modificar), `modules/inspecciones/actions/diligencia.actions.ts` (modificar), `modules/inspecciones/actions/diligencia.actions.test.ts` (modificar)
- Depende de: T3
- Grupo paralelo: G3
- Cubre: AC-5, AC-8
- Tests: schema — resultado inválido, `CUMPLE` con observaciones, `EN_SUBSANACION` vacío, libres de 4/5/300/301 caracteres, líneas vacías descartadas, fecha imposible; acción — orden `requireRole` → uuid → Zod → servicio, `getAll("codigo")`, cada mensaje nuevo, `revalidatePath` solo en éxito.
- [x] Completada

### T5 — Componentes de presentación y vista del cliente
- Archivos: `modules/inspecciones/components/ObservacionesLista.tsx` (crear), `modules/inspecciones/components/PlazoSubsanacion.tsx` (crear), `modules/inspecciones/components/PlazoSubsanacion.test.tsx` (crear), `modules/expedientes/components/ExpedienteDetalleCliente.tsx` (modificar)
- Depende de: T3
- Grupo paralelo: G3
- Cubre: AC-10 (componentes), AC-11 (UI), AC-12 (cliente)
- Detalle: `PlazoSubsanacion` recibe `limite` y `ahora?` (por defecto `new Date()`); `ExpedienteDetalleCliente` agrega la prop `subsanacion` (el `page.tsx` que la pasa se actualiza en T6, que va después; entre T5 y T6 el build no es el criterio de cierre).
- Tests: `PlazoSubsanacion.test.tsx` — fecha en formato dd/MM/yyyy, «Quedan 3 días hábiles», «Vence hoy», «Plazo vencido». `ObservacionesLista` es presentacional: sin test propio.
- [x] Completada

### T6 — Formulario del personal, panel y página del cliente
- Archivos: `modules/inspecciones/components/ResultadoDiligenciaForm.tsx` (modificar), `modules/inspecciones/components/ResultadoDiligenciaForm.test.tsx` (crear), `modules/inspecciones/components/PanelInspeccion.tsx` (modificar), `app/mi-cuenta/expedientes/[id]/page.tsx` (modificar), `app/mi-cuenta/expedientes/[id]/page.test.tsx` (modificar)
- Depende de: T4, T5
- Grupo paralelo: G4
- Cubre: AC-9, AC-10 (página), AC-12 (personal)
- Detalle: `PanelInspeccion` calcula `tipoItse` con `tipoItsePorRiesgo`, el `max` de reprogramación con `calcularLimiteSubsanacion("PREVIA", new Date())` y llama a `getResumenSubsanacion`; la página del personal no se toca. La página del cliente pasa `subsanacion` y su test se actualiza (llamada con el usuario de `requireRole("cliente")`).
- Tests: `ResultadoDiligenciaForm.test.tsx` — el bloque de observaciones solo aparece con «Observaciones subsanables» o «No cumple»; la fecha solo en previa; el aviso de relevante en posterior; la opción nueva no aparece sin `tipoItse`.
- [x] Completada

## Grupos paralelos
- G1: T1 y T2 (archivos disjuntos). G2: T3. G3: T4 y T5 (archivos disjuntos). G4: T6.

## Fases siguientes
- Parte 4 `subsanacion-evidencia`: evidencia del cliente y evaluación del admin.
- Spec `diligencia-no-concluida`: resultados 7.1.4 y 7.1.5, y catálogo administrable si el humano lo pide.
