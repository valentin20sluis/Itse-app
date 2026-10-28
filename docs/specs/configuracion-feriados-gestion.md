# Configuración 2/6: gestión de feriados y base de la sección

Estado: approved

## Objetivo
El superadmin entra a `/panel/configuracion`, ve las secciones configurables y las reglas fijas por norma, y en `/panel/configuracion/feriados` agrega, renombra y elimina feriados con confirmación y rastro de auditoría. Los cambios se reflejan en los plazos y días restantes gracias a la spec 1. También deja listos los bloques compartidos de la sección (auditoría de configuración, historial de cambios, hub) que usan las specs 4 y 6. Depende de `docs/specs/configuracion-feriados-datos.md` (implementada) y comparte sus «Decisiones de diseño».

## Fuera de alcance
- Editar la fecha de un feriado (se elimina y se crea otro; la fecha es la clave).
- Importar feriados en bloque; calendario visual; feriados regionales.
- Catálogo y tasa (specs 3 a 6); cambiar vigencia, plazos o alerta (son fijos; ver spec 1).
- Recalcular fechas límite de expedientes ya en subsanación.

## Reutilización
- Existente que se reutiliza: tabla `feriados` y `configuracion_auditoria` y `getFeriados` (spec 1); `requireRole` y `Actor`; `ActionResult` (`lib/action-result.ts`); `AlertDialog`, `Dialog`, `Input`, `Label`, `Table`, `Card`, `Badge`, `Button` de `components/ui/`; `PageHeader` y `EmptyState` de `components/shared/`; `parseFechaLima` y `aInputLima` (`fecha-diligencia.ts`) para validar y mostrar la fecha; `formatFecha`; patrón de tabla en escritorio y tarjetas en celular de `UsuariosView`; patrón de diálogo con `useTransition` y error en `role="alert"` de `ToggleInspectorDialog.tsx` y `UsuarioAcciones.tsx`; patrón de página de `app/panel/usuarios/page.tsx`; el servicio de escritura sigue la estructura de `usuario-gestion.service.ts`.
- Nuevo (y por qué): `auditoria-configuracion.service.ts` (la auditoría de `usuarios` está atada a esa entidad); `HistorialCambios` (no existe un componente de historial reutilizable); `feriado-gestion.service.ts`, `feriado.actions.ts`, `FeriadosView`, diálogos y las dos páginas (no existe la funcionalidad).
- Dependencias / componentes shadcn a instalar antes de implementar: ninguno.

## Specs afectadas
- `docs/specs/layouts-por-rol.md`: `/panel/configuracion` deja de mostrar «Próximamente» (la ruta estática tiene prioridad sobre `app/panel/[section]/page.tsx`). No se modifica `[section]/page.tsx` ni su test (la rama `configuracion` queda inalcanzable pero inofensiva y su test sigue pasando).
- Reglas de negocio §11 («Gestionar catálogo de observaciones y feriados»): se actualiza al cerrar la spec 6.

## Decisiones
- **Rutas:** `/panel/configuracion` (hub), `/panel/configuracion/feriados`. Las specs 4 y 6 agregan `/catalogo` y `/tasas`.
- **Feriado:** `fecha` válida (calendario real, año 2020-2100, formato `YYYY-MM-DD` validado con `parseFechaLima`) y `nombre` de 3 a 80 caracteres sin espacios sobrantes. Se permite cualquier día de la semana. Una fecha repetida se rechaza con «Ya existe un feriado en esa fecha.».
- **Acciones:** crear, renombrar y eliminar. Eliminar siempre con `AlertDialog`; crear y renombrar se confirman con su propio botón del diálogo del formulario (no necesitan segunda confirmación). Un feriado pasado se puede eliminar; el aviso del diálogo indica que cambia el conteo de días hábiles de los plazos en curso.
- **Auditoría:** `referencia` = fecha `YYYY-MM-DD`; `valor_anterior`/`valor_nuevo` = nombre. CREAR (anterior `null`), EDITAR, ELIMINAR (nuevo `null`).
- **Orden y agrupación:** ascendente por fecha, agrupados por año con un encabezado por año.
- **Historial en pantalla:** últimos 20 cambios de la entidad con persona (nombre completo), fecha y hora de Lima y descripción en español.

## Criterios de aceptación
- AC-1 (autorización en página): las dos páginas llaman `requireRole("superadmin")` antes de leer datos; con `admin`, `cliente`, inactivo o sin sesión `requireRole` redirige y no se invoca ningún servicio. Tests de página.
- AC-2 (autorización en acción): `crearFeriadoAction`, `editarFeriadoAction` y `eliminarFeriadoAction` llaman `requireRole("superadmin")` primero; si lanza, no se llama al servicio. Tests de acción.
- AC-3 (autorización en servicio): `crearFeriado`, `editarFeriado`, `eliminarFeriado`, `listFeriados` y `listAuditoria` lanzan «No autorizado» si el actor no es `superadmin` y no tocan la BD. Tests de servicio.
- AC-4 (validación): `feriadoSchema` rechaza fecha inexistente (`2026-02-30`), con otro formato o fuera de 2020-2100, y nombre vacío, de menos de 3 o más de 80 caracteres; recorta espacios. La acción devuelve `fieldErrors` por campo y no llama al servicio. Tests del schema y de la acción.
- AC-5 (reglas): crear con fecha existente devuelve «Ya existe un feriado en esa fecha.» sin escribir; editar o eliminar una fecha inexistente devuelve «No se encontró el feriado.»; renombrar con el mismo nombre devuelve «No hay cambios que guardar.» y no audita. Tests de servicio.
- AC-6 (auditoría atómica): cada cambio efectivo ejecuta un único `db.batch` con el cambio y la fila de `configuracion_auditoria` (`entidad` `FERIADO`, acción correcta, `referencia`, valores anterior/nuevo, `actor_id` = actor). Si el lote falla, el resultado es `{ ok: false }` y no queda ninguna de las dos escrituras. Nunca se guarda correo, documento ni identificadores de Clerk. Tests de servicio.
- AC-7 (consistencia con plazos): tras crear un feriado, `getFeriados()` lo incluye en la petición siguiente y `calcularLimiteSubsanacion` lo salta; tras eliminarlo, deja de saltarlo. Test de integración de servicio con la BD simulada y comprobación de que la acción revalida `/panel/configuracion/feriados`.
- AC-8 (hub): `/panel/configuracion` muestra una tarjeta por sección configurable (hoy solo «Feriados», con enlace) y un bloque informativo «Reglas fijas por norma» con vigencia del certificado (2 años, Ley 30619), plazos de subsanación (3 días hábiles en ITSE posterior y 20 en previa, DS 002-2018-PCM) y aviso de renovación (60 días antes), leyendo `VIGENCIA_ANIOS`, `plazoSubsanacionDias` y `DIAS_ALERTA_VENCIMIENTO`, sin controles de edición. Test de vista.
- AC-9 (UI feriados): lista agrupada por año; tabla en ≥768 px y tarjetas en <768 px; botón principal azul «Agregar feriado» de al menos 44 px de alto; diálogo con `Label` por campo, `input type="date"` nativo, errores por campo con `aria-describedby` y error general en `role="alert"`; el diálogo no se cierra si hay error. Eliminar abre `AlertDialog` con «Cancelar» y botón destructivo que muestra «Eliminando…». Estado vacío con `EmptyState`. Operable con teclado. Sin desborde a 360/768/1280 px (revisión manual).
- AC-10 (historial): cada cambio exitoso aparece al recargar en «Historial de cambios» con persona, fecha/hora de Lima («dd/MM/yyyy HH:mm») y texto como «Agregó el feriado “Navidad” (25/12/2026)», «Cambió el nombre de 25/12/2026: “A” → “B”», «Eliminó el feriado “Navidad” (25/12/2026)». Test de la utilidad de texto (incluye `OBSERVACION` y `TASA` para las specs siguientes). El historial vacío muestra «Aún no hay cambios.».
- AC-11: textos en español sin términos técnicos; solo tokens del tema; `npm run build`, `npm run lint` y `npx vitest run` pasan.

## Tareas
### T1 — Schema de entrada y servicio de auditoría
- Archivos: `modules/configuracion/schemas/feriado.schema.ts` (crear), `modules/configuracion/schemas/feriado.schema.test.ts` (crear), `modules/configuracion/services/auditoria-configuracion.service.ts` (crear), `modules/configuracion/services/auditoria-configuracion.service.test.ts` (crear)
- Depende de: ninguna (spec 1 implementada)
- Grupo paralelo: G1
- Cubre: AC-3 (`listAuditoria`), AC-4, AC-6 (helper)
- Detalle: `feriadoSchema` (zod v4: `fecha`, `nombre`) y `feriadoNombreSchema`. El servicio exporta `auditoriaFila({ actorId, entidad, accion, referencia, valorAnterior, valorNuevo })`, que devuelve la sentencia `insert` lista para `db.batch`, y `listAuditoria(actor, entidad, limite = 20)` (solo superadmin; une `usuarios` para el nombre completo; orden descendente por `created_at`), con tipo `AuditoriaConfigItem { id, accion, referencia, valorAnterior, valorNuevo, actorNombre, createdAt }`.
- Tests: schema válido/ inválido (casos de AC-4); `listAuditoria` rechaza no superadmin, respeta límite y orden; `auditoriaFila` arma los campos.
- [x] Completada

### T2 — Servicio de gestión de feriados
- Archivos: `modules/configuracion/services/feriado-gestion.service.ts` (crear), `modules/configuracion/services/feriado-gestion.service.test.ts` (crear)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-3, AC-5, AC-6, AC-7
- Detalle: `listFeriados(actor)` (con nombre, ordenado), `crearFeriado(actor, input)`, `editarFeriado(actor, fecha, nombre)`, `eliminarFeriado(actor, fecha)`; resultado `{ ok: true; data } | { ok: false; error: string }` (los casos esperados no lanzan; solo la autorización lanza). Lee el valor anterior, arma el cambio y la fila de auditoría y los ejecuta en un `db.batch`. Clave duplicada (`23505`) se trata como «Ya existe…».
- Tests: BD simulada; AC-3, AC-5, AC-6 (el lote contiene cambio y auditoría; fallo del lote → error), AC-7.
- [x] Completada

### T3 — Server Actions
- Archivos: `modules/configuracion/actions/feriado.actions.ts` (crear), `modules/configuracion/actions/feriado.actions.test.ts` (crear)
- Depende de: T2
- Grupo paralelo: G3
- Cubre: AC-2, AC-4, AC-7 (revalidación)
- Detalle: `"use server"`; `crearFeriadoAction(formData)`, `editarFeriadoAction(fecha, formData)`, `eliminarFeriadoAction(fecha)` → `ActionResult`. Orden: `requireRole("superadmin")` → zod → servicio → `revalidatePath("/panel/configuracion/feriados")` → resultado. Excepción inesperada → «No se pudo guardar el cambio. Inténtalo de nuevo.».
- Tests: `requireRole` mockeado (rechaza → sin servicio); validación inválida sin servicio y con `fieldErrors`; éxito revalida; error del servicio se propaga sin revalidar.
- [x] Completada

### T4 — Historial de cambios
- Archivos: `modules/configuracion/utils/auditoria-texto.ts` (crear), `modules/configuracion/utils/auditoria-texto.test.ts` (crear), `modules/configuracion/components/HistorialCambios.tsx` (crear)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-10
- Detalle: `describirCambioConfig(entidad, item)` devuelve el texto en español para las tres entidades (`FERIADO`; `OBSERVACION`: «Agregó/Cambió/Desactivó/Reactivó la observación “…”»; `TASA`: «Cambió la tasa de ITSE posterior: S/ 150.00 → S/ 160.00», con céntimos formateados). `HistorialCambios({ items })` es un componente de servidor presentacional dentro de un `Card` con lista, persona, fecha/hora de Lima y texto; estado vacío «Aún no hay cambios.».
- Tests: utilidad con todos los casos; el componente es presentacional (sin test).
- [x] Completada

### T5 — Vista y diálogos de feriados
- Archivos: `modules/configuracion/components/FeriadosView.tsx` (crear), `modules/configuracion/components/FeriadoFormDialog.tsx` (crear), `modules/configuracion/components/EliminarFeriadoDialog.tsx` (crear), `modules/configuracion/components/FeriadosView.test.tsx` (crear)
- Depende de: T3, T4
- Grupo paralelo: G4
- Cubre: AC-9, AC-10, AC-11
- Detalle: `FeriadosView({ feriados, historial })` agrupa por año y monta `HistorialCambios`. `FeriadoFormDialog` (`"use client"`, modo crear/renombrar; en renombrar la fecha va de solo lectura) y `EliminarFeriadoDialog` usan `useTransition` y las acciones de T3.
- Tests: `FeriadosView.test.tsx` con acciones mockeadas: agrupa por año; eliminar exige confirmar antes de llamar a la acción; el error aparece en `role="alert"` y el diálogo sigue abierto; estado vacío.
- [x] Completada

### T6 — Hub y páginas
- Archivos: `modules/configuracion/components/ConfiguracionView.tsx` (crear), `app/panel/configuracion/page.tsx` (crear), `app/panel/configuracion/page.test.tsx` (crear), `app/panel/configuracion/feriados/page.tsx` (crear), `app/panel/configuracion/feriados/page.test.tsx` (crear)
- Depende de: T5
- Grupo paralelo: G5
- Cubre: AC-1, AC-8, AC-11
- Detalle: `ConfiguracionView` tiene el arreglo de secciones (título, descripción, `href`, icono de `lucide-react`) y el bloque «Reglas fijas por norma». Las páginas son de servidor: `requireRole("superadmin")`, leen con `listFeriados` y `listAuditoria(actor, "FERIADO")`, `metadata` con título.
- Tests: ambas páginas — `requireRole` con `"superadmin"` y rechazo corta antes de leer; el hub muestra las reglas fijas con los valores de las constantes.
- [x] Completada

## Grupos paralelos
G1: T1. G2: T2 y T4 (archivos disjuntos). G3: T3. G4: T5. G5: T6.

## Fases siguientes
- Fase 3: `configuracion-catalogo-datos`. Fase 4: `configuracion-catalogo-gestion`. Fase 5: `configuracion-tasa-pago`. Fase 6: `configuracion-tasa-gestion` (cierra con la actualización documental).
