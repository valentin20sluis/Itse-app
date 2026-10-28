# Base de gráficos y utilidades de reportes

Estado: approved

Parte 1 de 3 de `dashboard-reportes` (las otras: `dashboard-panel` y `reportes-panel`, que dependen de esta y entre sí son independientes). Deja lista la base: la librería Recharts, la paleta de gráficos del tema, un componente de gráfico accesible, utilidades de fechas en hora de Lima y la consulta de certificados por vencimiento que usan el dashboard y los reportes.

## Objetivo
Que el dashboard y los reportes dibujen gráficos accesibles (con título, resumen en texto y tabla alternativa), con colores del tema, y calculen rangos de fechas en hora de Lima de una sola manera.

## Fuera de alcance
- Dashboard y reportes (specs 2 y 3).
- Gráficos circulares/de línea y otros tipos: solo barras (horizontal y vertical). Se agregan cuando una spec los necesite.
- Interactividad avanzada (zoom, selección de series, descargas de imagen).
- Modo oscuro de la app: los tokens se definen también para `.dark` porque el CSS ya los tiene, pero no se verifica visualmente.

## Decisiones (a confirmar al aprobar)
1. **Recharts 3.10.1.** `npm view recharts`: `latest` = 3.10.1 (publicada el 25/07/2026, más de 3 meses; la 3.11 es solo canary y se descarta). Sus peers aceptan React 19. Se instala como `recharts@^3.10.1`.
2. **Se usa el wrapper `chart` de shadcn** (`components/ui/chart.tsx`). Verificado con `npx shadcn@latest view chart`: el registro `base-nova` lo trae como componente puro de presentación (contenedor + tooltip + leyenda), sin depender de Base UI ni de Radix, y solo requiere `card` (ya existe) y el paquete `cn` (ya está). Aporta los colores por variable CSS (`--color-<clave>`) y un `ResponsiveContainer` con tamaño inicial (320x200), útil para SSR y para jsdom. Particularidad: el registro fija `recharts@3.8.0`; tras agregarlo se actualiza a `^3.10.1` y el `npm run build` confirma que los tipos de `chart.tsx` compilan. Si no compilara con 3.10.1, el developer lo reporta (no se edita `components/ui/` a mano sin avisar).
3. **Solo barras, y nunca solo color:** cada barra lleva su etiqueta de categoría en el eje y su valor impreso (`LabelList`); la leyenda no es necesaria porque cada categoría ya está rotulada. Los colores `--chart-n` distinguen pero no portan el significado.
4. **Accesibilidad por composición** (no se confía en `accessibilityLayer` de Recharts como única ayuda): `ChartCard` = `<figure>` con `<figcaption>` (título), párrafo de resumen en texto visible, el gráfico dentro de un `div role="img"` con `aria-label` descriptivo, y una tabla con los mismos datos dentro de un `<details>` nativo («Ver datos en tabla»), fuera del `role="img"` para que sea legible por lector de pantalla.
5. **Paleta** (en `:root` y `.dark`, reemplaza los grises de plantilla): `--chart-1` azul de marca, `--chart-2` ámbar, `--chart-3` verde (éxito), `--chart-4` naranja rojizo, `--chart-5` rojo; cada uno con contraste de al menos 3:1 contra `--card` (modo claro y oscuro). Valores sugeridos (el developer los ajusta si no cumplen el contraste y deja anotadas las razones): claro `oklch(0.38 0.14 260)`, `oklch(0.7 0.16 75)`, `oklch(0.55 0.15 150)`, `oklch(0.62 0.19 45)`, `oklch(0.5 0.22 25)`; oscuro: los mismos tonos con luminosidad subida (L entre 0.65 y 0.8).

## Reutilización
- Existente que se reutiliza: `components/ui/card.tsx`; `cn` (`lib/utils.ts`); tokens `--color-*` del tema en `app/globals.css`; `limitesFiltro` y `MAX_FILAS_CERTIFICADOS` de `modules/certificados/services/certificado-lista.service.ts`; `DIAS_ALERTA_VENCIMIENTO` de `modules/certificados/utils/vigencia.ts`; `aInputLima`/`parseFechaLima` de `modules/inspecciones/utils/fecha-diligencia.ts`; `estadoExpedienteEnum` y `nivelRiesgoEnum` de `db/schema.ts`.
- Existente que se extiende: `app/globals.css` (solo `--chart-1..5`, en `:root` y `.dark`; ya existen los alias `--color-chart-*` en `@theme inline`).
- Nuevo (y por qué): `components/shared/ChartCard.tsx` y `components/shared/BarsChart.tsx` (no hay equivalente; son reutilizables entre dominios, por eso van en `shared/`); `modules/reportes/` (módulo previsto en la constitución, sección 2) con utilidades de rango de fechas, orden de estados y la consulta de certificados por vencimiento, que comparten dashboard y reportes (DRY).
- Dependencias / componentes shadcn a instalar antes de implementar (**preparación del orquestador**, una sola vez; toca `package.json`, `package-lock.json` y `components/ui/chart.tsx`): `npx shadcn@latest add chart` (responder NO a sobrescribir `card`), luego `npm install recharts@^3.10.1` para reemplazar la 3.8.0 que fija el registro; comprobar con `npm ls recharts` y `npm run build`.

## Specs afectadas
- Ninguna de contenido. `layouts-por-rol` se afecta en las specs 2 y 3 (placeholders).
- Migraciones: ninguna.

## Criterios de aceptación
- AC-1 (dependencia): `package.json` declara `recharts` `^3.10.1` y `components/ui/chart.tsx` existe; `npm ls recharts` muestra una sola versión 3.10.x; no se agregó ninguna otra dependencia.
- AC-2 (tokens): `app/globals.css` define `--chart-1..5` en `:root` y en `.dark` con la paleta de la decisión 5; cada color tiene contraste >= 3:1 contra `--card` en su modo (el reviewer lo calcula y lo anota); no hay colores hexadecimales nuevos fuera de `globals.css`.
- AC-3 (rangos): `rangoDesdeHasta(desde, hasta, ahora)` recibe cadenas `YYYY-MM-DD` (o `undefined`) y devuelve `{ desde: Date, hastaExclusivo: Date, desdeInput: string, hastaInput: string }` con límites en inicio de día de Lima (`hastaExclusivo` = inicio del día siguiente a `hasta`). Sin parámetros, o con fechas inválidas, o con `desde` > `hasta`: por defecto desde el primer día del mes de hace 5 meses hasta hoy (Lima). Si el rango supera 366 días se recorta a los 366 días que terminan en `hasta`. `hasta` posterior a hoy se recorta a hoy.
- AC-4 (meses): `clavesMeses(desde, hastaExclusivo)` devuelve las claves `YYYY-MM` (Lima) de cada mes tocado por el rango, en orden y sin huecos (máx. 13); `ultimosMeses(n, ahora)` devuelve las `n` claves terminadas en el mes actual de Lima; `etiquetaMes("2026-10")` devuelve `"oct 2026"` (abreviaturas fijas en español: ene feb mar abr may jun jul ago sep oct nov dic); `rellenarMeses(claves, filas)` devuelve un `{ clave, cantidad }` por clave, con 0 donde no hay fila.
- AC-5 (orden de estados): `ESTADOS_ORDEN` contiene cada valor de `estadoExpedienteEnum` excepto `BORRADOR` exactamente una vez, con el flujo principal primero y los tres estados en desuso (`EN_TRAMITE_EXTERNO`, `PENDIENTE_RESOLUCION`, `DERIVADO_COMERCIALIZACION`) al final.
- AC-6 (certificados por vencimiento): `contarCertificadosPorVencimiento(actor, filtros?, ahora?)` lanza `Error("No autorizado")` para `cliente`; devuelve `{ vencidos, hasta30, de31a60, vigentes }` (números) de certificados con `emitidoAt` y `venceAt` cuyo expediente está en `FINALIZADO` o `ENTREGADO` (nunca `ANULADO`), con una sola consulta agregada (`count(*) filter`) y filtros opcionales `{ riesgo?, distrito? }`. Límites sobre `vence_at` con el inicio de hoy en Lima `H`: vencidos `< H`; hasta30 `[H, H+30 d]`; de31a60 `(H+30 d, H+60 d]`; vigentes `> H+60 d`. `hasta30 + de31a60` coincide con los certificados que `estadoCertificado` marca `POR_VENCER` (un test lo comprueba en 61, 60, 31, 30, 0 y -1 días). No devuelve ningún dato de personas.
- AC-7 (`ChartCard`): recibe `title`, `summary` (texto), `data: { label: string; value: number }[]`, `valueHeader` y `children` (el gráfico). Renderiza `<figure>` con título (`figcaption`), el resumen visible, el gráfico dentro de `role="img"` con `aria-label` = título + resumen, y la tabla de datos (columnas «Categoría»/`valueHeader`) dentro de `<details><summary>Ver datos en tabla</summary>`. Sin datos (`data` vacío) muestra «Sin datos para mostrar.» en lugar del gráfico y de la tabla.
- AC-8 (`BarsChart`): componente `"use client"` sobre `ChartContainer`/`ChartConfig` de `components/ui/chart.tsx`; props `data: { label: string; value: number; token?: 1|2|3|4|5 }[]`, `orientation?: "horizontal" | "vertical"` (por defecto horizontal), `valueLabel` (nombre del valor para el tooltip) y `height?`. Cada barra imprime su valor (`LabelList`); el color de cada barra viene de `var(--chart-<token>)` (por defecto 1); no hay colores literales; el contenedor no desborda su padre (`w-full min-w-0`) a 360/768/1280 px; con muchas categorías (horizontal) el alto crece con el número de barras y las etiquetas largas no se cortan en 360 px (eje con ancho acotado y texto que envuelve o abrevia con `title`).
- AC-9: sin `any`/`@ts-ignore`; `npm run build`, `npm run lint` y `npx vitest run` pasan.

## Tareas
### T1 — Paleta de gráficos del tema
- Archivos: `app/globals.css` (modificar: solo `--chart-1..5` en `:root` y `.dark`)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-2
- Tests: no aplica (CSS; el reviewer verifica el contraste, SETUP.md 3.2)
- [x] Completada

### T2 — Utilidades de rango de fechas y orden de estados
- Archivos: `modules/reportes/utils/rango-fechas.ts` (crear), `modules/reportes/utils/rango-fechas.test.ts` (crear), `modules/reportes/constants/estados-orden.ts` (crear), `modules/reportes/constants/estados-orden.test.ts` (crear)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-3, AC-4, AC-5
- Tests: `rango-fechas.test.ts` — valores por defecto, fechas inválidas, `desde` > `hasta`, recorte a 366 días y a hoy, bordes de mes y de año (diciembre -> enero), medianoche de Lima (23:30 del 31/10 Lima = 04:30 UTC del 01/11), `clavesMeses`, `ultimosMeses`, `etiquetaMes`, `rellenarMeses`. `estados-orden.test.ts` — completitud sin repetidos y sin `BORRADOR`.
- [x] Completada

### T3 — Consulta de certificados por vencimiento
- Archivos: `modules/reportes/services/certificados-vencimiento.service.ts` (crear), `modules/reportes/services/certificados-vencimiento.service.test.ts` (crear)
- Depende de: ninguna (usa `limitesFiltro` ya existente)
- Grupo paralelo: G1
- Cubre: AC-6
- Tests: rol `cliente` lanza `No autorizado`; mapeo del resultado de la consulta (`db` mockeado); consistencia de los límites calculados con `estadoCertificado` en las fronteras; los filtros opcionales se pasan a la consulta; el resultado no contiene claves de personas.
- [x] Completada

### T4 — Componentes de gráfico accesibles
- Archivos: `components/shared/ChartCard.tsx` (crear), `components/shared/ChartCard.test.tsx` (crear), `components/shared/BarsChart.tsx` (crear), `components/shared/BarsChart.test.tsx` (crear)
- Depende de: preparación del orquestador (`chart` + `recharts`)
- Grupo paralelo: G1
- Cubre: AC-7, AC-8, AC-9
- Tests: `ChartCard.test.tsx` — título, resumen, `role="img"` con `aria-label`, tabla dentro de `details` con las filas, y estado sin datos. `BarsChart.test.tsx` — render mínimo en jsdom: se define un `ResizeObserver` de prueba dentro del propio archivo de test (no se toca `vitest.setup.ts`) y, si `ChartContainer` no pinta las barras en jsdom, se mockea `ResponsiveContainer` de `recharts` con un tamaño fijo (800x400); se comprueba que aparecen las etiquetas de categoría y los valores, y que no lanza con `data` de un solo elemento.
- [x] Completada

## Grupos paralelos
- G1: T1, T2, T3, T4 (archivos disjuntos entre sí; T4 solo necesita la preparación del orquestador).

## Fases siguientes
- Spec 2 `dashboard-panel` y spec 3 `reportes-panel` (pueden ejecutarse en paralelo entre sí una vez terminada esta).
