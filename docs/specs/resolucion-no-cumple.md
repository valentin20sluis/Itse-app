# Resolución de no cumple: motor (NO_CUMPLE → FINALIZADO → ENTREGADO)

Estado: approved

Parte 1 de 2. La parte 2 es `resolucion-no-cumple-bandeja-cliente` (bandeja de pendientes de Jefatura, menú, bloque del cliente y cableado de la página del panel). **Depende de `certificado-resolucion-entrega` (hecha)**. Puede implementarse en paralelo con `certificado-pdf-verificacion` y `certificados-listados`: ninguna de las dos toca los archivos de esta parte (verificado por sus listas de archivos). Quien comparte archivos con `certificado-pdf-verificacion` es la parte 2 (ver allí).

## Objetivo
Cuando la inspección termina en `NO_CUMPLE`, el expediente deja de ser un callejón sin salida: queda a la espera de **Jefatura (superadmin)**, que genera la **Resolución de no cumple** (documento con número propio `RG-AAAA-NNNN`, sin certificado). El expediente pasa a `FINALIZADO` (de vuelta con el admin) y el **admin** la envía al cliente (`ENTREGADO`); solo entonces el cliente la ve y la descarga. Esta parte entrega el motor (esquema, máquina de estados, servicio, PDF y acción con su panel); la parte 2 lo hace visible en la bandeja, el menú y la vista del cliente.

## Fuera de alcance
- Certificado, QR, código de verificación o vigencia para estos expedientes (no hay certificado).
- Cambiar cómo se llega a `NO_CUMPLE` (diligencia, subsanación) ni sus comentarios de historial.
- Rechazar o editar la resolución, regenerarla con otro número, guardar el PDF (se arma al vuelo).
- Estado nuevo en el enum (`NO_CUMPLE_RESUELTO` o similar): se reutilizan los existentes.
- Correo o SMS de aviso; firma digital real; botón de «derivar» (la derivación es automática, ver decisión 2).
- Reabrir o reiniciar trámite desde un `NO_CUMPLE`: el administrado inicia una solicitud nueva (`reglas-negocio` 5.9).

## Decisiones (a confirmar al aprobar)
1. **Mapa de estados (reutiliza los del flujo exitoso):** `NO_CUMPLE → FINALIZADO` (solo superadmin; «Generar resolución de no cumple», con confirmación) y `FINALIZADO → ENTREGADO` (admin o superadmin, el botón «Enviar al cliente» existente, sin tocarlo). `FINALIZADO` queda con dos lecturas según haya o no certificado: «oficina terminó su parte, falta enviar». `NO_CUMPLE` conserva `ANULADO` (superadmin) y gana `FINALIZADO` como única otra salida. Alternativa descartada: estado nuevo (migración de enum, y habría que repetir `ENTREGADO`, badges, filtros y PDF).
2. **«Derivación automática» no es una transición ni un botón:** `NO_CUMPLE` ya es el estado que representa «espera la resolución de Jefatura». Lo automático se materializa en la parte 2 (los `NO_CUMPLE` aparecen en la lista de pendientes del superadmin) y en el panel (el admin ve «Esperando resolución de Jefatura»). Cero código de derivación. Los comentarios de historial que escribe esta spec son neutros y automáticos (sin nombres, sin número ni fechas).
3. **Dónde se guarda número y fecha: dos columnas nuevas en `expedientes`** (`resolucion_no_cumple_numero` texto único nulo, `resolucion_no_cumple_at` timestamptz nulo). Son además la **marca explícita** «este expediente tiene resolución de no cumple» (`numero IS NOT NULL`); no se deduce del historial. Menor migración posible (2 `ADD COLUMN` + 1 índice único). Descartado: generalizar `certificados` (`numero`, `codigo` son `NOT NULL` y únicos, y las specs de listados y verificación pública leen esa tabla: ensuciaría ambas con filas «no certificado»); tabla propia (más migración, un join más, sin ganancia real para 1 fila por expediente). Riesgo a tener presente: `getExpedienteDetalle` hace `select expediente: expedientes` completo, por lo que las columnas viajan en el objeto del expediente también para el cliente; AC-9 exige que ningún componente del cliente las renderice antes de `ENTREGADO`.
4. **Numeración `RG-AAAA-NNNN` compartida:** la Resolución de no cumple y la Resolución Gerencial del flujo exitoso son el mismo tipo de documento y comparten correlativo anual. El correlativo pasa a ser `max + 1` sobre **la unión** de `certificados.resolucion_numero` y `expedientes.resolucion_no_cumple_numero`, en un fragmento SQL compartido (también lo usa `aprobarCertificado`). Cada tabla tiene su índice único (reintento ante `23505`, hasta 3); no existe unicidad entre tablas. `// ponytail:` carrera cruzada posible solo si una aprobación de certificado y una resolución de no cumple del mismo año se confirman en el mismo instante; si importa, tabla única de resoluciones. **Necesita confirmación humana.**
5. **Bloqueo del establecimiento (`ESTADOS_NO_BLOQUEANTES`):** `NO_CUMPLE` **sale** de la lista. Un expediente sigue en curso hasta `ENTREGADO` o `ANULADO`: mientras la resolución no se haya enviado al cliente no se puede abrir una solicitud nueva sobre el mismo establecimiento. Tras `ENTREGADO` el establecimiento queda libre (ya era así). Efecto: los `NO_CUMPLE` ya existentes bloquean su establecimiento hasta que el superadmin los procese o los anule. **Necesita confirmación humana** (alternativa: dejar `NO_CUMPLE` libre y bloquear solo desde `FINALIZADO`, que ya bloquea).
6. **Quién:** generar = solo `superadmin` (`reglas-negocio` 11); enviar = `admin` o `superadmin`. El superadmin que aprobó o registró el `NO_CUMPLE` puede generar la resolución (no hay separación de funciones en este MVP, igual que con el certificado).
7. **Documento:** se reutiliza `ResolucionDocument` y la ruta `GET /api/expedientes/[id]/resolucion` con una variante de texto «NO CUMPLE»: sin vigencia, sin número ni mención de certificado. La ruta prueba primero la resolución con certificado y, si devuelve `null`, la de no cumple. Visibilidad: cliente solo en `ENTREGADO`, personal desde `FINALIZADO` (`certificadoDescargable`), mismo 404 para el resto.
8. **Verificación pública y listados:** sin cambios. Ambas leen `certificados` (por código o con `emitido_at`); un expediente sin fila de certificado nunca aparece ahí. Solo se deja constancia en «Specs afectadas».

## Reutilización
- Existente que se reutiliza: `aplicar` (con `extras`, atomicidad y control optimista) de `transicion.service.ts`; `puedeTransicionar`; `ejecutarCertificado`/`ID_INVALIDO` de `ejecutar-certificado.ts` (traduce resultados y revalida las 6 rutas); `requireRole`; `ActionResult`; `formatNumeroResolucion`/`esNumeroResolucion`; `certificadoDescargable`; `codigoPg`, `getAnioLima`, `MAX_INTENTOS_NUMERO`; patrón del `AlertDialog` de `AprobarCertificadoButton`; patrón de `resolucion-pdf.service.ts`; `RIESGO_LABELS`, `formatFecha`.
- Existente que se extiende: `db/schema.ts` (+2 columnas en `expedientes`); `transiciones.ts` (`FLUJO` y `SOLO_SUPERADMIN`); `establecimiento.service.ts` (`ESTADOS_NO_BLOQUEANTES`); `aprobacion.service.ts` (usa el fragmento compartido); `resolucion-pdf.service.ts`, `ResolucionDocument.tsx` y la ruta (variante no cumple); `docs/reglas-negocio-itse.md`.
- Nuevo (y por qué): `resolucion-siguiente.ts` (el correlativo compartido no cabe en `resolucion-numero.ts`, que es puro y sin SQL); `resolucion-no-cumple.service.ts` (la atomicidad estado + número de la resolución no cabe en `aprobacion.service.ts`, que es de certificados); `resolucion-no-cumple.actions.ts`, `GenerarResolucionNoCumpleButton.tsx` y `PanelResolucionNoCumple.tsx` (el panel de certificado se oculta cuando no hay fila en `certificados`, y la spec 3 de certificados también lo modifica).
- Dependencias / componentes shadcn a instalar antes de implementar: ninguno.
- **Migración `0020`** (verificado: existen `0000` a `0019`; el developer la genera en T1 con `DATABASE_URL="postgres://u:p@localhost/db" npm run db:generate`, el humano corre `npm run db:migrate`): `ALTER TABLE "expedientes" ADD COLUMN "resolucion_no_cumple_numero" text`, `ADD COLUMN "resolucion_no_cumple_at" timestamp with time zone` y `CREATE UNIQUE INDEX "expedientes_resolucion_no_cumple_numero_uidx"`. Solo agrega; no toca el enum ni `certificados`. Precondición: `0018` y `0019` ya generadas (están en el árbol de trabajo sin commitear) y el journal consistente.

## Specs afectadas
- `certificado-resolucion-entrega` (hecha): `aprobacion.service.ts` cambia solo el origen del correlativo (fragmento compartido); su AC-5 y su AC-4 siguen verdaderos. La ruta y el PDF de la Resolución ganan una variante; `getResolucionPdfData` no cambia. Su tabla 6.1 (`FINALIZADO`, `ENTREGADO`) se reinterpreta como en la decisión 1.
- `certificado-pdf-verificacion` (en curso por otro agente): ningún cambio requerido. `verificacion.service` y `getCertificadoPdfData` parten de `certificados`, por lo que un expediente de no cumple no existe para ellos. Su T6 (`PanelCertificado.tsx`, `ExpedienteDetalleCliente.tsx`, página del cliente) comparte archivos con la parte 2 de esta spec: la parte 2 se implementa **después** de su T6.
- `certificados-listados` (en curso): ningún cambio requerido; sus consultas hacen join con `certificados` con `emitido_at`.
- `establecimientos`/`solicitud-itse-wizard` (regla de un solo expediente en curso): efecto de la decisión 5 (`NO_CUMPLE` bloquea). El texto de la UI del paso 1 no cambia.
- `docs/reglas-negocio-itse.md` 4, 5, 6, 6.1, 9 y 11 (AC-11).

## Criterios de aceptación
- AC-1 (esquema): `expedientes` suma `resolucionNoCumpleNumero` (texto, único, nulo) y `resolucionNoCumpleAt` (timestamptz, nulo); migración `0020` que solo hace `ADD COLUMN` e índice único; `estadoExpedienteEnum` y `certificados` no cambian (grep).
- AC-2 (máquina pura): `transicionesPermitidas("NO_CUMPLE", "admin")` es `[]`; para superadmin `["FINALIZADO", "ANULADO"]` (cualquier orden); `("NO_CUMPLE", "cliente")` es `[]`. `transicionesGenericas("NO_CUMPLE", "superadmin")` es `["ANULADO"]` (no incluye `FINALIZADO`, flujo propio). `("FINALIZADO", "admin")` sigue siendo `["ENTREGADO"]`. `puedeTransicionar("NO_CUMPLE", "FINALIZADO", "admin")` es `false`. La matriz completa de `transiciones.test.ts` falla si algún par no listado es permitido. `cambiarEstado(superadmin, id, { hasta: "FINALIZADO" })` sigue devolviendo `no_permitido` (flujo propio) sin `db.batch`.
- AC-3 (bloqueo): `ESTADOS_NO_BLOQUEANTES` es `["BORRADOR", "ANULADO", "ENTREGADO", "DERIVADO_COMERCIALIZACION"]` (sin `NO_CUMPLE`); un establecimiento con un expediente en `NO_CUMPLE` o `FINALIZADO` aparece ocupado y uno con `ENTREGADO` aparece libre.
- AC-4 (fragmento del correlativo): `resolucionSiguiente(2026)` genera SQL (`PgDialect().sqlToQuery`) que consulta `certificados.resolucion_numero` **y** `expedientes.resolucion_no_cumple_numero` con el patrón `RG-2026-%`, y su `max + 1` cubre las dos. `aprobarCertificado` lo usa (grep: ya no define su propia versión) y su comportamiento observable (un `db.batch`, reintentos ante `23505`) no cambia.
- AC-5 (generar, servicio): `generarResolucionNoCumple(actor, id, ahora?)` lanza `Error("No autorizado")` para `cliente`; para `admin` devuelve `no_permitido` sin `db.batch`. Para superadmin, en orden: `no_encontrado` → `no_permitido` (estado distinto de `NO_CUMPLE`, o `resolucionNoCumpleNumero` no nulo, o `!puedeTransicionar`) → `conflicto` → `ok`. En `ok`: **un** `db.batch` vía `aplicar` (`NO_CUMPLE → FINALIZADO`) cuyo `extras` hace `UPDATE expedientes SET resolucion_no_cumple_numero = <RG-AAAA-NNNN>, resolucion_no_cumple_at = ahora WHERE id = :id AND resolucion_no_cumple_numero IS NULL`, condicionado a que el UPDATE del estado ganó; comentario del historial `COMENTARIO_RESOLUCION_NO_CUMPLE` = «Resolución de no cumple generada. Pendiente de entrega.» (neutro, sin número ni nombre). Ante `23505` reintenta hasta 3 veces y relanza después. Sin `ok`/`conflicto` no se invoca `db.batch`. Doble clic: el segundo intento devuelve `conflicto` y no cambia el número. No inserta ni modifica `certificados` (grep).
- AC-6 (acción): `generarResolucionNoCumpleAction(id)` llama `requireRole("superadmin")` primero, valida `id` como uuid (`ID_INVALIDO` si no), pasa al servicio el usuario de `requireRole` y devuelve vía `ejecutarCertificado` los mismos mensajes; revalida las rutas solo en éxito. Un admin que invoque la acción directamente es rechazado en servidor por `requireRole`, sin llegar al servicio.
- AC-7 (datos del PDF): `getResolucionNoCumplePdfData(actor, expedienteId)` devuelve `null` si el expediente no existe, `resolucionNoCumpleNumero` o `resolucionNoCumpleAt` son nulos, `!certificadoDescargable(actor.rol, estado)`, o (cliente) el expediente no es suyo (mismo `null` que inexistente, sin distinguir). Si no, devuelve `tipo: "NO_CUMPLE"`, `resolucionNumero`, `resolucionAt`, `expedienteNumero`, `solicitante` (`nombre`, `razonSocial`), `establecimiento` (`nombreComercial`, `direccion`, `distrito`, `giro`), `nivelRiesgo` y `jefeNombre` (usuario que llevó el expediente a `FINALIZADO`, o `null`). No incluye `codigo`, certificado, vigencia, documento, teléfono ni correo. Cliente solo en `ENTREGADO`; personal en `FINALIZADO` y `ENTREGADO`; ningún rol en `NO_CUMPLE` ni `ANULADO`.
- AC-8 (ruta y documento): `GET /api/expedientes/[id]/resolucion`: 401 sin usuario o inactivo; 404 para id no uuid y cuando **ambos** servicios devuelven `null` (cuerpo y estado idénticos a los de la resolución con certificado); 200 `application/pdf`, `Content-Disposition: attachment; filename="resolucion-RG-2026-0001.pdf"`, `Cache-Control: private, no-store`, cuerpo que empieza con `%PDF`. Para un expediente con certificado el comportamiento previo no cambia. `ResolucionDocument` con datos `tipo: "NO_CUMPLE"` contiene «Resolución Gerencial», número, fecha, texto llano que declara que el establecimiento **no cumple** las condiciones de seguridad exigidas, solicitante (y razón social), establecimiento (dirección, distrito, giro, nivel de riesgo), referencia al expediente, firma «Jefe de GRDyDC», pie «Proyecto académico. Documento sin validez oficial.»; **sin** vigencia, fecha de vencimiento ni referencia a un certificado emitido; tildes correctas. La variante de certificado no cambia. `@react-pdf/renderer` solo se importa donde hoy (grep).
- AC-9 (panel del personal e IDOR del cliente): `PanelResolucionNoCumple` (para personal): en `NO_CUMPLE` el superadmin ve «Generar resolución de no cumple» (`h-11`) con `AlertDialog` («Se generará la Resolución de no cumple de este expediente. No se emitirá certificado y esta acción no se puede deshacer.»); el admin ve «Esperando resolución de Jefatura.» sin botón. En `FINALIZADO` con resolución: número, fecha y «Resolución de no cumple generada. Falta enviarla al cliente.» (el envío es el botón «Enviar al cliente» de `AccionesExpediente`). En `ENTREGADO`: «Enviada al cliente.». No renderiza nada si el expediente tiene certificado o está en otro estado; nunca se renderiza para `cliente` (el rol se comprueba dentro). Errores en `role="alert"`; foco visible; solo tokens del tema. Verificación de lectura: ningún componente de `mi-cuenta` renderiza `resolucionNoCumple*` antes de `ENTREGADO` (grep).
- AC-10 (atomicidad y roles, resumen): no existe camino que cambie el estado a `FINALIZADO` sin la resolución (un solo `aplicar`); el cliente nunca invoca estas acciones; `admin` no puede pasar `NO_CUMPLE → FINALIZADO` ni por la acción genérica (`no_permitido`) ni por la dedicada (`requireRole`).
- AC-11 (docs): `docs/reglas-negocio-itse.md`: 4 (la lista de estados que no bloquean quita `NO_CUMPLE`); 5.9 (el no cumple se deriva a Jefatura, que genera la Resolución de no cumple; el admin la envía; no hay certificado; el administrado inicia un trámite nuevo); tabla 6 (`NO_CUMPLE`: «Informe desfavorable registrado; en espera de la Resolución de no cumple de Jefatura; no se emite certificado»; `FINALIZADO` y `ENTREGADO` cubren también la resolución de no cumple); 6.1 (`NO_CUMPLE → FINALIZADO [solo superadmin; genera la Resolución de no cumple]`, se quita la nota «NO_CUMPLE es estado final»); 9 (subsección «Resolución de no cumple»: sin certificado, número `RG-AAAA-NNNN` compartido con la Resolución Gerencial, visible al cliente solo en `ENTREGADO`); 11 (generar la resolución de no cumple: superadmin; enviar al cliente: admin y superadmin; descargar la resolución: cliente solo tras el envío).
- AC-12: `npm run build`, `npm run lint` y `npx vitest run` pasan; sin `any`/`@ts-ignore`; solo tokens del tema.

## Tareas
### T1 — Esquema, migración y documentación
- Archivos: `db/schema.ts` (modificar), `drizzle/0020_*.sql` (crear, generado), `drizzle/meta/0020_snapshot.json` (crear, generado), `drizzle/meta/_journal.json` (modificar, generado), `docs/reglas-negocio-itse.md` (modificar)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-1, AC-11
- Detalle: columnas con el índice único `expedientes_resolucion_no_cumple_numero_uidx` (patrón de `certificados`). Docs según AC-11.
- Tests: no aplica (esquema generado y documentación; SETUP.md 3.2).
- [ ] Completada

### T2 — Máquina de estados y bloqueo del establecimiento
- Archivos: `modules/expedientes/utils/transiciones.ts` (modificar), `modules/expedientes/utils/transiciones.test.ts` (modificar), `modules/establecimientos/services/establecimiento.service.ts` (modificar), `modules/establecimientos/services/establecimiento.service.test.ts` (modificar), `modules/expedientes/services/expediente.service.test.ts` (modificar)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-2, AC-3
- Detalle: `FLUJO.NO_CUMPLE = ["FINALIZADO"]`; `SOLO_SUPERADMIN` suma el par `NO_CUMPLE → FINALIZADO`; `FINALIZADO` ya está en `DESTINOS_CON_FLUJO_PROPIO` (no tocar). `ESTADOS_NO_BLOQUEANTES` sin `NO_CUMPLE`. `expediente.service.test.ts` solo actualiza su mock de la lista (línea 124) y los casos que dependan de `NO_CUMPLE`; `expediente.service.ts` no cambia (deriva la lista).
- Tests: `transiciones.test.ts` (matriz y casos de AC-2, actualizando los pares de `NO_CUMPLE`); `establecimiento.service.test.ts` y `expediente.service.test.ts` (AC-3: `NO_CUMPLE` y `FINALIZADO` ocupan, `ENTREGADO` libera).
- [ ] Completada

### T3 — Correlativo compartido de resoluciones
- Archivos: `modules/certificados/utils/resolucion-siguiente.ts` (crear), `modules/certificados/utils/resolucion-siguiente.test.ts` (crear), `modules/certificados/services/aprobacion.service.ts` (modificar), `modules/certificados/services/aprobacion.service.test.ts` (modificar)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-4
- Detalle: extrae `resolucionSiguiente(anio)` de `aprobacion.service.ts`, ahora con el máximo de ambas tablas (misma forma `RG-AAAA-NNNN`, `lpad` a 4 mínimo), y lo exporta; `aprobacion.service.ts` lo importa y borra su copia privada. Sin cambio de comportamiento observable.
- Tests: `resolucion-siguiente.test.ts` (SQL generado referencia ambas tablas y el patrón del año); `aprobacion.service.test.ts` solo se ajusta si el mock lo exige, sin debilitar sus casos.
- [ ] Completada

### T4 — Servicio de generación de la resolución de no cumple
- Archivos: `modules/certificados/services/resolucion-no-cumple.service.ts` (crear), `modules/certificados/services/resolucion-no-cumple.service.test.ts` (crear)
- Depende de: T2, T3
- Grupo paralelo: G3
- Cubre: AC-5, AC-10
- Detalle: sigue la forma de `aprobarCertificado` (lectura del expediente, validaciones en orden, bucle de reintento, `aplicar` con `extras`), pero sin `certificados`. Exporta `COMENTARIO_RESOLUCION_NO_CUMPLE`.
- Tests: cliente rechazado, admin `no_permitido` sin `batch`, orden de resultados, `ok` con un solo `db.batch`, comentario neutro, reintento ante `23505` (hasta 3) y relanzamiento, `conflicto`, segundo intento sin cambiar número. `db` mockeado como en `aprobacion.service.test.ts`.
- [ ] Completada

### T5 — Datos, documento y ruta del PDF (variante no cumple)
- Archivos: `modules/certificados/services/resolucion-pdf.service.ts` (modificar), `modules/certificados/services/resolucion-pdf.service.test.ts` (modificar), `modules/certificados/components/ResolucionDocument.tsx` (modificar), `app/api/expedientes/[id]/resolucion/route.ts` (modificar), `app/api/expedientes/[id]/resolucion/route.test.ts` (modificar)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-7, AC-8
- Detalle: agrega `getResolucionNoCumplePdfData` y su tipo (`tipo: "NO_CUMPLE"`) en el mismo archivo; `ResolucionDocument` acepta la unión y ramifica por `tipo` (la variante de certificado mantiene su texto); la ruta usa `await getResolucionPdfData(...) ?? await getResolucionNoCumplePdfData(...)`. El nombre de archivo de descarga usa `resolucionNumero` en ambos casos.
- Tests: `resolucion-pdf.service.test.ts` (casos de AC-7: cada `null`, cliente propio solo en `ENTREGADO` y ajeno `null`, personal en `FINALIZADO`, `NO_CUMPLE` y `ANULADO` `null`, `jefeNombre` nulo, ausencia de campos sensibles); `route.test.ts` (401, 404 si ambos `null`, 200 con la variante de no cumple y cabeceras, y el caso previo con certificado intacto; `renderToBuffer` mockeado). El documento es presentacional (SETUP.md 3.2).
- [ ] Completada

### T6 — Acción y panel de la resolución de no cumple
- Archivos: `modules/certificados/actions/resolucion-no-cumple.actions.ts` (crear), `modules/certificados/actions/resolucion-no-cumple.actions.test.ts` (crear), `modules/certificados/components/GenerarResolucionNoCumpleButton.tsx` (crear), `modules/certificados/components/PanelResolucionNoCumple.tsx` (crear)
- Depende de: T4, T5
- Grupo paralelo: G4
- Cubre: AC-6, AC-9
- Detalle: la acción replica `aprobarCertificadoAction`. El botón es `"use client"` (`useActionState` + `AlertDialog`, patrón de `AprobarCertificadoButton`). `PanelResolucionNoCumple` es un Server Component `{ usuario, expedienteId, estado }`: devuelve `null` para `cliente` o fuera de `NO_CUMPLE`/`FINALIZADO`/`ENTREGADO`; en `FINALIZADO`/`ENTREGADO` lee `getResolucionNoCumplePdfData` (si `null`, no renderiza). No se cablea en la página del panel: lo hace la parte 2.
- Tests: `resolucion-no-cumple.actions.test.ts` — `requireRole("superadmin")` primero, id no uuid, mapeo de mensajes, revalidación solo en éxito, usuario de `requireRole` al servicio. Los componentes son presentacionales (SETUP.md 3.2).
- [ ] Completada

## Grupos paralelos
- G1: T1, T2 (archivos disjuntos). G2: T3, T5 (disjuntos; ambos consumen T1). G3: T4 (consume T2 y T3). G4: T6 (consume T4 y T5).

## Fases siguientes
- Fase 2: `resolucion-no-cumple-bandeja-cliente` (cablear el panel en la página del panel, «Pendientes de Jefatura» y «Por aprobar» con `NO_CUMPLE`, bloque del cliente en `ENTREGADO`).
