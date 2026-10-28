# Generación del certificado (CUMPLE → CERTIFICADO_PENDIENTE_FIRMA)

Estado: approved
Nota (cambio posterior): el personal (admin y superadmin) ve el PDF del certificado como BORRADOR mientras el expediente está en `CERTIFICADO_PENDIENTE_FIRMA`, antes de aprobarlo (enlace «Ver certificado (borrador)»); esto revierte la decisión «sin vista previa». El cliente sigue sin verlo hasta `ENTREGADO` y la Resolución no tiene borrador.

Parte 1 de 4 de `certificados`. Depende de `diligencia-inspeccion` y `subsanacion-evidencia` (ya implementadas: dejan el expediente en `CUMPLE`), de `bandeja-estados` (`aplicar`, `transiciones.ts`) y de `aprobacion-jefatura`. **Cierra el flujo hasta `CERTIFICADO_PENDIENTE_FIRMA`** (el certificado ya está en manos del superadmin). Orden de las specs: 1 `certificado-emision` → 2 `certificado-resolucion-entrega` → 3 `certificado-pdf-verificacion` → 4 `certificados-listados`. `NO_CUMPLE` es estado final del flujo (sin certificado ni derivación): no requiere spec.

Flujo completo de `certificados` (decisión humana): (1) el **admin** genera el certificado y lo envía al superadmin [esta spec]; (2) el **superadmin** lo aprueba y el sistema genera la Resolución Gerencial en el mismo acto, y vuelve al admin [spec 2]; (3) el **admin** envía certificado y resolución al cliente, que solo entonces los ve y descarga [spec 2].

## Objetivo
Cuando el expediente llega a `CUMPLE`, el personal (admin o superadmin) **genera el certificado**: se le asigna un número correlativo por año y un código de verificación no adivinable, y el expediente pasa a `CERTIFICADO_PENDIENTE_FIRMA`, a la espera de la aprobación del superadmin (spec 2). Aquí no hay aprobación, vigencia, Resolución Gerencial, PDF ni página pública.

## Fuera de alcance
- Aprobar el certificado, fijar fecha de expedición y vigencia, Resolución Gerencial, `FINALIZADO` y `ENTREGADO` (spec 2).
- PDF, QR y descarga (spec 3); verificación pública (spec 3); listados y «por vencer» (spec 4).
- Firma digital real: la «firma» es la aprobación del superadmin registrada en el historial (`reglas-negocio` 9 y 12).
- Rechazar o devolver un certificado pendiente: `reglas-negocio` 6.1 no lo permite; si hay un error se anula el expediente (solo superadmin) y el número queda sin usar.
- Aforo en el certificado: el sistema no registra aforo del establecimiento (`reglas-negocio` 9 lo lista; queda fuera hasta que exista el dato).
- Revocación como acción propia: `REVOCADO` se deriva de que el expediente esté `ANULADO` (decisión 5); no hay botón nuevo.
- Correo o SMS de aviso.

## Decisiones (a confirmar al aprobar)
1. **Quién hace el paso:** `CUMPLE → CERTIFICADO_PENDIENTE_FIRMA` = «Generar certificado y enviar a Jefatura», `admin` o `superadmin` (decisión humana). `reglas-negocio` 6 decía que lo asigna el «sistema»; la tabla se corrige (T3). Un superadmin puede generar y luego aprobar el mismo certificado (no hay separación de funciones forzada; se acepta porque el jefe es la autoridad máxima).
2. **Tabla `certificados`, una fila por expediente** (índice único en `expediente_id`), creada al generar. Columnas: `id`, `expediente_id`, `numero`, `codigo`, `emitido_at` y `vence_at` (nulas hasta la aprobación, spec 2), `created_at`. El nombre del jefe no se guarda: se obtiene del historial (quien llevó a `FINALIZADO`, spec 2).
3. **Número `NNNN-AAAA`** (`0001-2026`), correlativo por año de Lima, asignado **al generar** con el patrón de `presentarExpediente`: `max + 1` dentro del INSERT, índice único y hasta 3 reintentos ante choque (`23505`). Si el expediente se anula antes de aprobar, el número queda sin usar (límite aceptado; el año del número es el de la generación).
4. **Código de verificación:** 12 caracteres del alfabeto Crockford base32 (`0123456789ABCDEFGHJKMNPQRSTVWXYZ`, 60 bits), generados con `crypto.randomBytes` (nunca `Math.random`), únicos por índice. Se muestra agrupado `ABCD-EFGH-JKMN`; se guarda sin guiones.
5. **Vigencia (la calcula la spec 2, las reglas puras se definen aquí):** empieza cuando el **superadmin aprueba**: `emitido_at` = instante de la aprobación; `vence_at` = misma fecha calendario de Lima **+ 2 años** (29/02 → 28/02), guardada como **inicio de día en Lima**. El último día vale completo. Estado derivado, calculado al leer: `VENCIDO` si hoy (Lima) es posterior a `vence_at`; `POR_VENCER` si faltan 60 días calendario o menos (incluye el último día); `VIGENTE` en otro caso; `REVOCADO` si el expediente está `ANULADO`. Etiquetas: Vigente, Por vencer, Vencido, **Anulado**.
6. **Quién ve el certificado:** el **cliente solo cuando el expediente está `ENTREGADO`** (el admin lo envió; `FINALIZADO` aún no, decisión humana); el personal ve el resumen siempre que exista la fila, y podrá descargar el PDF desde `FINALIZADO` (specs 2 y 3). `PENDIENTE_RESOLUCION` queda en desuso (spec 2) y no concede acceso a nadie.

## Reutilización
- Existente que se reutiliza: `aplicar` y `TransicionResultado` (`modules/expedientes/services/transicion.service.ts`, con `extras` para el INSERT dentro del mismo `db.batch`); `puedeTransicionar`; `requireRole`; `ActionResult`; `formatFecha`; `aInputLima` y `parseFechaLima` (`modules/inspecciones/utils/fecha-diligencia.ts`); `Badge`, `Button` de `components/ui/`; patrón de formularios con `useActionState` de `AccionesExpediente`; patrón de reintento por `23505` de `expediente.service.ts`; `ESTADO_LABELS`.
- Existente que se extiende: `db/schema.ts` (tabla nueva); `modules/expedientes/utils/transiciones.ts`; `app/panel/expedientes/[id]/page.tsx` (renderiza `PanelCertificado`); `docs/reglas-negocio-itse.md`.
- Nuevo (y por qué): módulo `modules/certificados/` (lo exige `constitucion` 2): reglas puras de número, código, vigencia y acceso; servicio con las reglas de este flujo (no cabe en `transicion.service.ts`, que es genérico); acción; `PanelCertificado` y `GenerarCertificadoButton`; `CertificadoEstadoBadge` y etiquetas (las reutilizan las specs 2, 3 y 4).
- Dependencias / componentes shadcn a instalar: ninguno (`badge`, `button` ya existen).
- **Migración `0018` (la genera el developer en T3 con `DATABASE_URL="postgres://u:p@localhost/db" npm run db:generate`; el humano corre `npm run db:migrate`):** `CREATE TABLE "certificados"` con sus índices únicos. Solo agrega. Hoy `0017` es la última; si al implementar hay otra, usar la siguiente libre.

## Specs afectadas
- `bandeja-estados` / `diligencia-inspeccion` / `subsanacion-evidencia`: la matriz 18 × 18 de `transiciones.test.ts` suma `CUMPLE → CERTIFICADO_PENDIENTE_FIRMA`; el destino tiene flujo propio (no aparece como botón genérico).
- `docs/reglas-negocio-itse.md` secciones 6 (quién asigna `CERTIFICADO_PENDIENTE_FIRMA`) y 9 (número al generar, vigencia desde la aprobación, `REVOCADO` = expediente anulado, sin aforo, visibilidad del cliente solo en `ENTREGADO`) y 11 (permiso «Generar certificado»).

## Criterios de aceptación
- AC-1 (número): `formatNumeroCertificado(2026, 1)` devuelve `"0001-2026"` y `(2026, 12345)` devuelve `"12345-2026"`. `esNumeroCertificado` acepta `"0001-2026"` y rechaza `""`, `"1-2026"`, `"0001-26"` y `"EXP-2026-00001"`.
- AC-2 (código): `generarCodigo()` devuelve 12 caracteres del alfabeto de la decisión 4; 1000 llamadas son distintas entre sí (test) y el archivo usa `crypto.randomBytes` (grep: no aparece `Math.random`). `normalizarCodigo(" abcd-efgh jkmn ")` devuelve `"ABCDEFGHJKMN"`; mapea `O→0`, `I→1`, `L→1`; devuelve `null` para vacío, longitud distinta de 12 o caracteres fuera del alfabeto (p. ej. `U`, `_`). `formatCodigo("ABCDEFGHJKMN")` devuelve `"ABCD-EFGH-JKMN"`.
- AC-3 (vigencia): `calcularVencimiento` devuelve el inicio de día en Lima de la fecha de emisión + 2 años: emisión 15/03/2026 → 15/03/2028; 29/02/2024 → 28/02/2026; 31/12/2026 23:30 Lima → 31/12/2028. `estadoCertificado({ venceAt, revocado }, ahora)` devuelve `REVOCADO` si `revocado`; con 61 días calendario restantes `VIGENTE`; con 60 y con 0 días `POR_VENCER`; un día después del vencimiento `VENCIDO`. `diasParaVencer` devuelve 0 el último día y negativo después.
- AC-4 (acceso): `certificadoDescargable(rol, estado)` (aplica al PDF del certificado y a la Resolución): `cliente` solo con `ENTREGADO`; `admin` y `superadmin` con `FINALIZADO` o `ENTREGADO`; `false` en cualquier otro estado, incluidos `CERTIFICADO_PENDIENTE_FIRMA`, `PENDIENTE_RESOLUCION` y `ANULADO`.
- AC-5 (etiquetas): `CERTIFICADO_ESTADO_LABELS` cubre `VIGENTE`, `POR_VENCER`, `VENCIDO`, `REVOCADO` con etiquetas «Vigente», «Por vencer», «Vencido», «Anulado» y variante de `Badge`; `CertificadoEstadoBadge` renderiza el texto (nunca solo color).
- AC-6 (esquema): `certificados` con `id` uuid, `expedienteId` (FK `restrict`, **único**), `numero` (único), `codigo` (único), `emitidoAt` y `venceAt` (timestamptz, nulas), `createdAt`; existe una migración nueva (`0018`) en `drizzle/` que solo hace `CREATE TABLE` (y sus índices únicos).
- AC-7 (máquina pura): `transicionesPermitidas("CUMPLE", "admin")` es `["CERTIFICADO_PENDIENTE_FIRMA"]` (superadmin además `ANULADO`); `("CERTIFICADO_PENDIENTE_FIRMA", "admin")` es `[]` y para superadmin `["ANULADO"]` (la salida a `FINALIZADO` la agrega la spec 2); `cliente` siempre `[]`. `transicionesGenericas("CUMPLE", rol)` no incluye `CERTIFICADO_PENDIENTE_FIRMA`. La matriz 18 × 18 falla si algún par no listado es permitido.
- AC-8 (generar, servicio): `prepararCertificado(actor, id, ahora?)` lanza `Error("No autorizado")` si `actor.rol === "cliente"`. Resultados en orden: `no_encontrado` (no existe o sin número) → `no_permitido` (estado distinto de `CUMPLE`, o `nivelRiesgo` nulo, o `!puedeTransicionar`) → `conflicto` → `ok`. En `ok`, **un** `db.batch` vía `aplicar` (`CUMPLE → CERTIFICADO_PENDIENTE_FIRMA`) cuyo `extras` inserta en `certificados` solo si el UPDATE ganó (`numero` calculado según la decisión 3, `codigo` de `generarCodigo()`, `emitido_at` y `vence_at` nulos) y el historial lleva el comentario «Certificado generado y enviado a Jefatura para su aprobación.». Ante `23505` reintenta hasta 3 veces con un código nuevo y relanza después. Sin `ok`/`conflicto` no se invoca `db.batch`. Doble clic: el segundo intento devuelve `conflicto` y no duplica la fila.
- AC-9: **movido a la spec 2** (`certificado-resolucion-entrega`, AC-5): la aprobación pasa a ser el acto que también genera la Resolución.
- AC-10 (resumen): `getResumenCertificado(actor, expedienteId, ahora?)` devuelve `null` si no hay fila. Para `cliente`: solo si el expediente es suyo y `certificadoDescargable("cliente", estado)` (es decir `ENTREGADO`); si no, `null` (mismo resultado que un expediente ajeno). Para personal: siempre que exista la fila. Devuelve `{ numero, emitidoAt, venceAt, estado }` con `estado` de `estadoCertificado` (o `null` mientras `emitidoAt` sea nulo) y `revocado` cuando el expediente está `ANULADO`. No devuelve `codigo`.
- AC-11 (acción): `prepararCertificadoAction(id)` usa `requireRole("admin", "superadmin")` primero, valida `id` como uuid, pasa al servicio el usuario de `requireRole` (nunca un rol del formulario) y mapea: `no_encontrado` «No se encontró el expediente.»; `no_permitido` «Esa acción no está disponible para este expediente.»; `conflicto` «El expediente cambió de estado. Actualiza la página e inténtalo de nuevo.»; error inesperado «No se pudo guardar el cambio. Inténtalo de nuevo.». Solo en éxito revalida `/panel/expedientes`, `/panel/expedientes/<id>`, `/mi-cuenta/expedientes`, `/mi-cuenta/expedientes/<id>`, `/panel/certificados` y `/mi-cuenta/certificados`.
- AC-12 (UI del personal): en el detalle `/panel/expedientes/<id>`, `PanelCertificado` aparece solo en `CUMPLE`, `CERTIFICADO_PENDIENTE_FIRMA`, `FINALIZADO` y `ENTREGADO`. En `CUMPLE`: botón «Generar certificado y enviar a Jefatura» (`h-11`) para admin y superadmin. En `CERTIFICADO_PENDIENTE_FIRMA`: «Certificado N.° 0001-2026 pendiente de aprobación de Jefatura.» sin botón (la spec 2 agrega el de aprobar para el superadmin). En `FINALIZADO` y `ENTREGADO`: número, fecha de expedición, fecha de vencimiento (`dd/MM/yyyy`) y `CertificadoEstadoBadge`. Errores en `role="alert"`; foco visible; botones `h-11`; solo tokens del tema.
- AC-13 (cliente y privacidad): el cliente no ve ningún control de este flujo ni `PanelCertificado`; en su línea de tiempo ve «Certificado por firmar» sin nombres del personal (`actorNombre` indefinido, comportamiento existente de `getExpedienteDetalle`); `codigo` no aparece en ningún componente del panel (grep).
- AC-14 (docs): `docs/reglas-negocio-itse.md` 6, 9 y 11 reflejan las decisiones 1, 3, 5 y 6 y la exclusión del aforo.
- AC-15: `npm run build`, `npm run lint` y `npx vitest run` pasan; sin `any`/`@ts-ignore`.

## Tareas
### T1 — Reglas puras: número y código
- Archivos: `modules/certificados/utils/certificado-numero.ts` (crear), `modules/certificados/utils/certificado-numero.test.ts` (crear), `modules/certificados/utils/certificado-codigo.ts` (crear), `modules/certificados/utils/certificado-codigo.test.ts` (crear)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-1, AC-2
- Tests: ambos `.test.ts` — casos de AC-1 y AC-2 (unicidad de 1000 códigos, alfabeto, normalización con mayúsculas, guiones, `O/I/L`, rechazos).
- [x] Completada

### T2 — Reglas puras: vigencia y etiquetas
- Archivos: `modules/certificados/utils/vigencia.ts` (crear), `modules/certificados/utils/vigencia.test.ts` (crear), `modules/certificados/constants/certificado-labels.ts` (crear), `modules/certificados/components/CertificadoEstadoBadge.tsx` (crear)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-3, AC-5
- Detalle: constantes `VIGENCIA_ANIOS = 2` y `DIAS_ALERTA_VENCIMIENTO = 60` en `vigencia.ts`; reutiliza `aInputLima`/`parseFechaLima`. `calcularVencimiento` la consume la spec 2 al aprobar; `estadoCertificado` la usan el resumen y las specs 3 y 4. `Badge` con el texto de `CERTIFICADO_ESTADO_LABELS`.
- Tests: `vigencia.test.ts` — fronteras 61/60/0/-1 días, 29/02, fin de año, `revocado`, hora de Lima cerca de medianoche. La etiqueta y el badge son presentacionales (SETUP.md 3.2).
- [x] Completada

### T3 — Esquema, migración y reglas de negocio (docs)
- Archivos: `db/schema.ts` (modificar), `drizzle/0018_*.sql` (crear, generado), `drizzle/meta/0018_snapshot.json` (crear, generado), `drizzle/meta/_journal.json` (modificar, generado), `docs/reglas-negocio-itse.md` (modificar)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-6, AC-14
- Detalle: tabla `certificados` con `uniqueIndex` en `expediente_id`, `numero` y `codigo`; exportar `type Certificado = typeof certificados.$inferSelect`. Docs según AC-14.
- Tests: no aplica (esquema generado y documentación; SETUP.md 3.2).
- [x] Completada

### T4 — Máquina de estados y acceso
- Archivos: `modules/expedientes/utils/transiciones.ts` (modificar), `modules/expedientes/utils/transiciones.test.ts` (modificar), `modules/certificados/utils/certificado-acceso.ts` (crear), `modules/certificados/utils/certificado-acceso.test.ts` (crear)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-4, AC-7
- Detalle: `FLUJO` suma `CUMPLE: [CERTIFICADO_PENDIENTE_FIRMA]`; el destino entra en `DESTINOS_CON_FLUJO_PROPIO`. No tocar `ESTADOS_FINALES` ni `SOLO_SUPERADMIN`.
- Tests: matriz 18 × 18 actualizada rol por rol; tabla de `certificadoDescargable` para los 18 estados × 3 roles.
- [x] Completada

### T5 — Servicio del certificado (generar, resumen)
- Archivos: `modules/certificados/services/certificado.service.ts` (crear), `modules/certificados/services/certificado.service.test.ts` (crear)
- Depende de: T1, T2, T3, T4
- Grupo paralelo: G2
- Cubre: AC-8, AC-10
- Tests: cliente rechazado; orden de resultados; `db.batch` una sola vez en `ok`; ninguna llamada a `batch` en `no_permitido`/`no_encontrado`; reintento ante `23505` (hasta 3) y relanzamiento; cliente ajeno recibe `null` en el resumen; cliente propio solo en `ENTREGADO`; `codigo` ausente del resumen. `db` mockeado como en `diligencia.service.test.ts`.
- [x] Completada

### T6 — Acción y UI del detalle del personal
- Archivos: `modules/certificados/actions/certificado.actions.ts` (crear), `modules/certificados/actions/certificado.actions.test.ts` (crear), `modules/certificados/components/PanelCertificado.tsx` (crear), `modules/certificados/components/GenerarCertificadoButton.tsx` (crear), `app/panel/expedientes/[id]/page.tsx` (modificar)
- Depende de: T5
- Grupo paralelo: G3
- Cubre: AC-11, AC-12, AC-13
- Detalle: `PanelCertificado` es un Server Component (llama a `getResumenCertificado`); `GenerarCertificadoButton` es el único `"use client"` (botón con `useActionState`). `page.tsx` agrega `<PanelCertificado />` junto a `PanelInspeccion` como hijo de `AccionesExpediente`. Las specs 2 y 3 amplían `PanelCertificado`.
- Tests: `certificado.actions.test.ts` — `requireRole` primero, id no uuid, mapeo de mensajes, revalidación solo en éxito, servicio invocado con el usuario de `requireRole`. Los componentes son presentacionales (SETUP.md 3.2).
- [x] Completada

## Grupos paralelos
- G1: T1, T2, T3, T4 (archivos disjuntos). G2: T5 (consume los contratos de G1). G3: T6.

## Fases siguientes
- Spec 2 `certificado-resolucion-entrega`: aprobación del superadmin con Resolución Gerencial generada, `FINALIZADO` y envío al cliente (`ENTREGADO`).
- Spec 3 `certificado-pdf-verificacion`: PDF con QR, descarga protegida y `/verificar/[codigo]`.
- Spec 4 `certificados-listados`: certificados por vencer y «Mis certificados».
