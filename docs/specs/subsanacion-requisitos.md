# Subsanación de requisitos (OBSERVADO_REQUISITOS)

Estado: approved

Parte 2 de 4 de `subsanacion-plazos`. Independiente de `plazos-dias-habiles`. Debe implementarse **antes** de `subsanacion-evidencia` (ambas modifican `documento.service.ts`, `documentos.ts` y `app/api/uploadthing/core.ts`).

## Objetivo
Cuando el `admin` observa los requisitos de una solicitud (`EN_REVISION → OBSERVADO_REQUISITOS`, con motivo), el `cliente` hoy no puede hacer nada. Con esta spec ve el motivo, reemplaza o completa sus documentos y reenvía la solicitud para que vuelva a revisión.

## Fuera de alcance
- **Plazo para subsanar requisitos:** ni `reglas-negocio-itse.md` ni el DS 002-2018-PCM citado fijan uno para esta etapa; no se inventa (decisión 2). El plazo de 3 y 20 días hábiles es solo para la subsanación de la diligencia (partes 3 y 4).
- Editar datos de la solicitud (nivel de riesgo, calidad del solicitante, establecimiento, cocina, grifo, etc.): el cliente solo corrige **documentos**. Si el riesgo está mal, lo cambia el admin en revisión (acción existente).
- Pago de nuevo: la tasa ya está pagada; el reenvío no cobra.
- Correo o SMS de aviso.

## Decisiones (a confirmar al aprobar)
1. **El reenvío lleva a `PRESENTADO`, no a `EN_REVISION`.** `reglas-negocio` 6.1 dice `OBSERVADO_REQUISITOS → PRESENTADO (cuando el cliente corrige)` y manda sobre el pedido original; además hace que la solicitud reaparezca como «Presentado» (pendiente) en la bandeja y el admin la retome con «Iniciar revisión». Alternativa si el humano prefiere ir directo a `EN_REVISION`: cambiar un destino en `transiciones.ts` y el texto del historial (sin otro impacto).
2. **Sin plazo ni vencimiento en esta etapa** (ver Fuera de alcance). Si el humano quiere uno, hay que definirlo primero en `reglas-negocio`.
3. **Se pueden reemplazar, agregar y quitar documentos** de la solicitud mientras el estado sea `OBSERVADO_REQUISITOS`; la completitud se valida **al reenviar** con `documentosFaltantes` (los obligatorios según el riesgo y la calidad del solicitante). No se marca qué documento se corrigió: el motivo del admin es texto libre.
4. **El motivo que ve el cliente** es el comentario de la última entrada del historial con estado nuevo `OBSERVADO_REQUISITOS` (ya es visible hoy; el formulario del admin avisa «El solicitante verá este motivo»).
5. El historial del cliente sigue sin mostrar nombres del personal (`getExpedienteDetalle` ya lo garantiza).

## Reutilización
- Existente que se reutiliza: `aplicar` (`transicion.service.ts`: UPDATE condicionado + historial en un `db.batch`); `DocumentoUploader` (sin cambios); `documentosRequeridos`, `documentosOpcionales`, `documentosFaltantes`, `DOCUMENTOS` (`utils/documentos.ts`); `registerDocumento`/`removeDocumento` (`documento.service.ts`); `documentoFileRouter` (`app/api/uploadthing/core.ts`); `requireRole`; `ActionResult`; `Card`, `Button` de `components/ui/`.
- Existente que se extiende: `modules/expedientes/utils/transiciones.ts` (arista `OBSERVADO_REQUISITOS → PRESENTADO` solo para el cliente); `documento.service.ts` y `core.ts` (hoy solo aceptan `BORRADOR`); `utils/documentos.ts` (constante de estados editables); `actions/transicion.actions.ts` (+1 acción); `ExpedienteDetalleCliente.tsx`.
- Nuevo (y por qué): `services/requisitos.service.ts` (reenvío del cliente: no existe y `cambiarEstado` es solo para el personal); `components/SubsanacionRequisitos.tsx`; `utils/observacion.ts` (extrae el motivo del historial).
- Dependencias / componentes shadcn a instalar: ninguno. Migraciones: ninguna (los estados ya existen).

## Specs afectadas
- `bandeja-estados` / `aprobacion-jefatura` / `diligencia-inspeccion`: la matriz 18 × 18 de `transiciones.test.ts` suma la arista nueva (solo cliente). El invariante «`cliente` siempre `[]`» de `transicionesPermitidas` **se conserva**; el cliente usa la función nueva `transicionesCliente`.
- `solicitud-itse-wizard` / `solicitante-dni-acreditacion`: `registerDocumento` y `removeDocumento` (y el router de UploadThing) pasan de aceptar solo `BORRADOR` a aceptar `BORRADOR` y `OBSERVADO_REQUISITOS`; el comportamiento en `BORRADOR` no cambia.
- `reglas-negocio` 6.1: sin cambios (la transición ya figura).

## Criterios de aceptación
- AC-1 (máquina pura): `FLUJO.OBSERVADO_REQUISITOS = ["PRESENTADO"]` queda en `TRANSICIONES`. Para el personal esa arista se excluye: `transicionesPermitidas("OBSERVADO_REQUISITOS", "admin")` es `[]` y para `superadmin` es `["ANULADO"]`; `transicionesGenericas` igual. `transicionesPermitidas(cualquierEstado, "cliente")` sigue siendo `[]`. Nueva `transicionesCliente(estado)` devuelve `["PRESENTADO"]` solo para `OBSERVADO_REQUISITOS` y `[]` para el resto. `puedeTransicionar("OBSERVADO_REQUISITOS", "PRESENTADO", rol)` es `false` para los tres roles. `PRESENTADO` se agrega a `DESTINOS_CON_FLUJO_PROPIO`. La matriz 18 × 18 falla si algún par no listado es permitido.
- AC-2 (estados editables): `documentos.ts` exporta `ESTADOS_EDITABLES_CLIENTE = ["BORRADOR", "OBSERVADO_REQUISITOS"]`. `registerDocumento(actor, id, input)` y `removeDocumento(actor, id, tipo)` operan si el expediente es del cliente y su estado está en esa lista; para cualquier otro estado, o expediente ajeno, devuelven `null` sin escribir. Siguen lanzando `Error("No autorizado")` para roles distintos de `cliente`.
- AC-3 (UploadThing): el `middleware` de `documentoExpediente` acepta `OBSERVADO_REQUISITOS` además de `BORRADOR` (mismo mensaje «No se encontró la solicitud.» para los demás estados y para expedientes ajenos); sigue exigiendo rol `cliente` activo y un tipo de `DOCUMENTOS`.
- AC-4 (servicio): `reenviarRequisitos(actor, id)` lanza `Error("No autorizado")` si `actor.rol !== "cliente"`. Resultados en este orden: `no_encontrado` (no existe o no es del cliente) → `no_permitido` (estado distinto de `OBSERVADO_REQUISITOS`) → `incompleto` con `faltantes: TipoDocumento[]` (según `documentosFaltantes` con el contexto del expediente y `numeroPisos` del establecimiento) → `conflicto` (otro cambio ganó) → `ok`. En `ok` hay **un** `db.batch` (vía `aplicar`, con `desde = OBSERVADO_REQUISITOS`, `hasta = PRESENTADO`, actor = el cliente) y el historial lleva el comentario «Requisitos subsanados y reenviados.». Fuera de `ok` y `conflicto` no se invoca `db.batch`.
- AC-5 (acción): `reenviarRequisitosAction(id)` en `transicion.actions.ts`: `requireRole("cliente")` primero; id uuid (si no, «No se encontró el expediente.» sin tocar la BD); servicio con el usuario de `requireRole`; mensajes: `no_encontrado` «No se encontró el expediente.», `no_permitido` «Esa acción no está disponible para este expediente.», `incompleto` «Faltan documentos obligatorios: <etiquetas separadas por coma>.» (etiquetas de `DOCUMENTOS`), `conflicto` «El expediente cambió de estado. Actualiza la página e inténtalo de nuevo.», error inesperado «No se pudo guardar el cambio. Inténtalo de nuevo.». Solo en éxito revalida `/panel/expedientes`, `/panel/expedientes/<id>`, `/mi-cuenta/expedientes` y `/mi-cuenta/expedientes/<id>`.
- AC-6 (aislamiento): ninguna acción ni servicio nuevo acepta al personal; un cliente no puede reenviar, subir ni quitar documentos de un expediente ajeno (el servicio responde `no_encontrado`/`null`); `cambiarEstado` rechaza `hasta = PRESENTADO` con `no_permitido` sin `db.batch`.
- AC-7 (`ultimaObservacion(historial)`): devuelve el comentario de la última entrada con `estadoNuevo === "OBSERVADO_REQUISITOS"` (por `createdAt`), o `null` si no hay ninguna o el comentario es vacío.
- AC-8 (UI del cliente): cuando el estado es `OBSERVADO_REQUISITOS`, `ExpedienteDetalleCliente` muestra una sección «Corrige tu solicitud» con: el motivo del admin en un bloque destacado (`role="status"`, con la etiqueta «Motivo de la observación»); la lista de documentos obligatorios y opcionales del caso (`documentosRequeridos` + `documentosOpcionales`, con el contexto tomado del expediente y `establecimiento.numeroPisos`), cada uno con `DocumentoUploader` (`obligatorio` correcto y su documento actual si existe); y el botón «Reenviar solicitud» (`h-11`) que usa `useActionState` con `reenviarRequisitosAction`, muestra «Enviando…» mientras corre y el error en `role="alert"`. En otros estados no aparece nada de esto. No muestra nombres del personal.
- AC-9 (responsive y accesibilidad): sin desborde horizontal a 360, 768 y 1280 px; botones `h-11`; el estado siempre con texto; solo tokens del tema; sin `any`/`@ts-ignore`.
- AC-10: `npm run build`, `npm run lint` y `npx vitest run` pasan.

## Tareas
### T1 — Máquina de estados: arista del cliente
- Archivos: `modules/expedientes/utils/transiciones.ts` (modificar), `modules/expedientes/utils/transiciones.test.ts` (modificar)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-1
- Detalle: `FLUJO.OBSERVADO_REQUISITOS = ["PRESENTADO"]`; `SOLO_CLIENTE` excluye la arista de `transicionesPermitidas`; exportar `transicionesCliente`; ampliar `DESTINOS_CON_FLUJO_PROPIO`.
- Tests: matriz 18 × 18 rol por rol, `transicionesCliente` en los 18 estados, `puedeTransicionar` en los tres roles.
- [x] Completada

### T2 — Documentos editables en `OBSERVADO_REQUISITOS`
- Archivos: `modules/expedientes/utils/documentos.ts` (modificar), `modules/expedientes/utils/documentos.test.ts` (modificar), `modules/expedientes/services/documento.service.ts` (modificar), `modules/expedientes/services/documento.service.test.ts` (modificar), `app/api/uploadthing/core.ts` (modificar)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-2, AC-3, AC-6 (parte de documentos)
- Detalle: `ownDraft` pasa a una condición `estado IN ESTADOS_EDITABLES_CLIENTE` (renombrar a `ownEditable`); el `middleware` de `core.ts` usa la misma constante.
- Tests: `documento.service.test.ts` — `registerDocumento` y `removeDocumento` ok en `BORRADOR` y `OBSERVADO_REQUISITOS`, `null` en `EN_REVISION`/`PRESENTADO`/ajeno, `Error("No autorizado")` para admin; constante exacta en `documentos.test.ts`.
- [x] Completada

### T3 — Servicio de reenvío y acción
- Archivos: `modules/expedientes/services/requisitos.service.ts` (crear), `modules/expedientes/services/requisitos.service.test.ts` (crear), `modules/expedientes/actions/transicion.actions.ts` (modificar), `modules/expedientes/actions/transicion.actions.test.ts` (modificar)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-4, AC-5, AC-6
- Detalle: la acción maneja `incompleto` antes de delegar en `ejecutar`/`revalidar` existentes (no duplicar la lista de rutas).
- Tests: servicio con `db` mockeado — cada resultado de AC-4 en su orden, un solo `db.batch`, comentario exacto, `Error("No autorizado")`, `faltantes` correcto con y sin acreditación; acción — orden `requireRole` → uuid → servicio, cada mensaje, `revalidatePath` solo en éxito, usuario de `requireRole` al servicio.
- [x] Completada

### T4 — Vista del cliente
- Archivos: `modules/expedientes/utils/observacion.ts` (crear), `modules/expedientes/utils/observacion.test.ts` (crear), `modules/expedientes/components/SubsanacionRequisitos.tsx` (crear), `modules/expedientes/components/ExpedienteDetalleCliente.tsx` (modificar)
- Depende de: T2, T3
- Grupo paralelo: G3
- Cubre: AC-7, AC-8, AC-9
- Detalle: la página del cliente no se toca (`detalle` ya trae `documentos`, `establecimiento` e `historial`).
- Tests: `observacion.test.ts` (último motivo entre varios ciclos, sin observación, comentario vacío); `SubsanacionRequisitos.tsx` es presentacional con `useActionState` (SETUP.md 3.2): sin test propio.
- [x] Completada

## Grupos paralelos
- G1: T1 y T2 (archivos disjuntos). G2: T3. G3: T4.

## Fases siguientes
- `observaciones-diligencia` y `subsanacion-evidencia` (subsanación de la diligencia, con plazos).
