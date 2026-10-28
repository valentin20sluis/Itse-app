# Designación de inspectores

Estado: approved

Parte 2 de 4 de `inspeccion`. **Depende de `inspectores`** (tabla `inspectores`, módulo `modules/inspecciones/`) y de `aprobacion-jefatura` (implementada). Habilita `diligencia-inspeccion`.

## Objetivo
Cuando Jefatura aprobó el expediente (`APROBADO_JEFATURA`), el `admin` o el `superadmin` designan desde el detalle los inspectores que corresponden al nivel de riesgo (1, 1, 2 o 3) y el expediente pasa a `INSPECTOR_DESIGNADO` con registro en el historial. El cliente ve que ya hay inspectores designados, sin nombres ni datos personales.

## Fuera de alcance
- Programar o registrar la diligencia (`diligencia-inspeccion`); PDF de la constancia (`constancia-designacion`).
- Reasignar o quitar inspectores ya designados: la designación es definitiva en esta etapa (límite aceptado; si un inspector deja de estar disponible, el flujo de reemplazo es una spec posterior). El formulario lo avisa.
- Mostrar al cliente nombre, documento, teléfono o correo del inspector.
- Notificaciones.

## Decisiones (a confirmar al aprobar)
1. **Transición nueva:** `APROBADO_JEFATURA → INSPECTOR_DESIGNADO` (admin y superadmin), tal como deja dicho `aprobacion-jefatura`. No es una transición «genérica»: exige inspectores, así que **no se alcanza con `cambiarEstado`** ni con un botón de `AccionesExpediente`, solo con el servicio de designación (decisión 2).
2. **Atomicidad:** se generaliza `aplicar` de `transicion.service.ts` con un parámetro `extras` (sentencias adicionales del mismo `db.batch`). La designación hace en **un solo `db.batch`**: UPDATE condicionado (estado de partida **y** que los inspectores elegidos sigan activos/habilitados: conteo igual a la cantidad requerida, vía el parámetro `guardas` ya existente), INSERT del historial y INSERT de las filas de `designaciones` (`INSERT … SELECT … WHERE EXISTS` sobre el UPDATE ganador, el mismo patrón que el historial). Si algo cambió entre la lectura y la escritura, devuelve `conflicto` y no queda nada a medias.
3. **Cantidad exacta:** `inspectoresRequeridos(riesgo)` (`BAJO 1, MEDIO 1, ALTO 2, MUY_ALTO 3`, `reglas-negocio` sección 2). Se exige exactamente esa cantidad, sin repetidos. Solo valen inspectores con `activo = true`, en cualquier nivel de riesgo. **Restricción pospuesta:** por decisión del usuario, por ahora NO se exige `habilitadoPrevia` en ITSE previa (ALTO/MUY_ALTO); la columna y su casilla en el CRUD de inspectores quedan sin efecto en la designación. Después se verá.
4. **Visibilidad:** el comentario del historial es `Inspectores designados: N.` (sin nombres, porque lo ve el cliente). Los nombres solo los ve el personal, en el panel.
5. Un expediente con `nivelRiesgo` nulo no se puede designar (`no_permitido`).

## Reutilización
- Existente que se reutiliza: `tipoItsePorRiesgo` (`modules/expedientes/utils/riesgo.ts`); `RIESGO_LABELS`; `ESTADO_LABELS`/`EstadoBadge`; `HistorialTimeline` (sin cambios: ya oculta `actorNombre` al cliente; las filas nuevas salen con `ESTADO_LABELS.INSPECTOR_DESIGNADO`); `listInspectores`/tabla `inspectores` de la spec `inspectores`; `requireRole`; `ActionResult`; `Card`, `Button`, `Label`, `Badge`.
- Existente que se extiende: `modules/expedientes/utils/riesgo.ts` (+`inspectoresRequeridos`); `modules/expedientes/utils/transiciones.ts` (flujo, `DESTINOS_CON_FLUJO_PROPIO`, `transicionesGenericas`); `modules/expedientes/services/transicion.service.ts` (`aplicar` exportada con `extras`; `cambiarEstado` rechaza los destinos con flujo propio); `modules/expedientes/components/AccionesExpediente.tsx` (usa `transicionesGenericas` y acepta `children`); `modules/expedientes/components/ExpedienteDetalleCliente.tsx`; `app/panel/expedientes/[id]/page.tsx`; `app/mi-cuenta/expedientes/[id]/page.tsx`; `db/schema.ts`.
- Nuevo (y por qué): `designaciones` (relación expediente-inspector, no existe); `designacion.service.ts` y componentes de `modules/inspecciones/` (dominio nuevo).
- Dependencias / componentes shadcn a instalar: **ninguno** (casillas nativas). Preparación del humano: `npm run db:migrate` tras T1.

## Specs afectadas
- `aprobacion-jefatura`: AC-2 y AC-7 cambian: `APROBADO_JEFATURA` deja de ser «sin salidas» (admin: `["INSPECTOR_DESIGNADO"]`; superadmin: `["INSPECTOR_DESIGNADO", "ANULADO"]`); el texto «Esperando designación de inspector.» desaparece de `AccionesExpediente` (lo reemplaza el panel de designación). La matriz 18 × 18 de `transiciones.test.ts` se actualiza (T2).
- `bandeja-estados`: AC-1 (matriz) y AC-10 (acciones solo de `transicionesPermitidas`): ahora son `transicionesGenericas`.
- `docs/reglas-negocio-itse.md` sección 6.1: sin cambios (ya lista `APROBADO_JEFATURA → INSPECTOR_DESIGNADO`).

## Criterios de aceptación
- AC-1 (esquema): `designaciones` (`id`, `expedienteId` y `inspectorId` con `onDelete: restrict`, `createdAt`), índice único `(expediente_id, inspector_id)` e índice por `expediente_id`; migración nueva que solo crea esa tabla; tipo `Designacion` exportado.
- AC-2 (reglas puras): `inspectoresRequeridos` devuelve 1, 1, 2, 3 para BAJO, MEDIO, ALTO, MUY_ALTO. `transicionesPermitidas("APROBADO_JEFATURA", "admin")` es `["INSPECTOR_DESIGNADO"]` y para `superadmin` contiene `INSPECTOR_DESIGNADO` y `ANULADO`; `INSPECTOR_DESIGNADO` solo ofrece `ANULADO` (superadmin) en esta spec; `cliente` siempre `[]`. `DESTINOS_CON_FLUJO_PROPIO` es `["INSPECTOR_DESIGNADO"]` y `transicionesGenericas` es `transicionesPermitidas` sin esos destinos. El test recorre la matriz 18 × 18 y falla si algún par no listado es permitido. `requiereMotivo("INSPECTOR_DESIGNADO")` es falso.
- AC-3 (no hay atajo): `cambiarEstado(actor, id, { hasta: "INSPECTOR_DESIGNADO" })` sobre un expediente en `APROBADO_JEFATURA` devuelve `no_permitido` sin invocar `db.batch`; `cambioEstadoSchema` sigue sin aceptar `INSPECTOR_DESIGNADO` como `hasta`.
- AC-4 (`aplicar` generalizada): `aplicar` se exporta y acepta `extras` (función `(ganoUpdate) => sentencias`, para que los INSERT dependan del UPDATE ganador; las sentencias viajan en el mismo `db.batch`, después del UPDATE y del INSERT de historial). Sin `extras` su comportamiento es idéntico al actual (los tests existentes de `transicion.service.test.ts` pasan sin cambios) y un test nuevo verifica que con `extras` todas las sentencias van en **una sola** llamada a `db.batch`. El tipo de `cambios` pasa a `Partial<typeof expedientes.$inferInsert>` (sin `any`).
- AC-5 (designar, servicio): `designarInspectores(actor, expedienteId, inspectorIds)` lanza `Error("No autorizado")` para `cliente`. Orden de resultados: `no_encontrado` (inexistente o `numero` nulo) → `no_permitido` (estado distinto de `APROBADO_JEFATURA`, `nivelRiesgo` nulo, o rol sin permiso según `puedeTransicionar`) → `cantidad_invalida` (cantidad distinta de `inspectoresRequeridos(riesgo)` o ids repetidos) → `inspector_invalido` (alguno no existe, está inactivo) → `conflicto` (el UPDATE afectó 0 filas, incluido el caso de un inspector desactivado entre la lectura y la escritura) → `ok`. En `ok` hay exactamente **un** `db.batch` con el UPDATE a `INSPECTOR_DESIGNADO`, el historial (`estado_anterior`, `estado_nuevo`, `usuario_id` del actor, comentario `Inspectores designados: N.`) y las N filas de `designaciones`; en cualquier otro resultado no se invoca `db.batch`, salvo `conflicto`, que lo invoca sin dejar filas (el INSERT depende del UPDATE ganador). Un test verifica cada resultado y que el comentario del historial no contiene nombres.
- AC-6 (lecturas): `listInspectoresElegibles(actor)` lanza `Error("No autorizado")` para `cliente` y devuelve los inspectores activos (sin filtrar por `habilitadoPrevia`) con `id`, `nombre` («Apellidos, Nombres») y `documento`. `getResumenInspeccion(actor, expedienteId)` devuelve `{ total, inspectores? }`: para admin/superadmin incluye `inspectores` (`nombre`, `documento`, `telefono`); para `cliente` **solo `total`** (sin la propiedad `inspectores`) y únicamente si el expediente es suyo (si no, `total: 0`, mismo resultado que sin designaciones).
- AC-7 (acción): `designarInspectoresAction(expedienteId, prev, formData)`: `requireRole("admin", "superadmin")` primero; id uuid (si no, «No se encontró el expediente.» sin tocar la BD); `designacionSchema` (`inspectorIds`: 1 a 3 uuid; se lee con `formData.getAll("inspectorIds")`); servicio con el usuario de `requireRole`; mensajes: `no_encontrado` «No se encontró el expediente.», `no_permitido` «Esa acción no está disponible para este expediente.», `cantidad_invalida` «Elige la cantidad exacta de inspectores que pide el nivel de riesgo.», `inspector_invalido` «Alguno de los inspectores ya no está disponible. Actualiza la página.», `conflicto` «Los datos cambiaron. Actualiza la página e inténtalo de nuevo.», error inesperado «No se pudo guardar el cambio. Inténtalo de nuevo.». Solo en éxito revalida `/panel/expedientes`, `/panel/expedientes/<id>`, `/mi-cuenta/expedientes` y `/mi-cuenta/expedientes/<id>`.
- AC-8 (panel del personal): en `APROBADO_JEFATURA` el detalle muestra, dentro de «Acciones» (admin y superadmin), el formulario «Designar inspectores»: `<fieldset>` con `<legend>` «Inspectores (elige N)» y una casilla con `<label>` por candidato (nombre y documento), contador `aria-live="polite"` «Elegidos: x de N», aviso «La designación no se podrá cambiar en esta etapa.», botón «Designar» (`h-11`) deshabilitado hasta que x = N, y errores en `role="alert"`. Si hay menos candidatos que N: mensaje «No hay suficientes inspectores activos para este nivel de riesgo.» con enlace a `/panel/inspectores` y sin botón. En los estados posteriores (cualquiera con `total > 0`) se muestra el resumen con los nombres de los inspectores. `AccionesExpediente` muestra botones solo de `transicionesGenericas` y ya no muestra «Esperando designación de inspector.»; si hay `children` no muestra el texto «No hay acciones disponibles en este estado.».
- AC-9 (vista del cliente): en `/mi-cuenta/expedientes/[id]`, si `total > 0` aparece la sección «Inspección» con «Inspectores designados: N» y ningún nombre ni dato personal; el historial muestra «Inspector designado» con el comentario `Inspectores designados: N.` y sin `actorNombre`. El cliente no tiene ningún formulario ni acción de escritura en esta pantalla.
- AC-10 (aislamiento): `/panel/expedientes/[id]` sigue exigiendo `requireRole("admin", "superadmin")` antes de leer; `designarInspectoresAction` y los servicios rechazan a `cliente` aunque se invoquen directamente; un admin no puede designar con un expediente en otro estado (tests de AC-5).
- AC-11 (responsive y accesibilidad): sin desborde horizontal a 360, 768 y 1280 px (casillas en una columna en móvil, `grid sm:grid-cols-2` desde `sm`; textos con `break-words`); cada casilla y botón con área táctil mínima `h-11`/`min-h-11` y foco visible; el estado y el contador nunca dependen solo del color; solo tokens del tema; sin `any`/`@ts-ignore`.
- AC-12: `npm run build`, `npm run lint` y `npx vitest run` pasan.

## Tareas
### T1 — Tabla `designaciones` y migración
- Archivos: `db/schema.ts` (modificar), `drizzle/0013_*.sql` (crear, generado), `drizzle/meta/0013_snapshot.json` (crear, generado), `drizzle/meta/_journal.json` (modificar, generado)
- Depende de: `inspectores` T1 (la tabla `inspectores` ya migrada)
- Grupo paralelo: G1
- Cubre: AC-1
- Detalle: `DATABASE_URL="postgres://u:p@localhost/db" npm run db:generate`; usar el siguiente número libre si cambió.
- Tests: no aplica (esquema generado).
- [x] Completada

### T2 — Reglas puras y máquina de estados
- Archivos: `modules/expedientes/utils/riesgo.ts` (modificar), `modules/expedientes/utils/riesgo.test.ts` (modificar), `modules/expedientes/utils/transiciones.ts` (modificar), `modules/expedientes/utils/transiciones.test.ts` (modificar)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-2
- Detalle: `FLUJO.APROBADO_JEFATURA = ["INSPECTOR_DESIGNADO"]`; exportar `DESTINOS_CON_FLUJO_PROPIO` y `transicionesGenericas(estado, rol)`; `inspectoresRequeridos` junto a `tipoItsePorRiesgo`.
- Tests: `riesgo.test.ts` (los 4 niveles); `transiciones.test.ts` (matriz 18 × 18 actualizada, rol por rol, `transicionesGenericas`, `requiereMotivo`).
- [x] Completada

### T3 — Servicio de designación y `aplicar` con `extras`
- Archivos: `modules/expedientes/services/transicion.service.ts` (modificar), `modules/expedientes/services/transicion.service.test.ts` (modificar), `modules/inspecciones/services/designacion.service.ts` (crear), `modules/inspecciones/services/designacion.service.test.ts` (crear)
- Depende de: T1, T2
- Grupo paralelo: G2
- Cubre: AC-3, AC-4, AC-5, AC-6
- Detalle: `designacion.service.ts` contiene `designarInspectores`, `listInspectoresElegibles` y `getResumenInspeccion`; `cambiarEstado` rechaza `hasta ∈ DESTINOS_CON_FLUJO_PROPIO` con `no_permitido` antes de leer motivo.
- Tests: casos de AC-3 a AC-6 con `db` mockeado (cada resultado, un solo `db.batch`, sin nombres en el comentario, cliente sin `inspectores`).
- [x] Completada

### T4 — Schema y acción de designación
- Archivos: `modules/inspecciones/schemas/designacion.schema.ts` (crear), `modules/inspecciones/schemas/designacion.schema.test.ts` (crear), `modules/inspecciones/actions/designacion.actions.ts` (crear), `modules/inspecciones/actions/designacion.actions.test.ts` (crear)
- Depende de: T3
- Grupo paralelo: G3
- Cubre: AC-7, AC-10 (acción)
- Tests: schema (0, 1, 3, 4 ids; no uuid; repetidos); acción (orden de verificaciones, usuario de `requireRole` al servicio, cada mensaje, `revalidatePath` solo en éxito).
- [x] Completada

### T5 — Vista del cliente
- Archivos: `modules/inspecciones/components/InspeccionResumen.tsx` (crear), `modules/expedientes/components/ExpedienteDetalleCliente.tsx` (modificar), `app/mi-cuenta/expedientes/[id]/page.tsx` (modificar), `app/mi-cuenta/expedientes/[id]/page.test.tsx` (modificar)
- Depende de: T3
- Grupo paralelo: G3
- Cubre: AC-9, AC-11 (cliente)
- Detalle: `InspeccionResumen` recibe `{ total, inspectores? }` y muestra los nombres solo si vienen; el detalle del cliente le pasa el resumen que obtiene la página con `getResumenInspeccion(usuario, id)` (solo si `total > 0` se renderiza la sección).
- Tests: `page.test.tsx` — llama `getResumenInspeccion` con el usuario cliente tras validar el detalle y no lo llama si el detalle es `null`. El componente es presentacional (SETUP.md 3.2).
- [x] Completada

### T6 — Panel de designación del personal
- Archivos: `modules/inspecciones/components/DesignarInspectoresForm.tsx` (crear), `modules/inspecciones/components/PanelInspeccion.tsx` (crear), `modules/expedientes/components/AccionesExpediente.tsx` (modificar), `app/panel/expedientes/[id]/page.tsx` (modificar), `app/panel/expedientes/[id]/page.test.tsx` (modificar)
- Depende de: T4, T5
- Grupo paralelo: G4
- Cubre: AC-8, AC-10 (página), AC-11 (personal)
- Detalle: `PanelInspeccion` (Server Component, recibe `usuario`, `expediente` y `establecimiento`) decide: formulario en `APROBADO_JEFATURA`, resumen si hay designaciones, nada en los demás casos; la página lo pasa como `children` de `AccionesExpediente`, que además usa `transicionesGenericas`, quita `APROBADO_JEFATURA` de `SIN_ACCIONES` y oculta el texto genérico si hay `children`. `PanelInspeccion` recibe el `expediente` y el `establecimiento` completos (la dirección es el lugar de la diligencia) para que `diligencia-inspeccion` no vuelva a tocar la página.
- Tests: `page.test.tsx` — se mockea `PanelInspeccion` y se verifica que la página mantiene `requireRole("admin","superadmin")` y no consulta nada antes. El formulario es presentacional con `useActionState`; la lógica de cantidad la cubren los tests del servicio.
- [x] Completada

## Grupos paralelos
- G1: T1 y T2 (archivos disjuntos). G2: T3. G3: T4 y T5 (archivos disjuntos). G4: T6.

## Fases siguientes
- Spec `diligencia-inspeccion`: programar la diligencia y registrar el resultado.
