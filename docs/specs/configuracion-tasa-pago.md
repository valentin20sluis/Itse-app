# Configuración 5/6: tasa de pago en base de datos y consistencia con el pago

Estado: approved

## Objetivo
El monto de la tasa (hoy `MONTO_TASA_BAJO_MEDIO = 15000` y `MONTO_TASA_ALTO_MUY_ALTO = 30000` céntimos en `tasa.ts`) pasa a la tabla `tasas`, una fila por tipo de ITSE, sembrada con esos valores. La sesión de Stripe, la confirmación del pago y el resumen del wizard leen de ahí, y cada expediente guarda el monto realmente cobrado (`expedientes.tasa_monto`) para que un cambio de tasa no invalide pagos en curso ni altere expedientes ya pagados. Sin pantalla aún (spec 6). Comparte las «Decisiones de diseño» de `docs/specs/configuracion-feriados-datos.md`.

## Decisiones
- **Granularidad:** dos montos, por tipo de ITSE (`POSTERIOR` = bajo/medio, `PREVIA` = alto/muy alto), como hoy. No por nivel de riesgo (YAGNI). Moneda fija `pen` (`MONEDA` se mantiene en código).
- **Por qué hay que guardar el monto cobrado:** hoy `confirmarPago` compara `session.amount_total` con `montoTasa(nivel)`. Si el superadmin cambia la tasa entre que el cliente abre Stripe y vuelve, un pago legítimo se rechazaría («no pagado») con el dinero ya cobrado. Solución: `crearSesionPago` guarda `expedientes.tasa_monto` (monto de la sesión vigente) y pone `metadata.tipoItse` en la sesión de Stripe; `confirmarPago` valida contra ese monto guardado.
- **Se conserva la protección actual contra cambio de riesgo:** si tras abrir la sesión el cliente cambia el nivel de riesgo a otro tipo de ITSE (el borrador sigue con el mismo `stripe_session_id`), `confirmarPago` rechaza el pago porque `metadata.tipoItse` ≠ tipo del riesgo actual. Función pura `validarMontoPago` (testable).
- **Datos existentes:** la migración rellena `tasa_monto` de los expedientes con `stripe_session_id` y riesgo definido con el valor de hoy (15000 o 30000), porque la tasa nunca cambió. Las sesiones abiertas antes de la migración no traen `metadata.tipoItse`; para ellas solo se valida el monto (límite aceptado: un cambio de riesgo posterior a la migración sobre una sesión antigua no se detecta; es entorno académico).
- **Reutilizar sesión abierta:** se mantiene la regla actual (se reutiliza solo si el monto es igual al vigente); si la tasa cambió se crea una sesión nueva y se actualiza `tasa_monto`.
- **Fallo de lectura:** si no existe la fila de un tipo, `getTasas()` lanza «Tasa no configurada» (la migración las siembra; no hay valor por defecto oculto).

## Fuera de alcance
- Pantalla de edición (spec 6); descuentos, exoneraciones, otras monedas, reembolsos.
- Cambiar el flujo de Stripe (sigue sin webhooks).
- Mostrar la tasa pagada en pantallas de expedientes ya presentados.

## Reutilización
- Existente que se reutiliza: `configuracion_auditoria` (spec 1); `getStripe`, `tipoItsePorRiesgo`, `MONEDA`; `crearSesionPago`/`confirmarPago`/`guardarSesionPago`.
- Existente que se extiende: `modules/expedientes/constants/tasa.ts` (`montoTasa(nivel, tasas)`); `pago.service.ts`; `expediente.service.ts` (`guardarSesionPago` recibe el monto); `StepResumen.tsx`, `SolicitudWizard.tsx` y la página de nueva solicitud (reciben las tasas por prop).
- Nuevo (y por qué): tabla `tasas` y enum `tipo_itse` (no existía como enum de BD); `tasa-lectura.service.ts`; `utils/pago-monto.ts` (regla pura de validación del monto, constitución §3).
- Dependencias / componentes shadcn a instalar antes de implementar: ninguno.

## Specs afectadas
- `docs/specs/pago-stripe.md`: la validación de `confirmarPago` compara con el monto guardado en el expediente; la tasa deja de ser constante.
- Tests existentes que cambian: `pago.service.test.ts` (el bloque «montoTasa» y los casos de monto), `expediente.service.test.ts` (`guardarSesionPago`), `SolicitudWizard.test.tsx` y `app/mi-cuenta/nueva-solicitud/page.test.tsx` (prop/lectura `tasas`).

## Criterios de aceptación
- AC-1 (migración): `0024` crea el enum `tipo_itse` (`POSTERIOR`, `PREVIA`), la tabla `tasas` (`tipo_itse` clave primaria, `monto_centimos` entero con `CHECK (monto_centimos > 0)`, `updated_at`) con filas `POSTERIOR` = 15000 y `PREVIA` = 30000, la columna `expedientes.tasa_monto` entera nula y el `UPDATE` de relleno descrito. `drizzle-kit generate` no produce cambios nuevos.
- AC-2 (lectura): `getTasas()` devuelve `{ POSTERIOR: number; PREVIA: number }` en céntimos, sin exigir rol, una consulta por petición; lanza «Tasa no configurada» si falta una fila. `montoTasa(nivel, tasas)` devuelve `tasas.POSTERIOR` para BAJO/MEDIO y `tasas.PREVIA` para ALTO/MUY_ALTO. Tests.
- AC-3 (sesión): `crearSesionPago` usa la tasa leída de la BD, envía `metadata: { expedienteId, tipoItse }` y guarda `tasa_monto` junto con `stripe_session_id`. Con la semilla el monto enviado es idéntico al actual. Si una sesión abierta tiene otro monto que el vigente, se crea una nueva. Tests.
- AC-4 (confirmación): `validarMontoPago({ amountTotal, tasaMonto, tipoSesion, tipoActual, montoActual })` es verdadero solo si (a) `tipoSesion` es `undefined` o igual a `tipoActual`, y (b) `amountTotal` es igual a `tasaMonto` o, si es `null`, a `montoActual`. Tests de la tabla de casos (tasa cambió tras abrir sesión → válido; riesgo cambió de tipo → inválido; monto menor o mayor → inválido; sesión antigua sin metadata → solo monto).
- AC-5 (no regresión del pago): `confirmarPago` mantiene todos sus rechazos actuales (moneda ≠ `pen`, `client_reference_id` ajeno, `stripe_session_id` distinto, no pagado) y los casos «monto menor/mayor al del riesgo actual» de `pago.service.test.ts` se conservan reexpresados con el monto guardado. Test: pago con la tasa vieja tras subir la tasa → `ok`.
- AC-6 (histórico): ningún código reescribe `tasa_monto` de un expediente que ya no está en `BORRADOR`; `guardarSesionPago` solo actúa sobre borradores propios (condición existente `ownBorrador`). Test.
- AC-7 (wizard): el resumen del paso final muestra el monto con formato `Intl` en soles tomado de las tasas recibidas por prop; cambiar el nivel de riesgo en el paso 2 actualiza el monto mostrado según el tipo de ITSE. Test de `SolicitudWizard`/resumen y de la página (lee `getTasas` y lo pasa).
- AC-8 (sin constantes): `MONTO_TASA_BAJO_MEDIO` y `MONTO_TASA_ALTO_MUY_ALTO` no existen; `grep` no devuelve resultados. `npm run build`, `npm run lint` y `npx vitest run` pasan.

## Tareas
### T1 — Tabla de tasas, columna y semilla
- Archivos: `db/schema.ts` (modificar), `drizzle/0024_<nombre generado>.sql` (crear), `drizzle/meta/_journal.json` (modificar), `drizzle/meta/0024_snapshot.json` (crear)
- Depende de: ninguna (specs 1 y 2 implementadas)
- Grupo paralelo: G1
- Cubre: AC-1
- Detalle: el `CHECK` y el `INSERT`/`UPDATE` se añaden a mano al `.sql` generado. Exportar `tipoItseEnum` y el tipo `Tasa`.
- Tests: no aplica (esquema y SQL).
- [x] Completada

### T2 — Lectura de tasas y cálculo del monto
- Archivos: `modules/configuracion/services/tasa-lectura.service.ts` (crear), `modules/configuracion/services/tasa-lectura.service.test.ts` (crear), `modules/expedientes/constants/tasa.ts` (modificar), `modules/expedientes/constants/tasa.test.ts` (crear)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-2, AC-8 (parte)
- Detalle: `getTasas()` con `cache()` de React; `tasa.ts` conserva `MONEDA`, exporta `montoTasa(nivel, tasas)` y el tipo `Tasas`, sin las constantes de monto.
- Tests: AC-2.
- [x] Completada

### T3 — Regla de validación del monto y guardado en el expediente
- Archivos: `modules/expedientes/utils/pago-monto.ts` (crear), `modules/expedientes/utils/pago-monto.test.ts` (crear), `modules/expedientes/services/expediente.service.ts` (modificar), `modules/expedientes/services/expediente.service.test.ts` (modificar)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-4, AC-6
- Detalle: `guardarSesionPago(actor, id, stripeSessionId, tasaMonto)` escribe ambos campos en el mismo `UPDATE` con `ownBorrador`. Es un cambio de firma: `pago.service.ts` se adapta en T4.
- Tests: tabla de AC-4; `guardarSesionPago` guarda el monto y no actúa sobre expedientes que no son borrador propio.
- [x] Completada

### T4 — Pago con tasa de la BD
- Archivos: `modules/expedientes/services/pago.service.ts` (modificar), `modules/expedientes/services/pago.service.test.ts` (modificar)
- Depende de: T2, T3
- Grupo paralelo: G3
- Cubre: AC-3, AC-5, AC-8
- Detalle: `crearSesionPago` lee `getTasas()`, calcula el monto, envía `metadata.tipoItse`, y llama `guardarSesionPago` con el monto; `confirmarPago` usa `validarMontoPago` con `session.metadata?.tipoItse`, `exp.tasaMonto` y el monto vigente.
- Tests: reexpresar los casos existentes y agregar «la tasa subió mientras el cliente pagaba», «cambió el tipo de ITSE», sesión antigua sin metadata.
- [x] Completada

### T5 — Resumen del wizard con la tasa de la BD
- Archivos: `modules/expedientes/components/StepResumen.tsx` (modificar), `modules/expedientes/components/SolicitudWizard.tsx` (modificar), `modules/expedientes/components/SolicitudWizard.test.tsx` (modificar), `app/mi-cuenta/nueva-solicitud/page.tsx` (modificar), `app/mi-cuenta/nueva-solicitud/page.test.tsx` (modificar)
- Depende de: T2
- Grupo paralelo: G3
- Cubre: AC-7
- Detalle: la página llama `getTasas()` y pasa `tasas` a `SolicitudWizard`, que lo entrega a `StepResumen` (prop obligatoria); `StepResumen` usa `montoTasa(nivel, tasas)`.
- Tests: ajustar los existentes con la prop; el monto mostrado cambia con el nivel de riesgo.
- [x] Completada

## Grupos paralelos
G1: T1. G2: T2 y T3 (archivos disjuntos). G3: T4 y T5 (archivos disjuntos).

## Fases siguientes
- Fase 6: `configuracion-tasa-gestion` (formulario del superadmin con confirmación y auditoría; cierre documental).
