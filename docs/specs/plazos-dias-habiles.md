# Plazos y días hábiles (utilidades puras)

Estado: approved

Parte 1 de 4 de `subsanacion-plazos`. Sin dependencias. Las partes 3 y 4 (`observaciones-diligencia`, `subsanacion-evidencia`) dependen de esta. La parte 2 (`subsanacion-requisitos`) es independiente.

## Objetivo
Calcular fechas límite en **días hábiles** (sin sábados, domingos ni feriados nacionales) y saber cuántos días quedan o si un plazo venció, con funciones puras y testeadas. Las usan la suspensión de la diligencia (3 días hábiles en ITSE posterior, 20 en ITSE previa; `reglas-negocio` 7.2 y 8) y la evaluación de la subsanación.

## Fuera de alcance
- Tabla `feriados` y pantalla de superadmin para editarlos (ver decisión 1).
- Cualquier UI, columna o servicio: esta spec solo agrega funciones puras y constantes.
- Plazo de ejecución de la diligencia (7 días hábiles), plazo total del procedimiento (7 o 9) y alertas: pendientes de verificar en el texto oficial (`reglas-negocio` sección 8).
- Reprogramación por diligencia no realizada (2 días hábiles): spec `diligencia-no-concluida`.
- Job o cron que marque vencimientos (decisión 2).

## Decisiones (a confirmar al aprobar)
1. **Feriados como constante en código, no tabla.** `constitucion-itse.md` 6 y `reglas-negocio` 11 hablan de una tabla `feriados` administrable por el superadmin. Se propone una lista fija en `modules/inspecciones/constants/feriados.ts` porque: son pocas fechas, cambian una vez al año, el proyecto es académico y una tabla obliga a seed, migración con datos y una pantalla CRUD que no aporta al flujo. Es una lista de **referencia ficticia/mantenible**: cubre solo 2026 y 2027 y se debe contrastar con el calendario oficial. Fuera de esos años solo se excluyen fines de semana (`ponytail`: límite conocido; para ampliar basta agregar fechas, o crear la tabla en una spec posterior si el humano la quiere).
2. **Vencimiento calculado al leer, sin cron** (coherente con `constitucion-itse.md` 6): un plazo está vencido cuando la fecha de hoy en Lima es posterior a la fecha límite.
3. **Convención de cómputo:** el plazo cuenta desde el **día hábil siguiente** a la suspensión; la fecha límite es un día hábil completo (inclusive: el último día vale hasta las 23:59 de Lima). Se guarda como inicio de ese día en Lima (05:00 UTC), igual que `diligencia_programada_para`.
4. **Hora de Lima:** se reutiliza `parseFechaLima`/`aInputLima` de `fecha-diligencia.ts` (UTC-5 fijo).

## Reutilización
- Existente que se reutiliza: `modules/inspecciones/utils/fecha-diligencia.ts` (`parseFechaLima`, `aInputLima`); `tipoItsePorRiesgo` de `modules/expedientes/utils/riesgo.ts` (lo usarán las partes siguientes, no esta).
- Existente que se extiende: ninguno.
- Nuevo (y por qué): `constants/feriados.ts`, `utils/dias-habiles.ts`, `utils/plazo-subsanacion.ts` en `modules/inspecciones/`; no existe nada de días hábiles.
- Dependencias / componentes shadcn a instalar: ninguno. Migraciones: ninguna.

## Specs afectadas
- Ninguna existente. `diligencia-inspeccion` (su «Fases siguientes») queda cubierta por las partes 3 y 4.

## Criterios de aceptación
- AC-1 (feriados): `FERIADOS` es un arreglo de cadenas `YYYY-MM-DD` ordenado, sin duplicados, todas válidas según `parseFechaLima`, que contiene exactamente, para 2026: `01-01`, `04-02`, `04-03`, `05-01`, `06-29`, `07-28`, `07-29`, `08-30`, `10-08`, `11-01`, `12-08`, `12-09`, `12-25`; y para 2027: `01-01`, `03-25`, `03-26`, `05-01`, `06-29`, `07-28`, `07-29`, `08-30`, `10-08`, `11-01`, `12-08`, `12-09`, `12-25` (Jueves y Viernes Santo incluidos; otras fechas dudosas como 23/07, 06/08 o 31/10 no se incluyen hasta verificarlas). Un comentario indica que es lista de referencia y los años cubiertos.
- AC-2 (`esDiaHabil(fecha: string, feriados = FERIADOS)`): `2026-10-28` (miércoles) y `2026-10-30` (viernes) son hábiles; `2026-10-31` (sábado) y `2026-11-01` (domingo) no; `2026-12-08` (martes feriado) no; con una lista inyectada que incluya `2026-10-28`, ese día deja de ser hábil.
- AC-3 (`sumarDiasHabiles(desde: Date, n: number, feriados = FERIADOS): Date`): toma la fecha de Lima de `desde` (sin importar la hora) y devuelve el **inicio de día en Lima** del n-ésimo día hábil posterior. Casos: `n = 0` devuelve el inicio de día de la misma fecha; miércoles 2026-10-28 + 3 = lunes `2026-11-02`; viernes 2026-10-30 + 1 = lunes `2026-11-02`; sábado 2026-10-31 + 1 = lunes `2026-11-02`; viernes 2026-12-04 + 3 = viernes `2026-12-11` (salta 08 y 09 de diciembre); miércoles 2026-10-28 + 20 = `2026-11-25`. Un `n` negativo o no entero lanza `RangeError`. Instantes cercanos a medianoche: `2026-10-29T04:59:00Z` es 28/10 en Lima y `2026-10-29T05:00:00Z` es 29/10.
- AC-4 (`estadoPlazo(limite: Date, ahora: Date, feriados?)` devuelve `{ vencido: boolean; diasRestantes: number }`): `vencido` es `true` solo si la fecha de Lima de `ahora` es posterior a la de `limite`; `diasRestantes` es la cantidad de días hábiles en el intervalo (hoy, límite] y `0` si vence hoy o ya venció. Con límite `2026-11-02`: ahora = `2026-10-28` → `{ vencido: false, diasRestantes: 3 }`; ahora = sábado `2026-10-31` → `{ false, 1 }`; ahora = `2026-11-02` 15:00 Lima → `{ false, 0 }`; ahora = `2026-11-03T04:59:00Z` → `{ false, 0 }`; ahora = `2026-11-03T05:00:00Z` → `{ true, 0 }`.
- AC-5 (`plazo-subsanacion.ts`): `plazoSubsanacionDias("POSTERIOR")` = 3 y `("PREVIA")` = 20 (`reglas-negocio` 7.2). `calcularLimiteSubsanacion(tipo, suspendidaEn: Date)` = `sumarDiasHabiles(suspendidaEn, plazoSubsanacionDias(tipo))`: POSTERIOR con `2026-10-28T15:00:00Z` → `2026-11-02T05:00:00.000Z`; PREVIA → `2026-11-25T05:00:00.000Z`. Exporta `type TipoItse = "POSTERIOR" | "PREVIA"`.
- AC-6 (`validarReprogramacion(fecha: Date, limite: Date, ahora: Date)` devuelve `"ok" | "pasada" | "fuera_de_plazo"`): `ok` si la fecha de Lima de `fecha` es ≥ hoy y ≤ la de `limite` (ambos extremos incluidos); `pasada` si es anterior a hoy; `fuera_de_plazo` si es posterior al límite.
- AC-7: sin `any`/`@ts-ignore`; `npm run build`, `npm run lint` y `npx vitest run` pasan.

## Tareas
### T1 — Feriados y días hábiles
- Archivos: `modules/inspecciones/constants/feriados.ts` (crear), `modules/inspecciones/utils/dias-habiles.ts` (crear), `modules/inspecciones/utils/dias-habiles.test.ts` (crear)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-1, AC-2, AC-3, AC-4
- Tests: `dias-habiles.test.ts` — integridad de `FERIADOS` (formato, orden, sin duplicados, lista exacta), `esDiaHabil` (fin de semana, feriado en día de semana, lista inyectada), `sumarDiasHabiles` (todos los casos de AC-3, `RangeError`, medianoche de Lima), `estadoPlazo` (todos los casos de AC-4).
- [x] Completada

### T2 — Plazo de subsanación y validación de reprogramación
- Archivos: `modules/inspecciones/utils/plazo-subsanacion.ts` (crear), `modules/inspecciones/utils/plazo-subsanacion.test.ts` (crear)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-5, AC-6
- Tests: `plazo-subsanacion.test.ts` — 3 y 20 días, límites exactos de los dos casos de AC-5, `validarReprogramacion` en hoy, día del límite (ambos `ok`), día anterior a hoy (`pasada`) y día posterior al límite (`fuera_de_plazo`).
- [x] Completada

## Grupos paralelos
- G1: T1. G2: T2.

## Fases siguientes
- `observaciones-diligencia` y `subsanacion-evidencia` consumen estas funciones. Si el humano prefiere feriados administrables: spec posterior `feriados` (tabla + CRUD de superadmin).
