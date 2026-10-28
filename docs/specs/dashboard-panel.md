# Dashboard del panel

Estado: approved

Parte 2 de 3 de `dashboard-reportes`. **Depende de `reportes-base-graficos`** (`ChartCard`, `BarsChart`, `contarCertificadosPorVencimiento`, `ultimosMeses`, `rellenarMeses`, `etiquetaMes`, `ESTADOS_ORDEN`) y de las specs de expedientes, inspección y certificados ya implementadas. Independiente de `reportes-panel`.

## Objetivo
El personal (admin y superadmin) ve en `/panel` qué tiene pendiente hoy (seis indicadores con enlace a la lista correspondiente) y tres gráficos de la marcha de la oficina: expedientes por estado, solicitudes por mes y certificados por vencimiento. Reemplaza las cuatro tarjetas vacías de la spec `layouts-por-rol`.

## Fuera de alcance
- Reportes con filtros y CSV (spec 3).
- Alertas por correo, jobs programados, actualización en vivo (la página se calcula al abrirla).
- Gráficos por riesgo y por tipo de trámite (están en los reportes).
- Datos de personas: ni solicitantes ni inspectores aparecen en ningún indicador ni gráfico.

## Decisiones (a confirmar al aprobar)
1. **Mismo dashboard para admin y superadmin** (reglas 11: «Ver reportes» para ambos). No hay indicadores exclusivos del superadmin; «Pendientes de Jefatura» se muestra a los dos como información.
2. **Solo expedientes presentados** (`numero` no nulo; los borradores no cuentan).
3. **Indicadores** (nombre visible -> definición -> enlace):
   - «Por revisar» -> estado `PRESENTADO` -> `/panel/expedientes?estado=PRESENTADO`.
   - «En revisión» -> `EN_REVISION` -> `/panel/expedientes?estado=EN_REVISION`.
   - «Pendientes de Jefatura» -> `ENVIADO_JEFATURA`, `CERTIFICADO_PENDIENTE_FIRMA` y `NO_CUMPLE` (el mismo conjunto de la bandeja, `ESTADOS_PENDIENTES_JEFATURA`) -> `/panel/expedientes?pendientes=jefatura`.
   - «Inspecciones en los próximos 7 días» -> `DILIGENCIA_PROGRAMADA` con `diligencia_programada_para` entre el inicio de hoy (Lima) y el inicio de hoy + 7 días (exclusivo) -> `/panel/expedientes?estado=DILIGENCIA_PROGRAMADA`.
   - «Plazos de subsanación por vencer» -> `EN_SUBSANACION` con `subsanacion_limite` anterior al inicio de hoy + 4 días (vence en 3 días o menos, o ya venció) -> `/panel/expedientes?estado=EN_SUBSANACION`.
   - «Certificados por vencer» -> certificados con 60 días o menos para vencer (`hasta30 + de31a60` de la spec 1) -> `/panel/certificados?filtro=por-vencer`.
4. **Gráficos:** (a) «Expedientes por estado», barras horizontales, un color, solo estados con cantidad mayor que 0 (los de `ESTADOS_ORDEN`, etiquetados con `ESTADO_LABELS`; los estados en desuso solo aparecen si hay datos antiguos); (b) «Solicitudes presentadas por mes», barras verticales de los últimos 6 meses de Lima, con ceros; (c) «Certificados por vencimiento», barras con cuatro categorías «Vencidos» (token 5), «Vencen en 30 días o menos» (token 4), «Vencen entre 31 y 60 días» (token 2), «Vigentes» (token 3); el significado va en la etiqueta, no en el color.
5. Tres consultas agregadas en paralelo (`Promise.all`) más la de certificados de la spec 1; sin N+1 ni consultas por fila.

## Reutilización
- Existente que se reutiliza: `ChartCard`, `BarsChart`, `contarCertificadosPorVencimiento`, utilidades de meses y `ESTADOS_ORDEN` (spec 1); `ESTADO_LABELS` (`modules/expedientes/constants/estado-labels.ts`); `ESTADOS_PENDIENTES_JEFATURA` (`modules/expedientes/services/bandeja.service.ts`); `limitesFiltro` (`certificado-lista.service.ts`); `parseFechaLima`/`aInputLima`; `requireRole`; `PageHeader`, `EmptyState`; `Card`; `Actor`; filtros por enlace de la bandeja (`?estado=`, `?pendientes=jefatura`) y de certificados (`?filtro=por-vencer`).
- Existente que se extiende: `app/panel/page.tsx` (reemplaza las 4 tarjetas vacías); `modules/expedientes/services/bandeja.service.ts` (solo agrega `export` a `ESTADOS_PENDIENTES_JEFATURA`, sin cambiar el comportamiento).
- Nuevo (y por qué): `modules/reportes/services/dashboard.service.ts` (consultas propias del dashboard); `KpiCard` y `DashboardView` (presentación específica de este dominio).
- Dependencias / componentes shadcn a instalar: ninguno (usa lo de la spec 1).

## Specs afectadas
- `layouts-por-rol`: AC-11 (las cuatro tarjetas vacías del Dashboard) queda superado por esta spec; el menú no cambia.
- `bandeja-estados`: solo se exporta una constante; sin cambio de comportamiento.
- Migraciones: ninguna. `expedientes.presentado_at` no tiene índice; con el volumen de una oficina distrital el escaneo es aceptable y los gráficos usan rangos acotados (6 meses). Si hiciera falta, la siguiente migración libre es la `0021` (índice sobre `expedientes(presentado_at)`).

## Criterios de aceptación
- AC-1 (servicio): `getDashboardPanel(actor, ahora?)` lanza `Error("No autorizado")` para `cliente` y devuelve `{ indicadores, porEstado, porMes, certificados }`. `indicadores` tiene `porRevisar`, `enRevision`, `pendientesJefatura`, `inspeccionesSemana`, `subsanacionPorVencer` y `certificadosPorVencer` (números >= 0, definidos como en la decisión 3). Todos consideran solo expedientes con `numero`.
- AC-2 (agregados): `porEstado` es un arreglo `{ estado, cantidad }` ordenado según `ESTADOS_ORDEN`, sin `BORRADOR` y sin estados con cantidad 0; `porMes` tiene exactamente 6 elementos `{ clave, cantidad }` (mes actual de Lima y los 5 anteriores) agrupados con `to_char(presentado_at at time zone 'America/Lima','YYYY-MM')`; un expediente presentado a las 23:30 hora de Lima del último día del mes cuenta en ese mes, no en el siguiente.
- AC-3 (privacidad y eficiencia): el servicio no consulta `usuarios` ni `inspectores`; no devuelve nombres, correos, teléfonos ni documentos; usa a lo sumo 4 consultas SQL por carga (estados, conteos con `count(*) filter`, meses, certificados), todas agregadas.
- AC-4 (página): `/panel` llama `requireRole("admin", "superadmin")` primero; un cliente es redirigido por `requireRole`. Muestra `PageHeader` «Dashboard», los 6 indicadores en una cuadrícula (1 columna en 360 px, 2 en 768 px, 3 en 1280 px o más) y los 3 gráficos (1 columna; en 1280 px el gráfico de estados ocupa el ancho completo y los otros dos van lado a lado).
- AC-5 (indicadores): cada `KpiCard` muestra título, el número grande y un enlace con texto «Ver lista» (o «Ver certificados»), con el destino de la decisión 3 y `min-h-11` de área táctil; con valor 0 muestra «0» (no un estado vacío) y el enlace sigue disponible.
- AC-6 (gráficos): cada gráfico se muestra dentro de `ChartCard` con título, resumen en texto con las cifras clave (p. ej. «Hay 12 expedientes en curso; el estado más frecuente es En revisión (5).») y tabla alternativa; etiquetas en español (`ESTADO_LABELS`, `etiquetaMes`); sin datos todos en cero se muestra `EmptyState` «Aún no hay expedientes presentados.» en lugar de los tres gráficos.
- AC-7 (accesibilidad y diseño): los indicadores son enlaces con foco visible; ningún significado depende solo del color (cada barra con etiqueta y valor); solo tokens del tema (`grep` de `#[0-9a-f]{3,6}` y `oklch(` en los archivos de la spec sin resultados); sin desborde horizontal a 360, 768 y 1280 px (el reviewer deja constancia); textos en español sin términos técnicos; datos ficticios.
- AC-8: sin `any`/`@ts-ignore`; `npm run build`, `npm run lint` y `npx vitest run` pasan.

## Tareas
### T1 — Servicio del dashboard
- Archivos: `modules/reportes/services/dashboard.service.ts` (crear), `modules/reportes/services/dashboard.service.test.ts` (crear), `modules/reportes/types/dashboard.types.ts` (crear), `modules/expedientes/services/bandeja.service.ts` (modificar: exportar `ESTADOS_PENDIENTES_JEFATURA`)
- Depende de: `reportes-base-graficos` completa
- Grupo paralelo: G1
- Cubre: AC-1, AC-2, AC-3
- Tests: rol `cliente` lanza `No autorizado`; mapeo de indicadores desde filas de `db` mockeado; `porEstado` ordenado, sin `BORRADOR` ni ceros; `porMes` con 6 claves y ceros rellenados; límites de «próximos 7 días» y «subsanación por vencer» calculados desde un `ahora` fijo (p. ej. 23:30 de Lima); que no se importe ni consulte `usuarios`/`inspectores`.
- [x] Completada

### T2 — Componentes del dashboard
- Archivos: `modules/reportes/components/KpiCard.tsx` (crear), `modules/reportes/components/DashboardView.tsx` (crear)
- Depende de: T1 (tipos), `reportes-base-graficos`
- Grupo paralelo: G2
- Cubre: AC-4 (composición), AC-5, AC-6, AC-7
- Tests: no aplica (presentacionales, SETUP.md 3.2); el resumen en texto de cada gráfico se arma con una función pura dentro de `DashboardView.tsx` simple; si crece, se mueve a una utilidad con test.
- [x] Completada

### T3 — Página `/panel`
- Archivos: `app/panel/page.tsx` (modificar), `app/panel/page.test.tsx` (crear)
- Depende de: T1, T2
- Grupo paralelo: G3
- Cubre: AC-4, AC-6 (estado vacío), AC-8
- Tests: `page.test.tsx` — `requireRole("admin", "superadmin")` se llama antes que el servicio; el servicio recibe el usuario devuelto por `requireRole`; con todo en cero se muestra el estado vacío (patrón de `app/panel/expedientes/page.test.tsx`).
- [x] Completada

## Grupos paralelos
- G1: T1. G2: T2. G3: T3.

## Fases siguientes
- Ninguna. Los reportes con filtros están en `reportes-panel`.
