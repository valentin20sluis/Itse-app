# Configuración 4/6: gestión del catálogo de observaciones

Estado: approved

## Objetivo
El superadmin, en `/panel/configuracion/catalogo`, agrega, edita la descripción y desactiva o reactiva observaciones no relevantes del catálogo, con confirmación al desactivar y auditoría de cada cambio. Depende de `configuracion-catalogo-datos` y de `configuracion-feriados-gestion` (auditoría, historial, hub). Comparte las «Decisiones de diseño» de `docs/specs/configuracion-feriados-datos.md`.

## Decisiones
- **Alta:** el usuario escribe solo la descripción (10 a 200 caracteres, recortada). El sistema genera `codigo` (mayúsculas, sin tildes, palabras unidas por `_`, máximo 60 caracteres; si ya existe se agrega `_2`, `_3`…). El código nunca se muestra ni se edita.
- **Duplicados:** se rechaza una descripción igual (sin distinguir mayúsculas, tildes ni espacios sobrantes) a otra existente, activa o no: «Ya existe una observación con esa descripción.».
- **Editar:** solo la descripción. Las ya registradas en expedientes conservan la anterior (histórico copiado).
- **Desactivar:** con `AlertDialog` que explica «Dejará de ofrecerse en nuevas diligencias. Los expedientes que ya la tienen no cambian.». Reactivar sin confirmación (reversible, sin riesgo).
- **Sin borrar:** no existe eliminar.
- **Aviso:** si no queda ninguna activa, la vista muestra «Sin observaciones activas, en ITSE posterior toda observación se considerará relevante.».
- **Auditoría:** `entidad` `OBSERVACION`, `referencia` = `codigo`, `valor_anterior`/`valor_nuevo` = descripción; acciones CREAR, EDITAR, ACTIVAR, DESACTIVAR (en estas dos, los valores van como descripción anterior y nueva iguales).

## Fuera de alcance
- Eliminar, reordenar, categorizar o importar observaciones; editar el código; copiar la lista del Anexo 9 (la carga la hace el superadmin).
- Cambios en el flujo de la diligencia (spec 3).

## Reutilización
- Existente que se reutiliza: `getCatalogoActivo`, tabla y tipos (spec 3); `auditoriaFila`, `listAuditoria`, `HistorialCambios`, `describirCambioConfig` y `ConfiguracionView` (spec 2); `requireRole`, `ActionResult`, `AlertDialog`, `Dialog`, `Textarea`, `Label`, `Table`, `Card`, `Badge`, `EmptyState`; patrón de `FeriadosView` y sus diálogos.
- Existente que se extiende: `catalogo-lectura.service.ts` (agrega `listCatalogoCompleto(actor)`); `ConfiguracionView.tsx` (nueva tarjeta de sección).
- Nuevo (y por qué): schema, utilidad de código, servicio de escritura, acciones, vista y diálogos del catálogo (no existen).
- Dependencias / componentes shadcn a instalar antes de implementar: ninguno (`textarea` ya está en `components/ui/`).

## Specs afectadas
- `docs/specs/configuracion-feriados-gestion.md`: `ConfiguracionView` suma una tarjeta; su test debe seguir pasando.

## Criterios de aceptación
- AC-1 (autorización): página, `crearObservacionAction`, `editarObservacionAction` y `setObservacionActivaAction` llaman `requireRole("superadmin")` primero; los servicios (`crearObservacion`, `editarObservacion`, `setObservacionActiva`, `listCatalogoCompleto`) lanzan «No autorizado» si el actor no es `superadmin` y no tocan la BD. Tests de página, acción y servicio.
- AC-2 (validación): `observacionSchema` rechaza descripción vacía, de menos de 10 o más de 200 caracteres; recorta espacios; `id` de las acciones debe ser `z.uuid()` (si no, «No se encontró la observación.»); `activa` debe ser booleano. Tests del schema y de la acción (sin llamar al servicio si es inválido).
- AC-3 (código): `generarCodigo("Retirar cajas de la salida")` → `RETIRAR_CAJAS_DE_LA_SALIDA`; elimina tildes y símbolos; recorta a 60; con códigos existentes agrega sufijo `_2`, `_3`. Test de la utilidad.
- AC-4 (reglas): descripción duplicada (sin distinguir mayúsculas/tildes) → «Ya existe una observación con esa descripción.»; editar o cambiar el estado de un `id` inexistente → «No se encontró la observación.»; sin cambios (misma descripción o mismo estado) → «No hay cambios que guardar.» sin auditar. Tests de servicio.
- AC-5 (auditoría atómica): cada cambio efectivo ejecuta un único `db.batch` con el cambio y la fila de `configuracion_auditoria` (`OBSERVACION`, acción correcta, `referencia` = código, valores, `actor_id`); si el lote falla, no queda ninguna de las dos escrituras y el resultado es `{ ok: false }`. Tests.
- AC-6 (consistencia con la diligencia): una observación creada aparece en `getCatalogoActivo()` y es aceptada por `evaluarObservaciones`; una desactivada deja de aparecer y se rechaza; una reactivada vuelve. Los registros de `observaciones_diligencia` no se tocan (el servicio no emite `UPDATE` sobre esa tabla). Tests de servicio y revisión del reviewer.
- AC-7 (UI): lista con descripción, estado (`Badge` «Activa»/«Desactivada») y acciones «Editar» y «Desactivar»/«Reactivar»; tabla en ≥768 px y tarjetas en <768 px; botón principal azul «Agregar observación» de al menos 44 px de alto; formularios con `Label`, error por campo con `aria-describedby` y error general en `role="alert"`, el diálogo no se cierra con error; desactivar usa `AlertDialog` con «Cancelar» y botón que muestra «Desactivando…»; aviso de AC (sin activas); operable con teclado; sin desborde a 360/768/1280 px (revisión manual).
- AC-8 (historial y hub): los cambios aparecen en «Historial de cambios» de la página; el hub muestra la tarjeta «Catálogo de observaciones» con enlace.
- AC-9: textos en español sin términos técnicos (no se muestra el código); solo tokens del tema; `npm run build`, `npm run lint` y `npx vitest run` pasan.

## Tareas
### T1 — Schema y generación de código
- Archivos: `modules/configuracion/schemas/observacion.schema.ts` (crear), `modules/configuracion/schemas/observacion.schema.test.ts` (crear), `modules/configuracion/utils/generar-codigo.ts` (crear), `modules/configuracion/utils/generar-codigo.test.ts` (crear)
- Depende de: ninguna (specs 2 y 3 implementadas)
- Grupo paralelo: G1
- Cubre: AC-2, AC-3
- Tests: casos de AC-2 y AC-3.
- [x] Completada

### T2 — Servicio de gestión del catálogo
- Archivos: `modules/configuracion/services/catalogo-gestion.service.ts` (crear), `modules/configuracion/services/catalogo-gestion.service.test.ts` (crear), `modules/configuracion/services/catalogo-lectura.service.ts` (modificar), `modules/configuracion/services/catalogo-lectura.service.test.ts` (modificar)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-1 (servicio), AC-4, AC-5, AC-6
- Detalle: `listCatalogoCompleto(actor)` (activas y desactivadas); `crearObservacion(actor, descripcion)`, `editarObservacion(actor, id, descripcion)`, `setObservacionActiva(actor, id, activa)`; resultado `{ ok; data } | { ok: false; error }`. Comparación de duplicados normalizada (minúsculas, sin tildes, espacios colapsados). Choque de `codigo` único (`23505`) reintenta con el siguiente sufijo hasta 5 veces.
- Tests: BD simulada con los casos de AC-1, AC-4, AC-5 y AC-6.
- [x] Completada

### T3 — Server Actions
- Archivos: `modules/configuracion/actions/catalogo.actions.ts` (crear), `modules/configuracion/actions/catalogo.actions.test.ts` (crear)
- Depende de: T2
- Grupo paralelo: G3
- Cubre: AC-1 (acción), AC-2
- Detalle: `"use server"`; `crearObservacionAction(formData)`, `editarObservacionAction(id, formData)`, `setObservacionActivaAction(id, activa)`. Orden: `requireRole("superadmin")` → zod → servicio → `revalidatePath("/panel/configuracion/catalogo")`. Excepción inesperada → «No se pudo guardar el cambio. Inténtalo de nuevo.».
- Tests: rechazo de rol, validación, éxito con revalidación, error propagado sin revalidar.
- [x] Completada

### T4 — Vista y diálogos del catálogo
- Archivos: `modules/configuracion/components/CatalogoView.tsx` (crear), `modules/configuracion/components/ObservacionFormDialog.tsx` (crear), `modules/configuracion/components/ToggleObservacionDialog.tsx` (crear), `modules/configuracion/components/CatalogoView.test.tsx` (crear)
- Depende de: T3
- Grupo paralelo: G4
- Cubre: AC-7, AC-9
- Detalle: `CatalogoView({ items, historial })` monta `HistorialCambios`; `ObservacionFormDialog` sirve para crear y editar; `ToggleObservacionDialog` confirma solo al desactivar.
- Tests: acciones mockeadas — desactivar exige confirmar; reactivar llama directo; error en `role="alert"` con el diálogo abierto; aviso sin activas; estado vacío.
- [x] Completada

### T5 — Página y tarjeta en el hub
- Archivos: `app/panel/configuracion/catalogo/page.tsx` (crear), `app/panel/configuracion/catalogo/page.test.tsx` (crear), `modules/configuracion/components/ConfiguracionView.tsx` (modificar)
- Depende de: T4
- Grupo paralelo: G5
- Cubre: AC-1 (página), AC-8
- Detalle: página de servidor: `requireRole("superadmin")`, `listCatalogoCompleto`, `listAuditoria(actor, "OBSERVACION")`. El hub agrega la sección «Catálogo de observaciones».
- Tests: página — rol `superadmin`, rechazo corta antes de leer.
- [x] Completada

## Grupos paralelos
G1: T1. G2: T2. G3: T3. G4: T4. G5: T5.

## Fases siguientes
- Fases 5 y 6: tasa (`configuracion-tasa-pago`, `configuracion-tasa-gestion`).
