# Reportes del panel

Estado: approved

Parte 3 de 3 de `dashboard-reportes`. **Depende de `reportes-base-graficos`** (`ChartCard`, `BarsChart`, `rangoDesdeHasta`, `clavesMeses`, `rellenarMeses`, `etiquetaMes`, `ESTADOS_ORDEN`, `contarCertificadosPorVencimiento`). Independiente de `dashboard-panel`.

## Objetivo
La oficina de GRDyDC (admin y superadmin) consulta en `/panel/reportes` cómo se está atendiendo la ITSE en un periodo: producción mensual, distribución por riesgo y tipo de trámite, resultados de inspección, tiempos promedio por etapa (desde `historial_estados`) y estado de los certificados. Filtra por fechas, estado, nivel de riesgo y distrito, y descarga el listado en CSV.

## Fuera de alcance
- Exportación a PDF o Excel; envío por correo; reportes programados.
- Datos de personas: ni solicitantes ni inspectores aparecen en agregados ni en el CSV.
- Reportes por inspector.
- Plazos legales de ejecución del procedimiento (7 y 9 días hábiles): pendientes de verificar en las reglas (sección 8), no se calculan.
- Paginación del CSV: tope fijo de 2000 filas (se avisa si se alcanzó).

## Decisiones (a confirmar al aprobar)
1. **Mismo reporte para admin y superadmin** (reglas 11: «Ver reportes» para ambos).
2. **Fecha de referencia = fecha de presentación** (`presentado_at`, hora de Lima). Solo expedientes presentados (`numero` no nulo). Rango por defecto: desde el primer día del mes de hace 5 meses hasta hoy; máximo 366 días. Todos los filtros definen una misma «cohorte» de expedientes y todas las secciones se calculan sobre ella.
3. **Filtros** (formulario HTML con `method="GET"`, sin JavaScript de cliente): «Desde» y «Hasta» (`input type="date"`), «Estado» (estados de `ESTADOS_ORDEN`), «Nivel de riesgo» y «Distrito» (lista de distritos que existen en `establecimientos`, tope 50, obtenida con `select distinct`). Valores inválidos de la URL se ignoran (patrón `.catch(undefined)` de `filtros-bandeja.schema.ts`).
4. **Secciones del reporte:**
   - **Producción mensual:** expedientes presentados por mes del rango (barras verticales con ceros).
   - **Por nivel de riesgo** (Bajo, Medio, Alto, Muy alto, «Sin clasificar» si es nulo) y **por tipo de trámite** (Nueva inspección, Renovación): barras horizontales.
   - **Resultados de inspección:** cantidad de expedientes de la cohorte que en algún momento registraron `CUMPLE`, `NO_CUMPLE` o pasaron por `EN_SUBSANACION` (`count(distinct expediente_id) filter (...)` sobre `historial_estados`). Las categorías no son excluyentes (un expediente puede pasar por subsanación y luego cumplir); el resumen lo aclara.
   - **Tiempos por etapa:** promedio, en días calendario con un decimal, de lo que estuvo la cohorte en cada estado, calculado con `lead(created_at) over (partition by expediente_id order by created_at, id)` sobre `historial_estados` (tiempo en un estado = momento del siguiente cambio menos el momento del cambio que lo creó). Solo se cuentan estados que ya terminaron (con siguiente cambio). Cada fila muestra estado (`ESTADO_LABELS`), promedio y cantidad de pasos medidos; orden `ESTADOS_ORDEN`. Se aclara en pantalla que las etapas «Observado» y «En subsanación» incluyen tiempo de espera del administrado. Además, «Tiempo promedio hasta la entrega»: promedio de (cambio a `ENTREGADO` - `presentado_at`) de los expedientes entregados de la cohorte, o «Sin datos».
   - **Certificados:** «Emitidos en el periodo» (certificados con `emitido_at` dentro del rango, aplicando solo los filtros de riesgo y distrito, no los de estado) y el gráfico de certificados por vencimiento de la spec 1 (con riesgo y distrito). Enlace «Ver certificados por vencer» a `/panel/certificados?filtro=por-vencer`.
5. **CSV** (`GET /api/reportes/expedientes?<mismos filtros>`): una fila por expediente de la cohorte, máx. 2000, ordenado por `presentado_at` descendente. Columnas: «Número», «Fecha de presentación» (dd/MM/yyyy, Lima), «Estado» (etiqueta), «Nivel de riesgo», «Tipo de trámite», «Distrito». No incluye solicitante, correo, teléfono, documento, nombre comercial ni inspectores. Codificado UTF-8 con BOM (para Excel), separador coma, texto entre comillas con escape, y las celdas que empiezan con `=`, `+`, `-` o `@` llevan un apóstrofo delante (evita inyección de fórmulas). Encabezados `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="expedientes-AAAAMMDD-AAAAMMDD.csv"` y `Cache-Control: private, no-store`.
6. **Consultas:** secciones calculadas con `Promise.all` de agregados (producción+riesgo+trámite en consultas agrupadas, resultados, tiempos, hito de entrega, emitidos, distritos y certificados), sin N+1. Cohorte = `expedientes` unido a `establecimientos` (para el distrito); `historial_estados` se une por `expediente_id` (índice existente).

## Reutilización
- Existente que se reutiliza: `ChartCard`, `BarsChart`, `rangoDesdeHasta`, utilidades de meses, `ESTADOS_ORDEN`, `contarCertificadosPorVencimiento` (spec 1); `ESTADO_LABELS`; `RIESGO_LABELS` y `TIPO_TRAMITE_LABELS` (`modules/expedientes/constants/expediente-labels.ts`); `formatFecha`; `requireRole`; `getOrCreateUser` (autenticación de la ruta CSV, como las rutas de descarga existentes); `PageHeader`, `EmptyState`; `Card`, `Input`, `Label`, `buttonVariants`; `estadoExpedienteEnum`/`nivelRiesgoEnum`.
- Existente que se extiende: nada. `app/panel/reportes/page.tsx` es estático y tiene prioridad sobre el placeholder `app/panel/[section]`.
- Nuevo (y por qué): `filtros-reporte.schema.ts`, `reporte.types.ts`, `reportes.service.ts`, `reporte-csv.service.ts`, `csv.ts` (lógica propia de este reporte; no hay CSV en el repo); componentes `FiltrosReporteForm`, `ReportesView`, `TiemposEtapaTabla`; ruta `app/api/reportes/expedientes/route.ts` (descarga protegida; permitida por la constitución, sección 3).
- Dependencias / componentes shadcn a instalar: ninguno. Sin `select` de shadcn: se usa `<select>` nativo con etiqueta (sin JavaScript).

## Specs afectadas
- `layouts-por-rol`: la sección «Reportes» deja de mostrar «Próximamente»; el menú no cambia.
- Migraciones: ninguna. `historial_estados` ya tiene índice por `expediente_id`; `expedientes.presentado_at` no tiene índice, y con el volumen esperado y el rango acotado a 366 días el escaneo es aceptable. Si hiciera falta, la siguiente migración libre es la `0021`.

## Criterios de aceptación
- AC-1 (schema): `filtrosReporteSchema.parse(searchParams)` devuelve `{ desde, hasta, estado?, riesgo?, distrito? }`; fechas inválidas, estado `BORRADOR` o desconocido, riesgo desconocido y valores repetidos (`["a","b"]`) se ignoran sin lanzar; `distrito` se recorta y limita a 60 caracteres y vacío equivale a sin filtro; el rango se resuelve con `rangoDesdeHasta` (por defecto, recorte a 366 días).
- AC-2 (autorización): `getReporte(actor, filtros, ahora?)` y `listExpedientesCsv(actor, filtros)` lanzan `Error("No autorizado")` para `cliente`. La página usa `requireRole("admin", "superadmin")` primero. La ruta CSV devuelve 401 sin sesión o con usuario inactivo y 403 para `cliente`.
- AC-3 (agregados): `getReporte` devuelve `{ produccion, porRiesgo, porTramite, resultados, tiempos, tiempoEntrega, certificados, distritos }`. `produccion` tiene un elemento por mes del rango (con ceros) agrupado en hora de Lima; `porRiesgo` incluye «Sin clasificar» solo si hay expedientes sin nivel; `resultados` = `{ cumple, noCumple, subsanacion }` con expedientes distintos; `tiempos` = `{ estado, promedioDias, cantidad }[]` ordenado por `ESTADOS_ORDEN`; `tiempoEntrega` = `number | null`; `certificados` = `{ emitidos, vencimiento }`. Todo filtrado por la misma cohorte (fechas, estado, riesgo, distrito) salvo la excepción de `emitidos` de la decisión 4.
- AC-4 (privacidad y eficiencia): ningún servicio consulta `usuarios` ni `inspectores`; ningún resultado contiene nombres, correos, teléfonos, documentos ni nombre comercial; cada sección es una consulta agregada (sin consultas por fila); los distritos se limitan a 50.
- AC-5 (tiempos): con historial simulado, el promedio por estado coincide con el cálculo a mano (p. ej. un expediente 2 días en `EN_REVISION` y otro 4 días dan 3,0 con cantidad 2); un estado sin siguiente cambio no se cuenta; el tiempo hasta la entrega solo considera expedientes que llegaron a `ENTREGADO`.
- AC-6 (CSV): `aCsv(filas)` escapa comillas, comas y saltos de línea, antepone apóstrofo a celdas que empiezan con `=`, `+`, `-` o `@`, usa BOM y fin de línea `\r\n`. `listExpedientesCsv` devuelve como máximo 2000 filas con solo las columnas de la decisión 5 y un indicador `truncado` si se alcanzó el tope. La ruta responde con los encabezados de la decisión 5 y un nombre de archivo con las fechas del rango.
- AC-7 (página): `/panel/reportes` muestra `PageHeader` «Reportes», el formulario de filtros (etiquetas visibles, valores actuales, botón «Aplicar filtros», enlace «Quitar filtros» y enlace «Descargar CSV» con los mismos filtros, todos con `min-h-11`), y las secciones de la decisión 4, cada gráfico en `ChartCard` con título, resumen en texto y tabla alternativa. La tabla de tiempos es una tabla HTML con encabezados (`th scope`). Sin expedientes en la cohorte: `EmptyState` «No hay expedientes con estos filtros.» y el formulario sigue disponible. Si el CSV se truncó, aviso «El archivo incluye los primeros 2000 expedientes; acota las fechas para ver el resto».
- AC-8 (accesibilidad y diseño): filtros navegables por teclado en orden lógico y con foco visible; ninguna información depende solo del color; solo tokens del tema (`grep` de `#[0-9a-f]{3,6}` y `oklch(` en los archivos de la spec sin resultados); sin desborde horizontal a 360, 768 y 1280 px (formulario en 1 columna en móvil, rejilla en escritorio; tabla de tiempos con `overflow-x-auto` solo dentro de su contenedor, sin ensanchar la página); fechas `dd/MM/yyyy` en hora de Lima; textos en español sin términos técnicos; datos ficticios.
- AC-9: sin `any`/`@ts-ignore`; `npm run build`, `npm run lint` y `npx vitest run` pasan.

## Tareas
### T1 — Schema de filtros y tipos del reporte
- Archivos: `modules/reportes/schemas/filtros-reporte.schema.ts` (crear), `modules/reportes/schemas/filtros-reporte.schema.test.ts` (crear), `modules/reportes/types/reporte.types.ts` (crear)
- Depende de: `reportes-base-graficos` completa
- Grupo paralelo: G1
- Cubre: AC-1 (y define los contratos de AC-3)
- Tests: casos válidos e inválidos del schema (fechas, estado, riesgo, distrito, arreglos, vacío, rango por defecto).
- [x] Completada

### T2 — Servicio de agregados del reporte
- Archivos: `modules/reportes/services/reportes.service.ts` (crear), `modules/reportes/services/reportes.service.test.ts` (crear)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-2 (servicio), AC-3, AC-4, AC-5
- Tests: rol `cliente` lanza `No autorizado`; relleno de meses con ceros y agrupación en hora de Lima; «Sin clasificar»; cálculo de tiempos y entrega desde filas simuladas; que `emitidos` ignora el filtro de estado; límites de distritos; ausencia de claves de personas. `db` mockeado.
- [x] Completada

### T3 — CSV: utilidad y servicio de listado
- Archivos: `modules/reportes/utils/csv.ts` (crear), `modules/reportes/utils/csv.test.ts` (crear), `modules/reportes/services/reporte-csv.service.ts` (crear), `modules/reportes/services/reporte-csv.service.test.ts` (crear)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-2 (servicio), AC-4, AC-6 (utilidad y servicio)
- Tests: `csv.test.ts` — comillas, comas, saltos, `=`/`+`/`-`/`@`, BOM, `\r\n`, valores vacíos. `reporte-csv.service.test.ts` — rol incorrecto, tope de 2000 con `truncado`, columnas permitidas, formato de fecha de Lima.
- [x] Completada

### T4 — Ruta de descarga CSV
- Archivos: `app/api/reportes/expedientes/route.ts` (crear), `app/api/reportes/expedientes/route.test.ts` (crear)
- Depende de: T3
- Grupo paralelo: G3
- Cubre: AC-2 (ruta), AC-6 (ruta)
- Tests: 401 sin sesión o inactivo; 403 para `cliente`; 200 con encabezados correctos para `admin` y `superadmin`; filtros inválidos no rompen; nombre de archivo con las fechas del rango (patrón de las rutas de descarga existentes).
- [x] Completada

### T5 — Vistas del reporte
- Archivos: `modules/reportes/components/FiltrosReporteForm.tsx` (crear), `modules/reportes/components/ReportesView.tsx` (crear), `modules/reportes/components/TiemposEtapaTabla.tsx` (crear)
- Depende de: T1 (tipos), `reportes-base-graficos`
- Grupo paralelo: G2
- Cubre: AC-7, AC-8
- Tests: no aplica (presentacionales, SETUP.md 3.2); los resúmenes en texto de cada gráfico se arman con funciones puras simples dentro de `ReportesView.tsx`.
- [x] Completada

### T6 — Página `/panel/reportes`
- Archivos: `app/panel/reportes/page.tsx` (crear), `app/panel/reportes/page.test.tsx` (crear)
- Depende de: T2, T5
- Grupo paralelo: G3
- Cubre: AC-2 (página), AC-7, AC-9
- Tests: `page.test.tsx` — `requireRole("admin", "superadmin")` primero; los `searchParams` pasan por el schema y llegan al servicio; filtros inválidos usan los valores por defecto; cohorte vacía muestra el estado vacío (patrón de `app/panel/expedientes/page.test.tsx`).
- [x] Completada

## Grupos paralelos
- G1: T1. G2: T2, T3, T5 (archivos disjuntos). G3: T4, T6 (archivos disjuntos).

## Fases siguientes
- Ninguna.
