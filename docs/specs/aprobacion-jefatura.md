# Aprobación de Jefatura (envío, aprobación y devolución)

Estado: approved

Extiende `bandeja-estados.md` (implementada). Inserta un paso de aprobación del superadmin entre `EN_REVISION` y la futura designación de inspector.

## Objetivo
Después de revisar un expediente, el `admin` lo **envía a Jefatura**; el `superadmin` (jefe de GRDyDC) lo **aprueba** o lo **devuelve** a revisión con motivo. La aprobación queda en el historial y la ven el admin y el cliente. Luego el admin podrá designar inspector (spec `inspeccion`).

## Fuera de alcance
- Designación de inspector, constancia, diligencia: `APROBADO_JEFATURA` no tiene salidas aquí (salvo `ANULADO`); las trae `inspeccion`.
- Notificaciones, firma/PDF de la aprobación, plazos.
- Borrar el valor `EN_TRAMITE_EXTERNO` del enum (queda sin uso; quitar un valor de un enum de Postgres es inviable sin recrearlo).
- Cambiar el flujo de `bandeja-estados` en lo demás (riesgo, ANULADO, atomicidad con `db.batch`, aislamiento por rol).

## Decisiones
1. Dos estados nuevos en `estado_expediente`: `ENVIADO_JEFATURA` («Enviado a Jefatura») y `APROBADO_JEFATURA` («Aprobado por Jefatura»). Migración `ADD VALUE` generada con `DATABASE_URL="postgres://u:p@localhost/db" npm run db:generate`; el humano corre `db:migrate`.
2. Transiciones nuevas: `EN_REVISION → ENVIADO_JEFATURA` (admin o superadmin, motivo opcional); `ENVIADO_JEFATURA → APROBADO_JEFATURA` (solo superadmin, nota opcional); `ENVIADO_JEFATURA → EN_REVISION` = «Devolver» (solo superadmin, motivo obligatorio 10–500). `ANULADO` (solo superadmin) también desde los estados nuevos.
3. Se retira `EN_REVISION → EN_TRAMITE_EXTERNO`. Desde `EN_REVISION` quedan «Observar requisitos» y «Enviar a Jefatura».
4. «Devolver» y «Iniciar revisión» comparten el destino `EN_REVISION`; solo la devolución exige motivo. Por eso `requiereMotivo(hasta, desde?)` recibe el estado de partida opcional. La regla se hace cumplir en el **servicio** (que conoce el estado real), no en el formulario ni en el schema Zod (que solo ve `hasta`).
5. Reglas de rol en un solo lugar: `transicionesPermitidas(estado, rol)`; un conjunto `SOLO_SUPERADMIN` de pares/destinos (`ANULADO`, `APROBADO_JEFATURA` y la devolución `ENVIADO_JEFATURA → EN_REVISION`) sustituye al filtro actual de solo `ANULADO`.
6. El cliente ve «Aprobado por Jefatura» y el motivo de la devolución en su historial sin nombres de personal (`HistorialTimeline` ya oculta `actorNombre` al cliente; no se modifica).

## Reutilización
- Se extiende: `db/schema.ts` (enum), `modules/expedientes/constants/estado-labels.ts` (2 etiquetas; su test ya recorre `enumValues`), `utils/transiciones.ts`, `schemas/cambio-estado.schema.ts`, `services/transicion.service.ts`, `actions/transicion.actions.ts`, `components/AccionesExpediente.tsx`, `components/BandejaView.tsx`.
- Sin cambios: `filtros-bandeja.schema.ts` (usa `estadoExpedienteEnum.enumValues`, incorpora los estados nuevos solo), `HistorialTimeline.tsx`, `EstadoBadge`, la lista de estados del `<select>` de la bandeja (se deriva de `ESTADO_LABELS`).
- Nuevo: nada.
- Dependencias / shadcn a instalar: ninguna. Preparación del humano: `npm run db:migrate`.

## Specs afectadas
- `bandeja-estados`: **AC-1** (matriz: 18 × 18; `EN_REVISION` → `OBSERVADO_REQUISITOS | ENVIADO_JEFATURA`, ya no `EN_TRAMITE_EXTERNO`; `requiereMotivo` gana el caso devolución), **AC-2** (ahora 17 estados distintos de `BORRADOR` en el filtro), **AC-5** (nuevo resultado `motivo_requerido`), **AC-10** (botones: «Enviar a Jefatura», «Aprobar», «Devolver» reemplazan a «Derivar a trámite externo»; texto sin acciones según estado). La decisión 1 de `bandeja-estados` queda reemplazada por la decisión 2 de esta spec.
- `docs/reglas-negocio-itse.md` secciones 6, 6.1 y 11 (T1).
- Futura `inspeccion`: la entrada pasa a ser `APROBADO_JEFATURA → INSPECTOR_DESIGNADO` (ya no `EN_TRAMITE_EXTERNO`).

## Criterios de aceptación
- AC-1 (enum y etiquetas): `estadoExpedienteEnum.enumValues` incluye `ENVIADO_JEFATURA` y `APROBADO_JEFATURA`, existe una migración nueva en `drizzle/` con `ALTER TYPE "estado_expediente" ADD VALUE` para ambos, y `ESTADO_LABELS` los etiqueta «Enviado a Jefatura» y «Aprobado por Jefatura» (el test existente que recorre todo el enum pasa).
- AC-2 (máquina pura): `transicionesPermitidas` devuelve: `EN_REVISION` → `["OBSERVADO_REQUISITOS", "ENVIADO_JEFATURA"]` (admin) y además `ANULADO` (superadmin); `ENVIADO_JEFATURA` → `[]` para admin y `["EN_REVISION", "APROBADO_JEFATURA", "ANULADO"]` (en cualquier orden) para superadmin; `APROBADO_JEFATURA` → `[]` admin, `["ANULADO"]` superadmin; `cliente` siempre `[]`. `EN_TRAMITE_EXTERNO` no es destino de ningún estado. `puedeTransicionar("EN_REVISION", "EN_TRAMITE_EXTERNO", rol)` es falso para todos los roles. Un test recorre la matriz 18 × 18 y falla si algún par no listado es permitido.
- AC-3 (motivo): `requiereMotivo(hasta, desde?)` es verdadero para `OBSERVADO_REQUISITOS`, `ANULADO` y para `EN_REVISION` solo cuando `desde === "ENVIADO_JEFATURA"`; falso para `ENVIADO_JEFATURA`, `APROBADO_JEFATURA` y `EN_REVISION` desde `PRESENTADO`.
- AC-4 (servicio, autorización por rol): `cambiarEstado` con actor `admin` devuelve `no_permitido` para `ENVIADO_JEFATURA → APROBADO_JEFATURA` y `ENVIADO_JEFATURA → EN_REVISION`, sin invocar `db.batch`; con `superadmin` ambas devuelven `ok` en un único `db.batch` (UPDATE + INSERT de historial con `estado_anterior`, `estado_nuevo`, `usuario_id`, `comentario`). `EN_REVISION → ENVIADO_JEFATURA` es `ok` para admin y superadmin. Transiciones ilegales (`PRESENTADO → ENVIADO_JEFATURA`, `EN_REVISION → APROBADO_JEFATURA`, `APROBADO_JEFATURA → EN_REVISION`, `EN_REVISION → EN_TRAMITE_EXTERNO`) devuelven `no_permitido` sin `batch`.
- AC-5 (motivo en servicio): `cambiarEstado(superadmin, id, { hasta: "EN_REVISION", comentario: <vacío o < 10 caracteres> })` sobre un expediente en `ENVIADO_JEFATURA` devuelve `motivo_requerido` sin `batch`; con 10+ caracteres devuelve `ok`. `PRESENTADO → EN_REVISION` sin comentario sigue siendo `ok`. La verificación de transición permitida precede a la de motivo (un admin que intenta devolver recibe `no_permitido`).
- AC-6 (schema y acción): `cambioEstadoSchema.hasta` acepta `EN_REVISION`, `OBSERVADO_REQUISITOS`, `ENVIADO_JEFATURA`, `APROBADO_JEFATURA`, `ANULADO` y rechaza `EN_TRAMITE_EXTERNO`; el motivo sigue siendo obligatorio solo para `OBSERVADO_REQUISITOS` y `ANULADO`. `cambiarEstadoAction` mapea `motivo_requerido` a «Escribe un motivo de al menos 10 caracteres.», mantiene `requireRole("admin", "superadmin")` primero y pasa a servicio el usuario de `requireRole` (nunca el rol del formulario). Los cambios a estado `ENVIADO_JEFATURA`/`APROBADO_JEFATURA` revalidan las 4 rutas existentes solo en éxito.
- AC-7 (UI del detalle): `AccionesExpediente` muestra solo los botones de `transicionesPermitidas(estado, rol)`: en `EN_REVISION` «Observar requisitos» y «Enviar a Jefatura» (acción directa, sin motivo obligatorio); en `ENVIADO_JEFATURA` el superadmin ve «Aprobar» (directa), «Devolver» (con formulario de motivo obligatorio con `required`/`minLength=10` y el aviso «El solicitante verá este motivo.») y «Anular expediente»; el admin ve «Esperando aprobación de Jefatura.». En `APROBADO_JEFATURA` el admin ve «Esperando designación de inspector.» sin botones y el superadmin solo «Anular expediente». No aparece «Derivar a trámite externo». El formulario de nivel de riesgo sigue visible solo en `EN_REVISION`.
- AC-8 (historial): tras aprobar, la línea de tiempo (vista de admin y de cliente) incluye una fila «Aprobado por Jefatura»; tras devolver, una fila «En revisión» con el motivo. Para el cliente ninguna fila muestra nombres de personal (`actorNombre` indefinido; comportamiento existente verificado por `getExpedienteDetalle`).
- AC-9 (bandeja): el `<select>` «Estado» de la bandeja lista los dos estados nuevos con sus etiquetas; `filtrosBandejaSchema.parse({ estado: "ENVIADO_JEFATURA" })` lo acepta; la bandeja muestra un enlace «Pendientes de Jefatura» a `/panel/expedientes?estado=ENVIADO_JEFATURA` (nombre accesible, `h-11`, solo tokens del tema), sin romper filtros ni paginación existentes.
- AC-10 (docs): `docs/reglas-negocio-itse.md` secciones 6, 6.1 y 11 reflejan los dos estados, las transiciones de la decisión 2, la retirada de `EN_TRAMITE_EXTERNO` del flujo (marcado como en desuso) y la fila de permisos «Aprobar / devolver expedientes en Jefatura: solo superadmin».
- AC-11: `npm run build`, `npm run lint` y `npx vitest run` pasan; sin `any`/`@ts-ignore`.

## Tareas
### T1 — Enum, migración y reglas de negocio (docs)
- Archivos: `db/schema.ts` (modificar), `drizzle/0011_*.sql` (crear, generado), `drizzle/meta/0011_snapshot.json` (crear, generado), `drizzle/meta/_journal.json` (modificar, generado), `docs/reglas-negocio-itse.md` (modificar)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-1 (enum y migración), AC-10
- Detalle: añadir los dos valores al final del `pgEnum` y generar la migración con el comando de la decisión 1. En el doc: 6 (dos filas nuevas; `EN_TRAMITE_EXTERNO` marcado «en desuso»; `CERTIFICADO_PENDIENTE_FIRMA` queda para la spec `certificados`), 6.1 (`EN_REVISION → OBSERVADO_REQUISITOS | ENVIADO_JEFATURA`; `ENVIADO_JEFATURA → APROBADO_JEFATURA | EN_REVISION` solo superadmin; `APROBADO_JEFATURA → INSPECTOR_DESIGNADO`) y 11 (nueva fila de permisos).
- Tests: no aplica (esquema, generado y documentación; el enum lo cubre el test de etiquetas de T2).
- [x] Completada

### T2 — Máquina de estados y etiquetas
- Archivos: `modules/expedientes/utils/transiciones.ts` (modificar), `modules/expedientes/utils/transiciones.test.ts` (modificar), `modules/expedientes/constants/estado-labels.ts` (modificar)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-1 (etiquetas), AC-2, AC-3
- Detalle: `FLUJO` pasa a `PRESENTADO: [EN_REVISION]`, `EN_REVISION: [OBSERVADO_REQUISITOS, ENVIADO_JEFATURA]`, `ENVIADO_JEFATURA: [APROBADO_JEFATURA, EN_REVISION]`. `transicionesPermitidas` filtra con un conjunto de restricciones solo-superadmin (decisión 5). `requiereMotivo(hasta, desde?)` según AC-3. Etiquetas: `ENVIADO_JEFATURA` variante `secondary`, `APROBADO_JEFATURA` variante `default`. `ESTADOS_FINALES` no cambia.
- Tests: `transiciones.test.ts` — matriz 18 × 18 actualizada, rol por rol (admin no aprueba ni devuelve; superadmin sí), `EN_TRAMITE_EXTERNO` sin entradas, `requiereMotivo` con y sin `desde`. El test de etiquetas existente (`estado-labels.test.ts`) cubre los dos estados nuevos sin cambios.
- [x] Completada

### T3 — Servicio y schema de cambio de estado
- Archivos: `modules/expedientes/services/transicion.service.ts` (modificar), `modules/expedientes/services/transicion.service.test.ts` (modificar), `modules/expedientes/schemas/cambio-estado.schema.ts` (modificar), `modules/expedientes/schemas/cambio-estado.schema.test.ts` (modificar)
- Depende de: T2
- Grupo paralelo: G3
- Cubre: AC-4, AC-5, AC-6 (schema)
- Detalle: `TransicionResultado` gana `motivo_requerido`; en `cambiarEstado`, tras `puedeTransicionar`, si `requiereMotivo(hasta, exp.estado)` y el comentario tiene menos de 10 caracteres, devuelve `motivo_requerido` antes del `db.batch`. El schema ajusta el enum de `hasta` (decisión 4: sigue usando `requiereMotivo(hasta)` sin `desde`).
- Tests: `transicion.service.test.ts` — casos de AC-4 y AC-5 (admin y superadmin, ilegales sin `batch`, devolución sin/con motivo, `conflicto` en la nueva transición). `cambio-estado.schema.test.ts` — reemplazar el caso de `EN_TRAMITE_EXTERNO` (ahora rechazado) por `ENVIADO_JEFATURA`/`APROBADO_JEFATURA` con motivo opcional.
- [x] Completada

### T4 — Acción de servidor y UI (detalle y bandeja)
- Archivos: `modules/expedientes/actions/transicion.actions.ts` (modificar), `modules/expedientes/actions/transicion.actions.test.ts` (modificar), `modules/expedientes/components/AccionesExpediente.tsx` (modificar), `modules/expedientes/components/BandejaView.tsx` (modificar)
- Depende de: T3
- Grupo paralelo: G4
- Cubre: AC-6 (acción), AC-7, AC-8, AC-9
- Detalle: acción: mensaje de `motivo_requerido` en `MENSAJES`. `AccionesExpediente`: `ACCION_LABELS` pasa a «Enviar a Jefatura», «Aprobar», «Anular expediente» (se quita «Derivar a trámite externo»); «Devolver» es la acción con motivo cuando `hasta === "EN_REVISION"` y `estado === "ENVIADO_JEFATURA"` (el formulario de motivo se elige con `requiereMotivo(hasta, estado)` en lugar de solo `hasta`); el texto sin acciones es «Esperando aprobación de Jefatura.» en `ENVIADO_JEFATURA`, «Esperando designación de inspector.» en `APROBADO_JEFATURA` y el genérico en el resto. `BandejaView`: enlace «Pendientes de Jefatura» junto a los filtros.
- Tests: `transicion.actions.test.ts` — mapeo de `motivo_requerido`; un admin que envía `hasta=APROBADO_JEFATURA` recibe «Esa acción no está disponible para este expediente.» (servicio mockeado devolviendo `no_permitido`) y el servicio se invoca con el rol de `requireRole`. Los componentes son presentacionales (SETUP.md 3.2): sin test propio salvo que el developer agregue uno simple de botones por estado y rol.
- [x] Completada

## Grupos paralelos
- G1: T1. G2: T2 (necesita el enum de T1). G3: T3. G4: T4. Secuencial por contrato (enum → máquina → servicio → UI); no hay paralelismo útil porque cada tarea consume el contrato de la anterior.

## Fases siguientes
- Spec `inspeccion`: `APROBADO_JEFATURA → INSPECTOR_DESIGNADO` y el resto del flujo.
