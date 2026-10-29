# Inicio del cliente (`/mi-cuenta`)

Estado: approved

Spec única de 6 tareas (cabe sin dividir). Depende de specs ya implementadas: `layouts-por-rol` (shell y menú del cliente), `mis-expedientes`, `expediente-detalle-cliente`, `certificados-listados`, `subsanacion-requisitos`, `observaciones-diligencia`, `subsanacion-evidencia`, `diligencia-inspeccion`, `designacion-inspectores`, `plazos-dias-habiles`. Sigue el patrón de `dashboard-panel` (servicio agregado + vista + página fina), adaptado al cliente.

## Objetivo
Hoy `/mi-cuenta` es un placeholder estático: muestra «Aún no tienes expedientes» aunque el cliente ya tenga uno porque no lee datos. Esta spec lo convierte en el punto de partida real del administrado: lo saluda por su nombre, le dice **qué sigue en cada trámite con una acción directa**, resume sus expedientes, establecimientos y certificados con datos reales, y le da accesos rápidos coherentes con la regla «un expediente por establecimiento».

## Fuera de alcance
- Perfil del cliente (`/mi-cuenta/perfil`, otra spec).
- Notificaciones por correo/SMS, alertas en vivo (la página se calcula al abrirla).
- Renovaciones: regla pendiente (`reglas-negocio` §4). No se inventa flujo; para certificados por vencer/vencidos se reutiliza el aviso que ya existe en «Mis certificados».
- Cambios de esquema: **ninguno, sin migración** (todo sale de columnas y servicios existentes; `expedientes_usuario_id_idx` y `historial_estados_expediente_id_idx` ya cubren las consultas). La siguiente migración libre sigue siendo la `0025`.
- Pago, subida de archivos y subsanación se hacen donde ya existen (wizard y detalle del expediente); el inicio solo enlaza.
- Cambiar el menú, la barra inferior o «Nueva solicitud» del menú (siempre visible allí; no se toca).
- Datos del personal (admin/superadmin) y datos personales de inspectores: no aparecen en el inicio.

## Decisiones (a confirmar al aprobar)
1. **Estructura de la página**, de arriba abajo: (a) `PageHeader` «Hola, {nombres}» con descripción; (b) sección «Qué sigue» (una tarjeta por expediente con paso); (c) sección «Tu resumen» (3 tarjetas: Expedientes, Establecimientos, Certificados); (d) sección «Accesos rápidos». Las secciones llevan `<h2>`. El saludo conserva la regla actual: `nombres` de la BD (ya sincronizado desde Clerk) y el correo solo si `nombres` está vacío.
2. **«Qué sigue» es por expediente** y se ordena por urgencia: primero lo que requiere acción del cliente (borrador, pago, observado, subir evidencia), luego los que están en espera, al final los ya entregados; a igual urgencia, el orden del servicio (más reciente primero). Los `ANULADO` no tienen paso (ya no hay trámite y el establecimiento queda libre). Los `ENTREGADO` se muestran al final con el enlace a «Mis certificados» (no se ocultan: es el camino a la descarga).
3. **Sin consultas por inspector ni datos del personal.** No se llama a `getResumenInspeccion` (sería una consulta por expediente). En «Inspector designado» y «Inspección programada» el mensaje dice que el inspector llamará «al teléfono que registraste en tu solicitud» sin mostrar el número ni el nombre; el detalle del expediente (que ya muestra el nombre del inspector al cliente) sigue siendo el lugar para eso.
4. **Regla de «Nueva solicitud»** (un establecimiento con solicitud, en cualquier estado salvo `ANULADO`, no se puede reutilizar). «Libre» = establecimiento no archivado sin expediente en un estado que no libera (se usa `ESTADOS_QUE_LIBERAN_ESTABLECIMIENTO`, no se repite `ANULADO`). Con al menos un libre: «Nueva solicitud» es la acción principal del estado vacío y aparece en los accesos rápidos. Sin libres: «Nueva solicitud» **no se ofrece** (llevaría a un asistente con todo deshabilitado); la tarjeta Establecimientos explica «Todos tus establecimientos ya tienen una solicitud. Para solicitar otra inspección, registra otro establecimiento.» con enlace «Registrar otro establecimiento». Con cero establecimientos, tampoco se ofrece «Nueva solicitud» (esa pantalla solo redirige a registrar): el estado vacío lleva directo a «Registrar establecimiento» (**desvío intencional del ejemplo del requerimiento**, ver pregunta 1).
5. **Estados vacíos** (ver AC-8): sin establecimientos = gran estado vacío «Registra tu primer establecimiento» y no se muestra «Tu resumen» (evita dos botones iguales); con libres y sin solicitudes = «Aún no tienes solicitudes» + «Nueva solicitud»; sin certificados = texto ya usado en «Mis certificados».
6. **Certificados:** se cuentan con `listCertificadosCliente` (solo expedientes `ENTREGADO`, que es lo que el cliente puede ver). «Por vencer» = 60 días o menos (`DIAS_ALERTA_VENCIMIENTO`). Por cada certificado por vencer o vencido se muestra el aviso existente, reutilizado de «Mis certificados» (se extrae a una función compartida; el texto no cambia). Las resoluciones de no cumple no se cuentan aparte: su paso (`ENTREGADO` con resolución) ya lleva a «Mis certificados».
7. **Datos con consultas agregadas, sin N+1** (ver AC-3): se componen los servicios existentes `listOwnEstablecimientos`, `listOwnExpedientes`, `listCertificadosCliente` y se suman solo dos lecturas condicionales (motivo de la observación en una consulta para todos los observados; feriados, ya cacheados). Los avisos, direcciones y libres se derivan en memoria.
8. **Accesos rápidos** salen de `NAV_ITEMS` (etiqueta e ícono vía `findNavItem`), sin repetir textos del menú. Se muestran también en móvil aunque exista la barra inferior: el requerimiento los pide y llevan una línea de ayuda que la barra no tiene.

## Tabla estado → siguiente paso (fuente de AC-2)
`{est}` = nombre comercial del establecimiento (título de la tarjeta). Todas las fechas con `formatFecha` (Lima). Urgencia: 0 = requiere acción del cliente, 1 = en espera, 2 = terminado. Nombre accesible del enlace: `<acción> (<establecimiento>)`.

| Estado (condición) | Mensaje | Acción (destino) | Urg. |
|---|---|---|---|
| `BORRADOR`, datos incompletos | «Tu solicitud aún no está terminada. Complétala para poder enviarla.» | «Continuar» (`/mi-cuenta/nueva-solicitud?borrador=<id>`) | 0 |
| `BORRADOR`, `pagoPendiente` | «Tu solicitud está completa. Falta pagar la tasa para enviarla.» | «Pagar» (mismo destino) | 0 |
| `PRESENTADO` | «Recibimos tu solicitud. En breve la revisaremos.» | «Ver detalle» (`/mi-cuenta/expedientes/<id>`) | 1 |
| `EN_REVISION` | «Estamos revisando tus documentos. No tienes que hacer nada por ahora.» | «Ver detalle» | 1 |
| `OBSERVADO_REQUISITOS` | «Tu solicitud tiene observaciones. Corrígelas para que continúe el trámite.» + «Motivo: {último comentario de la observación}» (si existe) | «Subsanar» (detalle) | 0 |
| `ENVIADO_JEFATURA` | «Tu solicitud pasó a Jefatura para su aprobación. No tienes que hacer nada por ahora.» | «Ver detalle» | 1 |
| `APROBADO_JEFATURA` | «Jefatura aprobó tu solicitud. Falta designar al inspector.» | «Ver detalle» | 1 |
| `INSPECTOR_DESIGNADO` | «Ya hay inspector designado. Te llamará al teléfono que registraste en tu solicitud para coordinar la visita. Mantente atento.» | «Ver detalle» | 1 |
| `DILIGENCIA_PROGRAMADA` | «Tu inspección está programada para el {fecha} en {dirección}. El inspector te llamará al teléfono que registraste en tu solicitud. Mantente atento.» (sin fecha o sin dirección se omite esa parte) | «Ver detalle» | 1 |
| `EN_SUBSANACION`, ITSE posterior, sin presentar, plazo vigente | «Debes corregir las observaciones y subir tu evidencia hasta el {límite}. {Vence hoy / Quedan N días hábiles}.» | «Subir evidencia» (detalle) | 0 |
| `EN_SUBSANACION`, posterior, ya presentada | «Enviaste tu evidencia el {fecha}. La estamos evaluando.» | «Ver detalle» | 1 |
| `EN_SUBSANACION`, posterior, sin presentar, plazo vencido | «El plazo para subsanar venció el {límite}. Ya no puedes subir archivos; el personal registrará el resultado.» | «Ver detalle» | 1 |
| `EN_SUBSANACION`, ITSE previa | «Tienes hasta el {límite} para corregir las observaciones. {La inspección se reprogramó para el {fecha}. / La inspección se reprogramará.} Los inspectores volverán: no necesitas subir archivos.» | «Ver detalle» | 1 |
| `EN_SUBSANACION`, sin nivel de riesgo (dato anómalo) | «Tu inspección tiene observaciones por corregir.» | «Ver detalle» | 1 |
| `CUMPLE` | «La inspección salió favorable. Estamos preparando tu certificado.» | «Ver detalle» | 1 |
| `CERTIFICADO_PENDIENTE_FIRMA` | «Tu certificado espera la aprobación de Jefatura.» | «Ver detalle» | 1 |
| `FINALIZADO`, con certificado | «Jefatura aprobó tu certificado. Pronto te lo enviaremos para que lo descargues.» | «Ver detalle» | 1 |
| `FINALIZADO`, con resolución de no cumple | «Jefatura emitió la resolución de tu trámite. Pronto te la enviaremos.» | «Ver detalle» | 1 |
| `NO_CUMPLE` | «La inspección no salió favorable, por lo que no se emite certificado. Jefatura preparará la resolución.» | «Ver detalle» | 1 |
| `ENTREGADO`, con certificado | «Tu certificado y tu resolución están listos para descargar.» | «Ir a Mis certificados» (`/mi-cuenta/certificados`) | 2 |
| `ENTREGADO`, con resolución de no cumple | «Tu resolución está lista para descargar. No se emitió certificado.» | «Ir a Mis certificados» | 2 |
| `EN_TRAMITE_EXTERNO`, `PENDIENTE_RESOLUCION`, `DERIVADO_COMERCIALIZACION` (en desuso) | «Tu trámite sigue en proceso en la municipalidad. No tienes que hacer nada por ahora.» | «Ver detalle» | 1 |
| `ANULADO` | sin paso (`null`): no aparece en «Qué sigue»; su establecimiento queda libre | — | — |

«Con resolución de no cumple» = `resolucionNoCumpleNumero` no nulo (mismo criterio que `etiquetaEstado(..., { noCumple })`). «ITSE posterior/previa» sale de `tipoItsePorRiesgo(nivelRiesgo)`; «plazo vencido» y «días hábiles» de `estadoPlazo` con los feriados vigentes; «puede subir» de `puedeSubirEvidencia`. Nada de esto se reimplementa.

## Reutilización
- Existente que se reutiliza (sin cambios): `requireRole` (`modules/usuarios/services/authorization.service.ts`); `listOwnEstablecimientos`; `listOwnExpedientes` (ya trae `pagoPendiente`, `diligenciaProgramadaPara`, `subsanacionLimite`, `subsanacionPresentadaAt`, `nivelRiesgo`, `resolucionNoCumpleNumero`) y `ESTADOS_QUE_LIBERAN_ESTABLECIMIENTO`; `listCertificadosCliente` y `CertificadoClienteFila`; `getFeriados` (`feriado-lectura.service.ts`, cacheado); `estadoPlazo` (`dias-habiles.ts`); `puedeSubirEvidencia` (`subsanacion.ts`); `tipoItsePorRiesgo` (`riesgo.ts`); `ultimaObservacion` (`observacion.ts`, para el motivo); `formatFecha`; `etiquetaEstado` y `EstadoBadge`; `CertificadoEstadoBadge`; `DIAS_ALERTA_VENCIMIENTO`; `findNavItem` y `NAV_ITEMS`; `PageHeader`, `EmptyState`; `Card` (borde y sombra actuales, sin sobrescribirlos), `Badge`, `buttonVariants`.
- Existente que se extiende:
  - `modules/inspecciones/components/PlazoSubsanacion.tsx` — su texto «Vence hoy / Quedan N días hábiles» pasa a una función compartida (T1); salida idéntica.
  - `modules/certificados/components/CertificadosClienteView.tsx` — su `aviso()` local pasa a una función compartida (T2); salida idéntica.
  - `app/mi-cuenta/page.tsx` — reemplaza el placeholder (T6).
- Nuevo (y por qué): `modules/client-area/` gana `types`, `utils`, `services` y `components` del inicio (es el dominio «área del cliente»; nada existente compone estados, establecimientos y certificados del cliente en una sola lectura); `modules/inspecciones/utils/texto-plazo.ts` y `modules/certificados/utils/aviso-certificado.ts` (DRY: el mismo texto lo usan el detalle/«Mis certificados» y el inicio).
- Dependencias / componentes shadcn a instalar antes de implementar: ninguno.

## Specs afectadas
- `layouts-por-rol`: **AC-6** (saludo con tarjetas vacías de ejemplo y botón «Iniciar mi primera solicitud» en `/mi-cuenta`) queda superado por esta spec; el saludo «Hola, {nombres}» se conserva. Menú y rutas sin cambios.
- `certificados-listados`: el texto de aviso (vencido / por vencer) no cambia; solo se mueve a una función compartida (T2).
- `observaciones-diligencia` / `plazos-dias-habiles`: el texto de días restantes de `PlazoSubsanacion` no cambia; solo se comparte (T1).
- `mis-expedientes`, `expediente-detalle-cliente`, `subsanacion-*`: sin cambios; el inicio enlaza a sus pantallas.

## Criterios de aceptación
- AC-1 (autorización): la página llama `requireRole("cliente")` **antes** de leer datos y pasa el usuario devuelto al servicio (un `admin`/`superadmin` es redirigido por `requireRole` sin consultar nada). `getInicioCliente(actor)` lanza `Error("No autorizado")` si `actor.rol !== "cliente"` sin invocar ninguna consulta. `proxy.ts` no cambia.
- AC-2 (siguiente paso por estado): `siguientePaso` devuelve para **cada** valor de `estadoExpedienteEnum.enumValues` y cada condición de la tabla «estado → siguiente paso» exactamente el mensaje, la acción, el destino y la urgencia indicados; `ANULADO` devuelve `null`. Un test recorre todos los valores del enum y falla si se agrega un estado sin cubrir. Con `OBSERVADO_REQUISITOS` y motivo nulo no aparece la línea «Motivo». En `EN_SUBSANACION` con `subsanacionLimite` nulo se trata como plazo vencido (igual que el detalle).
- AC-3 (consultas): `getInicioCliente(actor, ahora?)` devuelve `{ pasos, expedientes, establecimientos, certificados, puedeSolicitar }` usando como máximo 6 consultas SQL constantes (independientes de la cantidad de expedientes): establecimientos (1), expedientes (1 + 1 de documentos de borradores, ya existente), certificados (1), motivos de observación (1, solo si hay expedientes `OBSERVADO_REQUISITOS`, con `inArray` sobre ids del propio cliente, unida a `expedientes` con `usuario_id = actor.id`, y sin seleccionar `usuario_id` del historial) y feriados (solo si hay `EN_SUBSANACION`). Ninguna consulta por expediente, no consulta `usuarios` ni `inspectores`, no llama a `getResumenInspeccion`.
- AC-4 (aislamiento e IDOR): todos los datos salen de servicios filtrados por `actor.id`; el servicio no recibe ids de expedientes por parámetro; la consulta de motivos solo usa ids devueltos por `listOwnExpedientes(actor)`. Test: dos clientes distintos producen lecturas con su propio `actor`, y un id de otro cliente nunca llega a la consulta de motivos.
- AC-5 (privacidad): el resultado y la vista no contienen nombres, correos ni teléfonos de inspectores o del personal, ni el número de teléfono del solicitante, ni `file_key` ni URLs de archivos. El motivo mostrado es solo el texto `comentario` de la observación (lo mismo que ya ve el cliente en el detalle).
- AC-6 (resumen): `resumirInicio` calcula: `expedientes.enCurso` (no `ANULADO` y no `ENTREGADO`) y `finalizados` (`ENTREGADO`); `establecimientos.total` (no archivados), `conSolicitud`, `libres` y la lista con «Con solicitud (número o Borrador)» / «Disponible» por establecimiento (el expediente `ANULADO` no ocupa); `certificados.vigentes`, `porVencer`, `vencidos` y la lista de los que requieren aviso (por vencer o vencidos) ordenados por vencimiento más próximo. `puedeSolicitar` es `true` solo si `libres >= 1`.
- AC-7 (regla de «Nueva solicitud»): el botón/enlace «Nueva solicitud» se renderiza (como acción del estado vacío y como acceso rápido) **solo** si `puedeSolicitar`. Con 0 establecimientos el estado vacío ofrece «Registrar establecimiento» (`/mi-cuenta/establecimientos`); con establecimientos y 0 libres, la tarjeta Establecimientos muestra el texto de la decisión 4 y «Registrar otro establecimiento». Nunca hay dos acciones principales iguales a la vez.
- AC-8 (estados vacíos): (a) 0 establecimientos y 0 expedientes: `EmptyState` «Registra tu primer establecimiento» con descripción «Primero registra el local que quieres inspeccionar. Luego podrás iniciar tu solicitud.» y botón «Registrar establecimiento»; no se muestra «Tu resumen». (b) Con libres y 0 pasos: `EmptyState` «Aún no tienes solicitudes» con «Nueva solicitud». (c) Sin certificados: «Aún no tienes certificados. Aparecerán aquí cuando termine tu trámite.» (d) Tarjeta Expedientes con 0 expedientes: «Aún no tienes solicitudes.», sin segundo botón.
- AC-9 (certificados): con certificados `VENCIDO` o `POR_VENCER` la tarjeta Certificados muestra, por cada uno, el nombre del establecimiento y el texto del aviso existente (vencido: «Tu certificado venció. Inicia una nueva solicitud para renovarlo.»; por vencer: «Tu certificado vence en N días. …»); el enlace de esa tarjeta es «Ver mis certificados» (no «Nueva solicitud», porque el establecimiento sigue ocupado: ver pregunta 4). Las etiquetas «Vigentes», «Por vencer (60 días o menos)» y «Vencidos» salen de `CERTIFICADO_ESTADO_LABELS`/`DIAS_ALERTA_VENCIMIENTO`, sin repetir el número 60 a mano.
- AC-10 (accesos rápidos): tarjetas-enlace a Mis establecimientos, Mis expedientes y Mis certificados siempre, y a Nueva solicitud solo con `puedeSolicitar`; etiqueta e ícono vienen de `findNavItem("cliente", href)`; cada una con una línea breve de ayuda y área táctil `min-h-11`.
- AC-11 (diseño y accesibilidad): `Card` sin sobrescribir borde ni sombra; acción principal de cada paso con `buttonVariants()` por defecto (azul) cuando la urgencia es 0 y `variant: "outline"` en el resto; todos los enlaces `min-h-11` con foco visible; un solo `<h1>` (el `PageHeader`) y `<h2>` por sección; «Qué sigue» es una `<ul>`; el estado de cada expediente se dice con `EstadoBadge` (texto) y los pasos que requieren acción llevan además la etiqueta de texto «Requiere tu atención» (no solo color); fechas en hora de Lima con `formatFecha`; textos en español sin términos técnicos (sin «ITSE posterior/previa», «borrador» solo en el listado de establecimientos); solo tokens del tema (`grep` de `#[0-9a-f]{3,6}` y `oklch(` sin resultados en los archivos de la spec); datos ficticios en tests.
- AC-12 (responsive): sin desborde horizontal a 360, 768 y 1280 px (el reviewer deja constancia). «Qué sigue» y «Tu resumen»: 1 columna en 360, 2 desde `md`, 3 desde `xl`; accesos rápidos: 2 columnas en 360 y 4 desde `md`; textos largos con `break-words`/`min-w-0`; el contenido no queda tapado por la barra inferior móvil (ya resuelto por el shell).
- AC-13 (calidad): sin `any`/`@ts-ignore`; `npm run build`, `npm run lint` y `npx vitest run` pasan.

## Tareas
### T1 — Texto de días restantes compartido
- Archivos: `modules/inspecciones/utils/texto-plazo.ts` (crear), `modules/inspecciones/utils/texto-plazo.test.ts` (crear), `modules/inspecciones/components/PlazoSubsanacion.tsx` (modificar)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-2 (texto de plazo), AC-13
- Detalle: `textoDiasRestantes(diasRestantes)` devuelve «Vence hoy» (0), «Quedan 1 día hábil» y «Quedan N días hábiles»; `PlazoSubsanacion` lo usa en lugar de su cálculo en línea. Salida visual idéntica.
- Tests: `texto-plazo.test.ts` — 0, 1 y N días.
- [x] Completada

### T2 — Aviso de certificado compartido
- Archivos: `modules/certificados/utils/aviso-certificado.ts` (crear), `modules/certificados/utils/aviso-certificado.test.ts` (crear), `modules/certificados/components/CertificadosClienteView.tsx` (modificar)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-9, AC-13
- Detalle: `avisoCertificado({ estado, diasRestantes })` devuelve exactamente los textos actuales de `aviso()` (vencido; por vencer con singular/plural; `null` en los demás). `CertificadosClienteView` lo importa y elimina su función local. No se cambia ningún texto ni se inventa un flujo de renovación.
- Tests: `aviso-certificado.test.ts` — vencido, por vencer con 1 y N días, vigente y revocado → `null`. Los tests existentes de `CertificadosClienteView.test.tsx` deben seguir pasando sin modificarse.
- [x] Completada

### T3 — Lógica pura del inicio (siguiente paso, resumen y saludo)
- Archivos: `modules/client-area/types/inicio.types.ts` (crear), `modules/client-area/utils/siguiente-paso.ts` (crear), `modules/client-area/utils/siguiente-paso.test.ts` (crear), `modules/client-area/utils/resumen-inicio.ts` (crear), `modules/client-area/utils/resumen-inicio.test.ts` (crear)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-2, AC-5, AC-6, AC-7 (`puedeSolicitar`), AC-13
- Detalle: `inicio.types.ts` define `PasoSiguiente` (`expedienteId`, `establecimientoNombre`, `numero`, `estado`, `noCumple`, `mensaje`, `motivo?`, `accion { label, href, ariaLabel }`, `urgencia 0|1|2`), `EstablecimientoInicio`, `ResumenCertificados` e `InicioCliente`. `siguiente-paso.ts` exporta `siguientePaso(expediente, { motivo, direccion, feriados, ahora })` (tabla de arriba, reutilizando `estadoPlazo`, `puedeSubirEvidencia`, `tipoItsePorRiesgo`, `textoDiasRestantes`, `formatFecha`) y `ordenarPasos`. `resumen-inicio.ts` exporta `resumirInicio({ establecimientos, expedientes, certificados })` (libres con `ESTADOS_QUE_LIBERAN_ESTABLECIMIENTO`) y `nombreSaludo({ nombres, email })` (nombres sin espacios sobrantes; el correo solo si `nombres` está vacío).
- Tests: `siguiente-paso.test.ts` — recorre `estadoExpedienteEnum.enumValues` y falla si algún estado no devuelve paso (salvo `ANULADO` → `null`); una prueba por cada fila de la tabla (mensaje, etiqueta, destino, urgencia, nombre accesible); `EN_SUBSANACION` con `ahora` fijo: vigente con N días hábiles y «Vence hoy», vencido, ya presentada, previa con y sin reprogramación, límite nulo; `DILIGENCIA_PROGRAMADA` con y sin fecha/dirección; `OBSERVADO_REQUISITOS` con y sin motivo; `FINALIZADO` y `ENTREGADO` con y sin resolución de no cumple; `ordenarPasos` por urgencia estable. `resumen-inicio.test.ts` — 0 establecimientos; todos ocupados (`libres = 0`, `puedeSolicitar = false`); uno `ANULADO` libera; borrador ocupa; establecimiento archivado con expediente no cuenta en el total; conteos de expedientes en curso/finalizados; certificados vigentes/por vencer/vencidos con bordes (60 y 61 días) y orden de los avisos; `nombreSaludo` con nombres, con espacios y vacío (correo).
- [x] Completada

### T4 — Servicio `getInicioCliente`
- Archivos: `modules/client-area/services/inicio.service.ts` (crear), `modules/client-area/services/inicio.service.test.ts` (crear)
- Depende de: T3
- Grupo paralelo: G3
- Cubre: AC-1, AC-3, AC-4, AC-5, AC-6, AC-13
- Detalle: `getInicioCliente(actor, ahora = new Date())`: valida el rol; lee en paralelo `listOwnEstablecimientos`, `listOwnExpedientes` y `listCertificadosCliente`; si hay `OBSERVADO_REQUISITOS`, hace **una** consulta de `comentario`, `estado_nuevo`, `created_at` y `expediente_id` del historial para todos esos ids (unida a `expedientes` por `usuario_id = actor.id`) y obtiene el motivo de cada uno con `ultimaObservacion`; si hay `EN_SUBSANACION`, llama `getFeriados()`; arma los pasos con `siguientePaso` (direcciones desde los establecimientos ya leídos) y el resumen con `resumirInicio`. Los expedientes cuyo establecimiento está archivado conservan su paso usando `establecimientoNombre` del expediente.
- Tests: `inicio.service.test.ts` (servicios existentes y `db` simulados, patrón de `dashboard.service.test.ts`) — `admin`/`superadmin` → `No autorizado` sin invocar nada; llamadas a cada servicio con el `actor` recibido; sin observados no se consulta el historial; con 3 observados se hace una sola consulta; sin `EN_SUBSANACION` no se llama `getFeriados`; el motivo llega al paso correcto; el resultado no contiene claves de inspector ni teléfono; un id ajeno no se consulta; mezcla de estados produce pasos ordenados y `puedeSolicitar` correcto.
- [x] Completada

### T5 — Componentes del inicio
- Archivos: `modules/client-area/components/PasoCard.tsx` (crear), `modules/client-area/components/ResumenInicio.tsx` (crear), `modules/client-area/components/AccesosRapidos.tsx` (crear), `modules/client-area/components/InicioClienteView.tsx` (crear), `modules/client-area/components/InicioClienteView.test.tsx` (crear)
- Depende de: T2, T3 (tipos)
- Grupo paralelo: G3
- Cubre: AC-5, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12
- Detalle: componentes presentacionales (Server) que reciben `InicioCliente` y el saludo ya calculado; `InicioClienteView` compone encabezado, «Qué sigue», «Tu resumen» y «Accesos rápidos» y decide los estados vacíos y la acción principal con `puedeSolicitar`. `PasoCard`: `Card` con establecimiento, número, `EstadoBadge`, etiqueta «Requiere tu atención» si urgencia 0, mensaje, motivo (con `line-clamp-3`) y un único enlace de acción. `ResumenInicio`: tres `Card` con `<dl>` de cifras; la lista de establecimientos muestra hasta 5 y el enlace «Ver mis establecimientos» para el resto; los avisos usan `avisoCertificado`. `AccesosRapidos`: etiqueta e ícono desde `findNavItem`.
- Tests: `InicioClienteView.test.tsx` (Testing Library) — por incluir ramas de decisión visibles: 0 establecimientos (hero «Registra tu primer establecimiento», sin «Tu resumen» y sin «Nueva solicitud»); con libres y sin solicitudes («Nueva solicitud» a `/mi-cuenta/nueva-solicitud`); todos ocupados (sin «Nueva solicitud» en ninguna parte, texto explicativo y «Registrar otro establecimiento»); un paso con urgencia 0 muestra «Requiere tu atención» y el enlace con nombre accesible `Pagar (…)`; certificado por vencer y vencido con su aviso; sin certificados el texto vacío; los accesos rápidos tienen los destinos correctos.
- [x] Completada

### T6 — Página `/mi-cuenta`
- Archivos: `app/mi-cuenta/page.tsx` (modificar), `app/mi-cuenta/page.test.tsx` (crear)
- Depende de: T4, T5
- Grupo paralelo: G4
- Cubre: AC-1, AC-13
- Detalle: Server Component: `requireRole("cliente")`, `getInicioCliente(usuario)`, `nombreSaludo(usuario)` y composición de `InicioClienteView`. Sin lógica propia ni consultas.
- Tests: `page.test.tsx` (patrón de `app/mi-cuenta/expedientes/page.test.tsx`) — `requireRole("cliente")` se llama antes que el servicio; con redirección no se consulta el servicio; el servicio recibe el usuario devuelto por `requireRole`; se pasa el saludo con nombres y, sin nombres, con el correo.
- [x] Completada

## Grupos paralelos
- G1: T1, T2 (archivos disjuntos). G2: T3 (necesita T1). G3: T4, T5 (archivos disjuntos; T4 necesita T3, T5 necesita T2 y T3). G4: T6.

## Fases siguientes
- Renovación de certificados (regla pendiente en `reglas-negocio` §4): cuando se defina, el aviso del inicio podrá ofrecer la acción directa.
- Perfil del cliente (`/mi-cuenta/perfil`).
