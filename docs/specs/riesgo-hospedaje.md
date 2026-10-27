# Riesgo sugerido para Hospedaje

Estado: approved

Dependencia: requiere `documentos-por-riesgo` aprobada y terminada (usa su migración `0007`, los mismos archivos de schema/servicio/acciones/`StepRiesgo` y los umbrales generales 2/500). Su migración será `0008`.

## Objetivo
Cuando la función del establecimiento es Hospedaje, el nivel de riesgo sugerido en el paso 2 sale de la Matriz de Riesgos CENEPRED (mínimo MEDIO; nunca BAJO) usando pisos, camas o habitaciones, área techada, uso mixto/patrimonio, gran escala y sótano. Para las demás funciones se mantiene la lógica general. El cliente sigue declarando el nivel y el admin lo confirma; los documentos requeridos dependen solo del nivel final declarado.

## Fuera de alcance
- Cambiar la lógica de otras funciones o los documentos requeridos (solo dependen del nivel).
- Distinguir sótano comercial/estacionamiento amplio de otro sótano: límite aceptado, se resuelve con la casilla de gran escala.
- Migrar datos de establecimientos Hospedaje ya existentes (`numero_camas` queda null hasta que se editen).
- Mostrar `numero_camas` en `EstablecimientoCard` o listados.

## Reutilización
- Datos que ya existen en `establecimientos` y se reutilizan: `funcion` (nullable en BD), `areaM2` (área techada total), `numeroPisos`. **Falta** `numero_camas` (nuevo, nullable). En `expedientes` ya existe `tiene_sotano`; faltan `uso_mixto_patrimonio` y `gran_escala`.
- Existente que se extiende: `utils/riesgo.ts` (`sugerirNivelRiesgo` y `DatosRiesgo`); `establecimiento.schema.ts` (superRefine ya existente para el piso); `EstablecimientoForm` (campo condicional con el patrón controlado `values`); `paso2Schema`, `patchToValues`, `parsePaso(2)`, `StepRiesgo`.
- Nuevo (y por qué): tabla de umbrales de Hospedaje dentro de `riesgo.ts` (no existe matriz por función).
- Dependencias / componentes shadcn a instalar antes de implementar: ninguno. `db:migrate` lo ejecuta el orquestador/humano tras R1.

## Supuestos para confirmar
1. `numero_camas` = "camas o habitaciones", entero >= 1, 1 a 5000, obligatorio solo si Función = HOSPEDAJE; para otras funciones el servicio guarda null aunque llegue valor.
2. Hospedaje existente con `numero_camas` null: la sugerencia ignora el criterio de camas y se pide el dato al editar el establecimiento (el schema lo exige en la edición).
3. Nivel = el MÁS ALTO entre criterios. Pisos: <= 2 MEDIO, 3-4 ALTO, >= 5 MUY_ALTO. Camas: <= 20 MEDIO, 21-100 ALTO, > 100 MUY_ALTO. Área (m²): <= 500 MEDIO, > 500 y <= 3000 ALTO, > 3000 MUY_ALTO (500,01 es ALTO; 3000,01 es MUY_ALTO). `usoMixtoPatrimonio` => al menos ALTO; `granEscala` => MUY_ALTO; sótano => al menos ALTO. Los sumandos de "factores" de la lógica general NO se aplican a Hospedaje (el sótano usa su propia regla; inflamables no cambia el nivel en Hospedaje, solo la licencia vía documentos).
4. Las casillas de uso mixto/patrimonio y gran escala solo aparecen si `funcion === "HOSPEDAJE"`; si la función no es Hospedaje no se envían y se guardan en false.
5. Función null (datos antiguos) se trata como no Hospedaje.

## Criterios de aceptación
- AC-1: `establecimientos.numero_camas` (integer, nullable) y `expedientes.uso_mixto_patrimonio`, `expedientes.gran_escala` (boolean not null default false) existen; `0008` se genera y aplica sin errores.
- AC-2: `sugerirNivelRiesgo({ ..., funcion, numeroCamas, usoMixtoPatrimonio, granEscala })`: Hospedaje nunca devuelve BAJO; límites verificados: 2 pisos MEDIO / 3 ALTO; 4 ALTO / 5 MUY_ALTO; 20 camas MEDIO / 21 ALTO; 100 ALTO / 101 MUY_ALTO; 500 m² MEDIO / 501 ALTO; 3000 ALTO / 3001 MUY_ALTO; `esGrifo` (spec `documentos-por-riesgo`, punto 7) tiene prioridad y devuelve MEDIO antes de aplicar la matriz; el resultado es el máximo de los criterios (p. ej. 2 pisos, 20 camas, 400 m² con 101 camas => MUY_ALTO).
- AC-3: Hospedaje con sótano => al menos ALTO; con `usoMixtoPatrimonio` => al menos ALTO; con `granEscala` => MUY_ALTO; con `numeroCamas` null ignora camas.
- AC-4: Para funciones distintas de Hospedaje (incluida null) el resultado es idéntico al de `documentos-por-riesgo` (los tests generales siguen pasando y `usoMixtoPatrimonio`/`granEscala` se ignoran).
- AC-5: `establecimientoSchema` exige `numeroCamas` (entero 1-5000, mensaje en español) cuando `funcion === "HOSPEDAJE"` y lo ignora (null) en otras funciones; `createEstablecimiento`/`updateEstablecimiento` persisten `numeroCamas` y guardan null si la función no es Hospedaje (incluido al cambiar la función en una edición).
- AC-6: `EstablecimientoForm` muestra "Número de camas o habitaciones" solo con Función = Hospedaje, con error asociado al campo, precargado al editar y conservando el valor al fallar la validación.
- AC-7: `paso2Schema` acepta `usoMixtoPatrimonio` y `granEscala` como checkbox; `patchToValues` y `parsePaso(2)` los persisten.
- AC-8: `StepRiesgo` muestra "¿Está en una edificación de uso mixto o es patrimonio cultural?" y "¿Tiene restaurante de alta capacidad, discoteca o salas de eventos integradas?" solo si la función es Hospedaje, y la sugerencia se recalcula al marcarlas; pasa `funcion` y `numeroCamas` a `sugerirNivelRiesgo`.
- AC-9: `docs/reglas-negocio-itse.md` 2.1 incluye la tabla de Hospedaje y los límites aceptados (sótano, camas null).
- AC-10: `npm run build`, `npm run lint` y `npx vitest run` pasan.

## Tareas
### R1 — Migración de datos
- Archivos: `db/schema.ts` (modificar), `drizzle/0008_*.sql` (crear, generado), `drizzle/meta/0008_snapshot.json` (crear, generado), `drizzle/meta/_journal.json` (modificar, generado)
- Depende de: `documentos-por-riesgo` terminada
- Grupo paralelo: G1
- Cubre: AC-1
- Tests: no aplica (esquema; SETUP.md 3.2)
- [ ] Completada

### R2 — Matriz de Hospedaje (función pura)
- Archivos: `modules/expedientes/utils/riesgo.ts` (modificar), `modules/expedientes/utils/riesgo.test.ts` (modificar), `docs/reglas-negocio-itse.md` (modificar: 2.1)
- Depende de: `documentos-por-riesgo` terminada
- Grupo paralelo: G1
- Cubre: AC-2, AC-3, AC-4, AC-9
- Tests: `riesgo.test.ts` — todos los límites de AC-2, máximo entre criterios, sótano/uso mixto/gran escala, camas null, no Hospedaje inalterado, nunca BAJO en Hospedaje
- [ ] Completada

### R3 — Schema y action de establecimientos
- Archivos: `modules/establecimientos/schemas/establecimiento.schema.ts` (modificar), `modules/establecimientos/schemas/establecimiento.schema.test.ts` (modificar), `modules/establecimientos/actions/establecimiento.actions.ts` (modificar), `modules/establecimientos/actions/establecimiento.actions.test.ts` (modificar)
- Depende de: R1
- Grupo paralelo: G2
- Cubre: AC-5 (validación y lectura de `formData`)
- Tests: schema — Hospedaje sin camas / 0 / 1.5 / 5001 falla, válido pasa; otras funciones ignoran el valor; actions — `numeroCamas` llega al servicio y errores por campo
- [ ] Completada

### R4 — Servicio y formulario de establecimientos
- Archivos: `modules/establecimientos/services/establecimiento.service.ts` (modificar), `modules/establecimientos/services/establecimiento.service.test.ts` (modificar), `modules/establecimientos/components/EstablecimientoForm.tsx` (modificar), `modules/establecimientos/components/EstablecimientoForm.test.tsx` (modificar)
- Depende de: R3
- Grupo paralelo: G3
- Cubre: AC-5 (persistencia), AC-6
- Tests: servicio — persiste camas en Hospedaje y null en otra función, también al editar; formulario — campo visible solo con Hospedaje, valor conservado tras error, precarga al editar
- [ ] Completada

### R5 — Schema y servicio del paso 2
- Archivos: `modules/expedientes/schemas/solicitud.schema.ts` (modificar), `modules/expedientes/schemas/solicitud.schema.test.ts` (modificar), `modules/expedientes/services/expediente.service.ts` (modificar), `modules/expedientes/services/expediente.service.test.ts` (modificar)
- Depende de: R1
- Grupo paralelo: G2
- Cubre: AC-7 (schema y `patchToValues`)
- Tests: checkbox `"on"`/ausente para ambos campos; `updateBorrador` paso 2 persiste los dos
- [ ] Completada

### R6 — Action del paso 2 y StepRiesgo con Hospedaje
- Archivos: `modules/expedientes/actions/expediente.actions.ts` (modificar), `modules/expedientes/actions/expediente.actions.test.ts` (modificar), `modules/expedientes/components/StepRiesgo.tsx` (modificar), `modules/expedientes/components/SolicitudWizard.test.tsx` (modificar: fixtures `numeroCamas`, `usoMixtoPatrimonio`, `granEscala`; casos de Hospedaje)
- Depende de: R2, R4, R5
- Grupo paralelo: G4
- Cubre: AC-7 (`parsePaso(2)`), AC-8
- Tests: acción — pasa los dos campos; `SolicitudWizard.test.tsx` — con Hospedaje aparecen las dos casillas y la sugerencia sube a ALTO/MUY_ALTO al marcarlas; con otra función no aparecen
- [ ] Completada

Grupos: G1 {R1, R2}; G2 {R3, R5}; G3 {R4}; G4 {R6}. Dentro de cada grupo los archivos son disjuntos.
(R4 va en G3 porque necesita el tipo de input de R3; R6 en G4 porque usa el `numeroCamas` del servicio de R4 en los fixtures y el schema de R5.)

## Fases siguientes
- Matrices por función para Educación, Salud, Encuentro, etc., si el proyecto las requiere.
