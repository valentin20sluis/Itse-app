# Resolución de no cumple: pendientes de Jefatura, panel y vista del cliente

Estado: approved

Parte 2 de 2. **Depende de `resolucion-no-cumple` completa** (servicio, acción, `PanelResolucionNoCumple`, `getResolucionNoCumplePdfData`, ruta del PDF) y, para su T4, de `certificado-pdf-verificacion` T6 completa (comparten `ExpedienteDetalleCliente.tsx` y la página del cliente).

## Objetivo
Hacer visible el motor de la parte 1: los expedientes en `NO_CUMPLE` (derivación automática a Jefatura) aparecen en la lista de pendientes del superadmin junto a los que esperan aprobación; el panel del expediente muestra la resolución de no cumple; y el cliente ve y descarga la resolución solo cuando el admin se la envió (`ENTREGADO`).

## Fuera de alcance
- Cualquier cambio de la máquina de estados, del esquema o de los PDF (parte 1).
- Notificaciones; un contador de pendientes en el menú; un filtro de varios estados elegido por el usuario.
- Mostrar nombres del personal al cliente (el historial del cliente sigue sin ellos, comentarios neutros).

## Decisiones (a confirmar al aprobar)
1. **Filtro mínimo coherente:** un parámetro nuevo `pendientes=jefatura` en la bandeja equivale a `estado IN (ENVIADO_JEFATURA, CERTIFICADO_PENDIENTE_FIRMA, NO_CUMPLE)`: todo lo que espera una acción del superadmin (aprobar expediente, aprobar certificado, generar resolución de no cumple). Si llega junto con `estado`, gana `pendientes`. El parámetro inválido se ignora (misma política `.catch(undefined)` del schema). El ítem de menú «Por aprobar» y el botón «Pendientes de Jefatura» de `BandejaView` apuntan a `?pendientes=jefatura`. Descartado: lista de estados en la URL (más superficie de validación) y un ítem de menú por estado.
2. **Quién ve qué:** el botón de acceso rápido lo ven admin y superadmin (hoy ya es así); el admin ve en esa lista lo que está con Jefatura, lo cual sirve para saber qué espera.
3. **Cliente:** un bloque «Resolución de no cumple» solo en `ENTREGADO`, con la fecha y un enlace de descarga a `/api/expedientes/<id>/resolucion`. Sin número de resolución visible antes de `ENTREGADO`; el número solo aparece en el PDF descargado. Antes de `ENTREGADO` el cliente ve únicamente el estado y los comentarios neutros del historial.

## Reutilización
- Existente que se reutiliza: `PanelResolucionNoCumple` (parte 1); `getResolucionNoCumplePdfData` (parte 1; el cliente solo recibe `null` o datos si es dueño y `ENTREGADO`); la ruta de descarga de la parte 1; `buttonVariants`; `formatFecha`; patrón `catch(undefined)` de `filtros-bandeja.schema.ts`; `findNavItem`/`isActivePath` (sin cambios).
- Existente que se extiende: `filtros-bandeja.schema.ts` (+`pendientes`); `bandeja.service.ts` (`where` con `inArray`); `nav-items.ts` (href de «Por aprobar»); `BandejaView.tsx` (href del botón y paginación que conserva `pendientes`); `app/panel/expedientes/[id]/page.tsx` (+`PanelResolucionNoCumple`); `ExpedienteDetalleCliente.tsx` y la página `app/mi-cuenta/expedientes/[id]/page.tsx` (+bloque del cliente).
- Nuevo (y por qué): `ResolucionNoCumpleCliente.tsx` (la vista del cliente de `CertificadoCliente` es de certificados y exige fila en `certificados`).
- Dependencias / componentes shadcn a instalar: ninguno. Sin migración.

## Specs afectadas
- `bandeja-estados` y `layouts-por-rol`: href del ítem «Por aprobar» y del acceso rápido; la bandeja gana un filtro.
- `aprobacion-jefatura`: «Por aprobar» deja de listar solo `ENVIADO_JEFATURA`.
- `certificado-pdf-verificacion`: T6 modifica `ExpedienteDetalleCliente.tsx` y la página del cliente antes que esta parte (orden obligatorio, ver T4). Sin otro cambio.
- `certificados-listados`: sin cambio.

## Criterios de aceptación
- AC-1 (filtro): `filtrosBandejaSchema.parse({ pendientes: "jefatura" })` conserva `pendientes: "jefatura"`; cualquier otro valor (`""`, `"x"`, arreglo) da `pendientes: undefined`; `estado` y `q` siguen igual.
- AC-2 (servicio): `listExpedientesPanel(actor, { pendientes: "jefatura", page: 1 })` lanza `No autorizado` para `cliente`; con `pendientes` filtra por `ENVIADO_JEFATURA`, `CERTIFICADO_PENDIENTE_FIRMA` y `NO_CUMPLE` (y por ninguno más; nunca incluye `BORRADOR`); si vienen `estado` y `pendientes`, gana `pendientes`; el conteo (`total`) usa el mismo `where`.
- AC-3 (menú y bandeja): «Por aprobar» (rol `superadmin`) apunta a `/panel/expedientes?pendientes=jefatura`; el botón «Pendientes de Jefatura» apunta a la misma URL; los enlaces de paginación conservan `pendientes`; con `pendientes` activo se muestra «Limpiar». Sin `h-` menor que `h-11` en controles táctiles; solo tokens del tema.
- AC-4 (panel del personal): la página `/panel/expedientes/[id]` renderiza `PanelResolucionNoCumple` con `usuario`, `expedienteId` y `estado`; el admin en `NO_CUMPLE` ve «Esperando resolución de Jefatura.»; el superadmin ve el botón; ambos ven «Enviar al cliente» en `FINALIZADO` (botón existente). `PanelCertificado` no cambia.
- AC-5 (cliente): `/mi-cuenta/expedientes/[id]` muestra el bloque de `ResolucionNoCumpleCliente` solo cuando `getResolucionNoCumplePdfData(usuario, id)` devuelve datos (o sea: dueño y `ENTREGADO`); en `NO_CUMPLE`, `FINALIZADO` o `ANULADO`, o de otro usuario, no se muestra nada ni el número. El enlace es `/api/expedientes/<id>/resolucion` con `download`. Un cliente ajeno ve el 404 de siempre en la página y en la ruta (IDOR sin cambios).
- AC-6 (historial del cliente): el cliente ve «No cumple», «Finalizado» (comentario neutro de la parte 1, sin número ni nombre) y «Entregado»; nunca el nombre del personal (`actorNombre` sigue `undefined` para el cliente).
- AC-7 (verificación pública y listados): para un expediente de no cumple no existe fila en `certificados`: `/verificar/[codigo]` no lo encuentra y `/panel/certificados` y `/mi-cuenta/certificados` no lo listan (verificado por lectura de sus consultas, que parten de `certificados`; sin cambios de código).
- AC-8: `npm run build`, `npm run lint` y `npx vitest run` pasan; sin `any`/`@ts-ignore`.

## Tareas
### T1 — Filtro de pendientes de Jefatura
- Archivos: `modules/expedientes/schemas/filtros-bandeja.schema.ts` (modificar), `modules/expedientes/schemas/filtros-bandeja.schema.test.ts` (modificar), `modules/expedientes/services/bandeja.service.ts` (modificar), `modules/expedientes/services/bandeja.service.test.ts` (modificar)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-1, AC-2
- Tests: `filtros-bandeja.schema.test.ts` (AC-1); `bandeja.service.test.ts` (AC-2).
- [x] Completada

### T2 — Menú y acceso rápido
- Archivos: `modules/navigation/constants/nav-items.ts` (modificar), `modules/navigation/utils/nav-utils.test.ts` (modificar), `modules/expedientes/components/BandejaView.tsx` (modificar)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-3
- Detalle: el type de `BandejaView` ya recibe `FiltrosBandeja`; `href()` suma `pendientes`; `hayFiltros` lo considera.
- Tests: `nav-utils.test.ts` (href del ítem «Por aprobar»). `BandejaView` es presentacional (SETUP.md 3.2).
- [x] Completada

### T3 — Panel del expediente (personal)
- Archivos: `app/panel/expedientes/[id]/page.tsx` (modificar), `app/panel/expedientes/[id]/page.test.tsx` (modificar)
- Depende de: `resolucion-no-cumple` completa
- Grupo paralelo: G1
- Cubre: AC-4
- Detalle: agrega `<PanelResolucionNoCumple … />` dentro de `AccionesExpediente`, junto a `PanelCertificado`.
- Tests: el `page.test.tsx` existente mockea `PanelResolucionNoCumple` (como `PanelCertificado`) y verifica que se pasan `usuario`, `expedienteId` y `estado`.
- [x] Completada

### T4 — Bloque del cliente
- Archivos: `modules/certificados/components/ResolucionNoCumpleCliente.tsx` (crear), `modules/expedientes/components/ExpedienteDetalleCliente.tsx` (modificar), `app/mi-cuenta/expedientes/[id]/page.tsx` (modificar), `app/mi-cuenta/expedientes/[id]/page.test.tsx` (modificar)
- Depende de: `resolucion-no-cumple` completa y `certificado-pdf-verificacion` T6 completa
- Grupo paralelo: G2
- Cubre: AC-5, AC-6, AC-7
- Detalle: la página suma `getResolucionNoCumplePdfData(usuario, id)` al `Promise.all` y pasa solo `{ resolucionAt }` (no el número ni el objeto completo) al componente por una prop opcional.
- Tests: `page.test.tsx` — con datos se pasa la prop; con `null` no; sin número en las props. El componente es presentacional (SETUP.md 3.2).
- [x] Completada

## Grupos paralelos
- G1: T1, T3 (archivos disjuntos). G2: T2, T4 (disjuntos; T2 consume T1; T4 consume la parte 1 y `certificado-pdf-verificacion` T6).
