# Configuración 6/6: gestión de la tasa de pago

Estado: approved

## Objetivo
El superadmin, en `/panel/configuracion/tasas`, ve y cambia el monto de la tasa de ITSE posterior (riesgo bajo y medio) y de ITSE previa (riesgo alto y muy alto), con confirmación y auditoría. El cambio rige para los pagos que se inicien desde ese momento; los pagos en curso y los expedientes ya pagados se respetan (spec 5). Depende de `configuracion-tasa-pago` y `configuracion-feriados-gestion`. Comparte las «Decisiones de diseño» de `docs/specs/configuracion-feriados-datos.md`.

## Decisiones
- **Entrada:** montos en soles con hasta 2 decimales, escritos con punto o coma (`150`, `150.50`, `150,5`). Se convierten a céntimos con una utilidad de cadenas (sin aritmética de coma flotante). Rango permitido: S/ 5.00 a S/ 5,000.00 (el piso evita montos que Stripe rechaza y errores de tipeo; el techo evita un cero de más).
- **Un solo formulario, dos campos:** guardar abre un `AlertDialog` que muestra, por cada monto modificado, «Antes → Ahora» y avisa: «Rige para los pagos que se inicien desde ahora. Los pagos en curso y los expedientes ya pagados no cambian.». Solo se auditan los tipos que cambiaron (una fila por tipo).
- **Auditoría:** `entidad` `TASA`, acción `EDITAR`, `referencia` = `POSTERIOR` o `PREVIA`, valores anterior/nuevo = céntimos como texto. Los cambios y sus filas se escriben en un único `db.batch`.
- **Etiquetas en pantalla:** «Riesgo bajo y medio (ITSE posterior)» y «Riesgo alto y muy alto (ITSE previa)»; sin términos técnicos.

## Fuera de alcance
- Tasa por nivel de riesgo individual, vigencias por fechas, descuentos, otras monedas.
- Revertir cambios desde el historial; reembolsos.
- Cambiar la vigencia del certificado, los plazos o la alerta (fijos; ver spec 1).

## Reutilización
- Existente que se reutiliza: `getTasas` y tabla `tasas` (spec 5); `auditoriaFila`, `listAuditoria`, `HistorialCambios`, `describirCambioConfig` (formatea los céntimos), `ConfiguracionView` (spec 2); `requireRole`, `ActionResult`, `AlertDialog`, `Input`, `Label`, `Card`, `Button`.
- Existente que se extiende: `ConfiguracionView.tsx` (tarjeta «Tasa de pago»).
- Nuevo (y por qué): `tasa.schema.ts` con la conversión soles→céntimos (no existe), `tasa-gestion.service.ts`, `tasa.actions.ts`, `TasasForm`, página.
- Dependencias / componentes shadcn a instalar antes de implementar: ninguno.

## Specs afectadas
- `docs/specs/configuracion-feriados-gestion.md`: `ConfiguracionView` suma una tarjeta.
- Cierre documental (a cargo del orquestador al terminar esta spec): `docs/reglas-negocio-itse.md` §4 (monto de la tasa configurable), §7.3 (catálogo en BD), §11 (fila «Gestionar catálogo de observaciones y feriados» → implementada, más la tasa) y nota final (quitar «la pantalla de configuración sigue mostrando Próximamente»); `docs/constitucion-itse.md` §6 y §2.

## Criterios de aceptación
- AC-1 (autorización): la página y `guardarTasasAction` llaman `requireRole("superadmin")` primero; `guardarTasas` y `listTasas` lanzan «No autorizado» si el actor no es `superadmin` y no tocan la BD. Tests de página, acción y servicio.
- AC-2 (validación): `tasasSchema` acepta `"150"`, `"150.50"`, `"150,5"` → 15000, 15050, 15050 céntimos; rechaza vacío, texto, negativos, más de 2 decimales (`"10.999"`), menos de S/ 5.00 y más de S/ 5,000.00, con mensaje por campo. Test del schema y de la utilidad de conversión (sin errores de coma flotante: `"19.99"` → 1999 y `"1.15"` → 115 exactos).
- AC-3 (sin cambios): si ambos montos son iguales a los vigentes, el servicio devuelve «No hay cambios que guardar.» sin escribir ni auditar. Test.
- AC-4 (auditoría atómica): un cambio efectivo ejecuta un único `db.batch` con el `UPDATE` de `tasas` y una fila de auditoría por tipo modificado (`TASA`, `EDITAR`, `referencia`, valores en céntimos, `actor_id`); si el lote falla, no queda ninguna escritura. Tests.
- AC-5 (consistencia con el pago): tras guardar, `getTasas()` devuelve los montos nuevos; `crearSesionPago` usa el nuevo monto; un pago ya iniciado con el monto anterior sigue siendo aceptado por `confirmarPago` (cubierto por la spec 5, AC-5; esta spec añade un test de servicio que encadena `guardarTasas` y `getTasas` con la BD simulada) y ningún expediente no borrador cambia de `tasa_monto` (el servicio no emite `UPDATE` sobre `expedientes`). Revisión del reviewer.
- AC-6 (UI): `TasasForm` muestra los dos montos actuales en campos con `Label` (prefijo «S/», `inputMode="decimal"`), error por campo con `aria-describedby`, error general en `role="alert"`; el botón principal azul «Guardar cambios» (alto mínimo 44 px) está deshabilitado mientras no haya cambios y abre el `AlertDialog` con «Antes → Ahora» por cada monto modificado, «Cancelar» y «Confirmar cambio» que muestra «Guardando…»; el diálogo no se cierra con error; operable con teclado; sin desborde a 360/768/1280 px (revisión manual).
- AC-7 (historial y hub): los cambios aparecen en «Historial de cambios» de la página («Cambió la tasa de ITSE posterior: S/ 150.00 → S/ 160.00»); el hub muestra la tarjeta «Tasa de pago» con enlace.
- AC-8: textos en español sin términos técnicos; solo tokens del tema; `npm run build`, `npm run lint` y `npx vitest run` pasan.

## Tareas
### T1 — Schema, conversión y servicio de gestión
- Archivos: `modules/configuracion/schemas/tasa.schema.ts` (crear), `modules/configuracion/schemas/tasa.schema.test.ts` (crear), `modules/configuracion/services/tasa-gestion.service.ts` (crear), `modules/configuracion/services/tasa-gestion.service.test.ts` (crear)
- Depende de: ninguna (specs 2 y 5 implementadas)
- Grupo paralelo: G1
- Cubre: AC-1 (servicio), AC-2, AC-3, AC-4, AC-5
- Detalle: `solesACentimos(texto): number | null` (regex `^\d+([.,]\d{1,2})?$`, sin `parseFloat` para los céntimos); `tasasSchema` con `posterior` y `previa`. `listTasas(actor)` y `guardarTasas(actor, { posterior, previa })` → `{ ok; data } | { ok: false; error }`.
- Tests: casos de AC-1 a AC-5 con BD simulada.
- [ ] Completada

### T2 — Server Action
- Archivos: `modules/configuracion/actions/tasa.actions.ts` (crear), `modules/configuracion/actions/tasa.actions.test.ts` (crear)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-1 (acción), AC-2
- Detalle: `"use server"`; `guardarTasasAction(formData)`: `requireRole("superadmin")` → zod con `fieldErrors` → servicio → `revalidatePath("/panel/configuracion/tasas")` y `revalidatePath("/mi-cuenta/nueva-solicitud")`. Excepción → «No se pudo guardar el cambio. Inténtalo de nuevo.».
- Tests: rechazo de rol, validación con `fieldErrors`, éxito con ambas revalidaciones, error sin revalidar.
- [ ] Completada

### T3 — Formulario de tasas
- Archivos: `modules/configuracion/components/TasasForm.tsx` (crear), `modules/configuracion/components/TasasForm.test.tsx` (crear)
- Depende de: T2
- Grupo paralelo: G3
- Cubre: AC-6, AC-8
- Detalle: `"use client"`; `TasasForm({ tasas, historial })` con estado local de los dos campos, detección de cambios, `AlertDialog` de confirmación y `HistorialCambios` debajo.
- Tests: deshabilitado sin cambios; abrir el diálogo muestra «Antes → Ahora» solo de lo modificado; la acción no se llama sin confirmar; error general y por campo; el diálogo sigue abierto con error.
- [ ] Completada

### T4 — Página y tarjeta en el hub
- Archivos: `app/panel/configuracion/tasas/page.tsx` (crear), `app/panel/configuracion/tasas/page.test.tsx` (crear), `modules/configuracion/components/ConfiguracionView.tsx` (modificar)
- Depende de: T3
- Grupo paralelo: G4
- Cubre: AC-1 (página), AC-7
- Detalle: página de servidor: `requireRole("superadmin")`, `listTasas`, `listAuditoria(actor, "TASA")`. El hub agrega «Tasa de pago».
- Tests: página — rol `superadmin`, rechazo corta antes de leer.
- [ ] Completada

## Grupos paralelos
G1: T1. G2: T2. G3: T3. G4: T4.

## Fases siguientes
- Cierre documental (orquestador), ver «Specs afectadas».
- Posible fase futura: alerta de vencimiento configurable (hoy fija en 60 días; ver spec 1) y renovación de certificados.
