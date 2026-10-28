# Diligencia de inspección (programación y resultado)

Estado: approved

Parte 3 de 4 de `inspeccion`. **Depende de `designacion-inspectores`** (`aplicar` con `extras` exportada, `DESTINOS_CON_FLUJO_PROPIO`, `PanelInspeccion`, `InspeccionResumen`).

## Objetivo
Con los inspectores designados, el `admin` o el `superadmin` programa la diligencia (solo fecha, sin hora; el lugar es la dirección del establecimiento) y, tras la visita, registra el resultado: **cumple** o **no cumple**, con un informe de texto. Cada paso queda en el historial y el cliente ve la fecha programada y el resultado.

## Fuera de alcance (y por qué)
- **`EN_SUBSANACION`**: `reglas-negocio` 7.2 y 7.5 exigen, para registrarla, el catálogo de observaciones (posterior: solo si todas son no relevantes), el cálculo de días hábiles con feriados (3 o 20) y la reprogramación; todo eso es la spec `subsanacion-plazos`. Registrarla aquí sin esas reglas las violaría. Por ahora el personal solo puede elegir `CUMPLE` o `NO_CUMPLE`.
- Resultado 7.1.4 (riesgo distinto al declarado) y 7.1.5 (diligencia no realizada, reprogramación única en 2 días hábiles): requieren días hábiles y reglas de conclusión del procedimiento; van con `subsanacion-plazos`. Mientras tanto una diligencia no realizada se deja sin resultado, y un riesgo mal declarado lo resuelve el superadmin anulando con motivo (acción existente).
- `CUMPLE → CERTIFICADO_PENDIENTE_FIRMA` (spec `certificados`) y `NO_CUMPLE → DERIVADO_COMERCIALIZACION` con `accionComercializacion` (spec posterior). Un expediente en `CUMPLE`/`NO_CUMPLE` queda a la espera de ellas (solo el superadmin puede anularlo).
- Plazo para ejecutar la diligencia (7 días hábiles) y alertas: no implementar hasta confirmar el texto oficial (`reglas-negocio` sección 8).
- Reprogramar o editar la fecha, adjuntar fotos o el Anexo 9 escaneado, correo/SMS.

## Decisiones (a confirmar al aprobar)
1. **Sin tabla nueva:** la fecha vive en una columna `expedientes.diligencia_programada_para` (timestamptz, nula). El lugar no se guarda: se muestra la dirección actual del establecimiento («lugar ya conocido»). El resultado es el propio estado (`CUMPLE`/`NO_CUMPLE`).
2. **Informe = comentario del historial** (10 a 1000 caracteres, obligatorio en ambos resultados). **Lo ve el cliente**, igual que los motivos de las otras acciones; el formulario lo avisa («El solicitante verá este informe.»). No hay notas internas.
3. **Fecha de Lima (cambio posterior: ahora es solo fecha, sin hora):** el campo es un `<input type="date">` nativo interpretado en `America/Lima` (UTC-5, sin horario de verano). Debe ser **hoy o posterior** y no más de 90 días desde hoy (inclusive el día 90; cota de cordura contra errores de año, **no** es un plazo legal). Se guarda en la misma columna como el inicio del día en Lima (05:00 UTC) y se muestra siempre solo con fecha (sin migración nueva).
4. **Transiciones nuevas:** `INSPECTOR_DESIGNADO → DILIGENCIA_PROGRAMADA` y `DILIGENCIA_PROGRAMADA → CUMPLE | NO_CUMPLE`, ambas para admin y superadmin, y las tres con flujo propio (no se alcanzan con `cambiarEstado`).
5. **Confirmación:** registrar el resultado no se puede deshacer, así que se pide confirmación en un `AlertDialog` antes de enviar.

## Reutilización
- Existente que se reutiliza: `aplicar` (exportada en `designacion-inspectores`) para el UPDATE condicionado + historial en un solo `db.batch`; `formatFecha` (`modules/expedientes/utils/format-fecha.ts`); `requireRole`; `ActionResult`; `AlertDialog`, `Button`, `Label`, `Textarea`, `Input` de `components/ui/`; patrón de formularios con `useActionState` de `AccionesExpediente`.
- Existente que se extiende: `db/schema.ts` (+1 columna); `modules/expedientes/utils/transiciones.ts` (flujo y `DESTINOS_CON_FLUJO_PROPIO`); `modules/inspecciones/components/PanelInspeccion.tsx` y `InspeccionResumen.tsx` (fecha y resultado); `modules/expedientes/components/ExpedienteDetalleCliente.tsx` (pasa la fecha al resumen).
- Nuevo (y por qué): `utils/fecha-diligencia.ts` (conversión Lima ↔ UTC; no existe), schemas, servicio, acciones y los dos formularios del dominio `inspecciones`.
- Dependencias / componentes shadcn a instalar: **ninguno** (`<input type="date">` y radios nativos). Preparación del humano: `npm run db:migrate` tras T1.

## Specs afectadas
- `designacion-inspectores`: `DESTINOS_CON_FLUJO_PROPIO` pasa de 1 a 4 destinos; `PanelInspeccion` e `InspeccionResumen` ganan casos (sin romper los de esa spec); `cambiar-estado` sigue rechazando los destinos con flujo propio.
- `aprobacion-jefatura` / `bandeja-estados`: la matriz 18 × 18 de `transiciones.test.ts` se actualiza con las tres transiciones nuevas.
- `docs/reglas-negocio-itse.md` 6.1: sin cambios (las transiciones ya figuran); 7.1 y 7.5 siguen vigentes y se completan en `subsanacion-plazos`.

## Criterios de aceptación
- AC-1 (esquema): `expedientes.diligenciaProgramadaPara` (`timestamp with time zone`, nula) en `db/schema.ts` y una migración nueva que solo hace `ALTER TABLE "expedientes" ADD COLUMN "diligencia_programada_para"`; el tipo `Expediente` la incluye.
- AC-2 (utilidades de fecha; ahora solo fecha): `parseFechaLima("2026-11-03")` devuelve el instante `2026-11-03T05:00:00.000Z` (inicio del día en Lima); devuelve `null` para formatos distintos de `YYYY-MM-DD`, fechas imposibles (`2026-02-31`) y cadenas vacías. `aInputLima(date)` devuelve la fecha `YYYY-MM-DD` de Lima de un instante. `validarProgramacion(fecha, ahora)` es `ok` solo si la fecha es ≥ hoy (Lima) y ≤ hoy + 90 días (inclusive); si no devuelve `pasada` o `muy_lejana`.
- AC-3 (máquina pura): `transicionesPermitidas("INSPECTOR_DESIGNADO", "admin")` es `["DILIGENCIA_PROGRAMADA"]` (superadmin además `ANULADO`); `DILIGENCIA_PROGRAMADA` → `["CUMPLE", "NO_CUMPLE"]` (superadmin además `ANULADO`); `CUMPLE` y `NO_CUMPLE` solo ofrecen `ANULADO` al superadmin; `DESTINOS_CON_FLUJO_PROPIO` contiene exactamente `INSPECTOR_DESIGNADO`, `DILIGENCIA_PROGRAMADA`, `CUMPLE`, `NO_CUMPLE`; `transicionesGenericas` de esos estados solo deja `ANULADO` (superadmin). `EN_SUBSANACION` no es destino de ningún estado. `cliente` siempre `[]`. La matriz 18 × 18 falla si algún par no listado es permitido.
- AC-4 (programar, servicio): `programarDiligencia(actor, id, fecha, ahora?)` lanza `Error("No autorizado")` para `cliente`. Resultados: `no_encontrado` → `no_permitido` (estado distinto de `INSPECTOR_DESIGNADO`) → `fecha_invalida` (AC-2) → `conflicto` → `ok`. En `ok` hay **un** `db.batch` (vía `aplicar`) que fija `estado = DILIGENCIA_PROGRAMADA` y `diligencia_programada_para` y registra el historial con comentario `Diligencia programada para el dd/MM/yyyy.` (fecha de Lima, sin hora). Fuera de `ok` y `conflicto` no se invoca `db.batch`.
- AC-5 (resultado, servicio): `registrarResultadoDiligencia(actor, id, { resultado, informe })` lanza `Error("No autorizado")` para `cliente`. Resultados: `no_encontrado` → `no_permitido` (estado distinto de `DILIGENCIA_PROGRAMADA`, o resultado fuera de `CUMPLE`/`NO_CUMPLE`) → `motivo_requerido` (informe de menos de 10 caracteres tras recortar) → `conflicto` → `ok`. En `ok`, **un** `db.batch` con el UPDATE al estado elegido y el historial cuyo comentario es el informe recortado. Intentar registrar el resultado sobre `INSPECTOR_DESIGNADO` o `APROBADO_JEFATURA` devuelve `no_permitido` sin `batch`.
- AC-6 (acciones): `programarDiligenciaAction(id, prev, formData)` y `registrarResultadoAction(id, prev, formData)`: `requireRole("admin", "superadmin")` primero; id uuid (si no, «No se encontró el expediente.» sin tocar la BD); validación Zod (`programadaPara` con formato válido; `resultado` ∈ {`CUMPLE`, `NO_CUMPLE`}, `informe` de 10 a 1000 caracteres) con `fieldErrors`; servicio con el usuario de `requireRole` (nunca un rol o estado del formulario); mensajes: `fecha_invalida` «Elige una fecha desde hoy, dentro de los próximos 90 días.», `motivo_requerido` «Escribe un informe de al menos 10 caracteres.», `no_permitido` «Esa acción no está disponible para este expediente.», `no_encontrado` «No se encontró el expediente.», `conflicto` «El expediente cambió de estado. Actualiza la página e inténtalo de nuevo.», error inesperado «No se pudo guardar el cambio. Inténtalo de nuevo.». Solo en éxito revalidan `/panel/expedientes`, `/panel/expedientes/<id>`, `/mi-cuenta/expedientes` y `/mi-cuenta/expedientes/<id>`.
- AC-7 (no hay atajo): `cambiarEstado` devuelve `no_permitido` sin `batch` para `hasta ∈ {DILIGENCIA_PROGRAMADA, CUMPLE, NO_CUMPLE}`; `cambioEstadoSchema` sigue sin aceptarlos.
- AC-8 (aislamiento): ningún servicio ni acción acepta a `cliente`; la UI del cliente no contiene formularios de estas acciones; un cliente solo ve la fecha y el estado de su propio expediente (lo garantiza `getExpedienteDetalle`).
- AC-9 (UI del personal): en `INSPECTOR_DESIGNADO` el panel muestra el formulario «Programar diligencia»: `<label>` «Fecha de la inspección» con `<input type="date" required min=… max=…>` (`min` = hoy en Lima y `max` = hoy + 90 días, calculados en el servidor con `aInputLima`), el lugar como texto («Lugar: <dirección del establecimiento>») y el botón «Programar» (`h-11`). En `DILIGENCIA_PROGRAMADA` muestra la fecha y el formulario «Registrar resultado»: `<fieldset>` con `<legend>` «Resultado» y radios «Cumple» / «No cumple» (obligatorios), `<label>` «Informe» con `textarea` (`required`, `minLength=10`, `maxLength=1000`), el aviso «El solicitante verá este informe.», errores por campo con `aria-invalid`/`aria-describedby` y mensaje general en `role="alert"`. «Registrar resultado» abre un `AlertDialog` de confirmación («Esta acción no se puede deshacer») y solo ahí envía. Tras `CUMPLE`/`NO_CUMPLE` el panel muestra el resumen sin formularios.
- AC-10 (UI del cliente): `ExpedienteDetalleCliente` muestra, cuando `diligenciaProgramadaPara` no es nula, «Inspección programada: dd/MM/yyyy» y «Lugar: <dirección>» (fecha de Lima, vía `formatFecha`, sin hora), sin nombres del personal administrativo; **cambio posterior:** además lista los nombres de los inspectores designados (solo nombre) y, mientras el estado es `INSPECTOR_DESIGNADO` o `DILIGENCIA_PROGRAMADA`, el aviso «El inspector se comunicará contigo al número registrado del solicitante (<teléfono del expediente>). Mantente atento a tu teléfono.» (sin el número si falta); el historial muestra «Inspección programada», «Cumple» o «No cumple» con su comentario y sin `actorNombre`.
- AC-11 (responsive y accesibilidad): sin desborde horizontal a 360, 768 y 1280 px (campos `w-full`, radios apilados en móvil y en fila desde `sm`); botones `h-11`, foco visible, resultado y estado siempre con texto (no solo color); solo tokens del tema; sin `any`/`@ts-ignore`.
- AC-12: `npm run build`, `npm run lint` y `npx vitest run` pasan.

## Tareas
### T1 — Columna `diligencia_programada_para` y migración
- Archivos: `db/schema.ts` (modificar), `drizzle/0014_*.sql` (crear, generado), `drizzle/meta/0014_snapshot.json` (crear, generado), `drizzle/meta/_journal.json` (modificar, generado)
- Depende de: `designacion-inspectores` T1
- Grupo paralelo: G1
- Cubre: AC-1
- Detalle: `DATABASE_URL="postgres://u:p@localhost/db" npm run db:generate`; usar el siguiente número libre.
- Tests: no aplica (esquema generado).
- [x] Completada

### T2 — Máquina de estados y utilidades de fecha
- Archivos: `modules/expedientes/utils/transiciones.ts` (modificar), `modules/expedientes/utils/transiciones.test.ts` (modificar), `modules/inspecciones/utils/fecha-diligencia.ts` (crear), `modules/inspecciones/utils/fecha-diligencia.test.ts` (crear)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-2, AC-3
- Detalle: `FLUJO.INSPECTOR_DESIGNADO = ["DILIGENCIA_PROGRAMADA"]`, `FLUJO.DILIGENCIA_PROGRAMADA = ["CUMPLE", "NO_CUMPLE"]`; ampliar `DESTINOS_CON_FLUJO_PROPIO`. Utilidades: `parseFechaLima`, `aInputLima`, `validarProgramacion`.
- Tests: matriz 18 × 18, rol por rol; fechas: conversión Lima/UTC, formatos inválidos, fecha imposible, límites exactos de `validarProgramacion` (ahora, ahora + 90 días).
- [x] Completada

### T3 — Schemas y servicio de diligencia
- Archivos: `modules/inspecciones/schemas/diligencia.schema.ts` (crear), `modules/inspecciones/schemas/diligencia.schema.test.ts` (crear), `modules/inspecciones/services/diligencia.service.ts` (crear), `modules/inspecciones/services/diligencia.service.test.ts` (crear)
- Depende de: T1, T2
- Grupo paralelo: G2
- Cubre: AC-4, AC-5, AC-7, AC-8 (servicio)
- Tests: schemas (formatos, resultado inválido, informe de 9/10/1000/1001 caracteres, espacios); servicio con `db` mockeado: cada resultado de AC-4 y AC-5, un solo `db.batch`, `Error("No autorizado")` para cliente, comentario con hora de Lima, `cambiarEstado` rechaza los tres destinos.
- [x] Completada

### T4 — Acciones de servidor
- Archivos: `modules/inspecciones/actions/diligencia.actions.ts` (crear), `modules/inspecciones/actions/diligencia.actions.test.ts` (crear)
- Depende de: T3
- Grupo paralelo: G3
- Cubre: AC-6, AC-8 (acciones)
- Tests: orden `requireRole` → uuid → Zod → servicio; usuario de `requireRole` al servicio; cada mensaje; `revalidatePath` solo en éxito.
- [x] Completada

### T5 — Formularios del personal y vista del cliente
- Archivos: `modules/inspecciones/components/ProgramarDiligenciaForm.tsx` (crear), `modules/inspecciones/components/ResultadoDiligenciaForm.tsx` (crear), `modules/inspecciones/components/PanelInspeccion.tsx` (modificar), `modules/inspecciones/components/InspeccionResumen.tsx` (modificar), `modules/expedientes/components/ExpedienteDetalleCliente.tsx` (modificar)
- Depende de: T4
- Grupo paralelo: G4
- Cubre: AC-9, AC-10, AC-11
- Detalle: `PanelInspeccion` ya recibe `usuario`, `expediente` y `establecimiento` (definido en `designacion-inspectores` T6); `InspeccionResumen` gana la fecha programada y el lugar; la página del personal y la del cliente **no se tocan**.
- Tests: componentes presentacionales con `useActionState` (SETUP.md 3.2); se agrega un test simple de `ResultadoDiligenciaForm` solo si el developer incluye lógica propia (p. ej. habilitar el envío tras confirmar).
- [x] Completada

## Grupos paralelos
- G1: T1 y T2 (archivos disjuntos). G2: T3. G3: T4. G4: T5.

## Fases siguientes
- Spec `subsanacion-plazos`: `DILIGENCIA_PROGRAMADA → EN_SUBSANACION`, `EN_SUBSANACION → CUMPLE | NO_CUMPLE` (ampliando `DESTINOS_CON_FLUJO_PROPIO` y reutilizando `registrarResultadoDiligencia`), catálogo, días hábiles, reprogramación única, riesgo distinto.
- Spec `certificados`: `CUMPLE → CERTIFICADO_PENDIENTE_FIRMA`. Spec de derivación: `NO_CUMPLE → DERIVADO_COMERCIALIZACION` con `accionComercializacion`.
