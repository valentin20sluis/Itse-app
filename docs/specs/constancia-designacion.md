# Constancia de Designación (PDF)

Estado: approved

Parte 4 de 4 de `inspeccion`. **Depende de `designacion-inspectores`**. Como también modifica `PanelInspeccion.tsx` (igual que `diligencia-inspeccion` T5), debe implementarse **después** de `diligencia-inspeccion` (o resolver el orden en la integración); no es paralela con ella.

## Objetivo
El personal descarga, desde el detalle del expediente, la **Constancia de Designación** en PDF: documento que lista los inspectores designados para el expediente, que el inspector retira junto con el expediente (`reglas-negocio` secciones 5 y 10). Es además el primer PDF del proyecto: fija el patrón (generación en servidor, descarga protegida) que reutilizará `certificados`.

## Por qué es una spec aparte (y no va en `designacion-inspectores` ni en `certificados`)
Instala `@react-pdf/renderer`, crea una ruta de descarga y un documento con maquetación: es una unidad de trabajo distinta de la designación (que ya deja el estado correcto sin PDF) y no depende de la diligencia. Dejarla para `certificados` retrasaría un documento que la sección 10 asocia a `INSPECTOR_DESIGNADO`; hacerla antes allí evita que `certificados` cargue con la dependencia y el patrón a la vez. **Si el humano prefiere recortar el alcance, esta spec puede posponerse y fusionarse dentro de `certificados` sin afectar a las otras tres.**

## Fuera de alcance
- Firma digital o sello del jefe: el PDF trae la línea de firma y el nombre, nada más (`reglas-negocio` sección 12).
- Guardar el PDF (UploadThing/BD): se genera al vuelo y es determinista, no se almacena.
- Que el cliente la descargue (es un documento interno del personal) y QR/verificación pública (son del certificado).
- Constancia de reemplazo si cambian los inspectores (no hay reasignación, ver `designacion-inspectores`).
- Logo o escudo de la municipalidad.

## Decisiones (a confirmar al aprobar)
1. **Número:** `CD-AAAA-NNNNN`, derivado del número del expediente (`EXP-2026-00001` → `CD-2026-00001`). Un expediente tiene una sola constancia, por lo que el número es único sin contador ni secuencia. Se desvía de «correlativo por año» solo en que no es independiente del expediente; `reglas-negocio` sección 10 se actualiza (T4).
2. **Fecha:** la de la designación (la más antigua de `designaciones.created_at` del expediente), no la de la descarga: el PDF es idéntico cada vez.
3. **Nombre del jefe:** el del usuario que aprobó en Jefatura (última fila de `historial_estados` con `estado_nuevo = APROBADO_JEFATURA`). Si no existiera esa fila, el PDF muestra solo «Jefe de GRDyDC».
4. **Quién descarga:** `admin` y `superadmin`; el resto recibe 404 (no se revela que existe). No se emite para expedientes `ANULADO`.
5. **Marca académica:** pie «Proyecto académico. Documento sin validez oficial.» (`constitucion` sección 10), fuente integrada de PDF (Helvetica) para no depender de red.

## Reutilización
- Existente que se reutiliza: patrón de descarga protegida de `app/api/documentos/[id]/route.ts` (usuario → 401, id uuid, 404 genérico); `getOrCreateUser` (`modules/usuarios/services/user.service.ts`); `tipoItsePorRiesgo`; `RIESGO_LABELS`; `formatFecha` (`format-fecha.ts`); tabla `designaciones`/`inspectores` (specs previas).
- Existente que se extiende: `modules/inspecciones/components/PanelInspeccion.tsx` (enlace de descarga); `docs/reglas-negocio-itse.md` sección 10; `package.json` y `package-lock.json` (dependencia).
- Nuevo (y por qué): `constancia.service.ts`, `constancia-numero.ts`, el documento PDF y la ruta de descarga (no existe ningún PDF en el proyecto).
- **Dependencia a instalar antes de implementar** (preparación del orquestador o T1): `npm install @react-pdf/renderer` — versión con soporte de React 19 (4.1 o superior; verificar al instalar). **No** hace falta tocar `next.config.ts`: `@react-pdf/renderer` ya está en la lista de paquetes externos de servidor por defecto de Next (`node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverExternalPackages.md`). No se instala `qrcode` (es del certificado). Componentes shadcn: ninguno.
- Patrón: el PDF se genera **solo en servidor** (`renderToBuffer` dentro de un route handler Node), nunca se importa `@react-pdf/renderer` desde un componente `"use client"`.

## Specs afectadas
- `designacion-inspectores` / `diligencia-inspeccion`: `PanelInspeccion` gana un enlace; su comportamiento anterior no cambia.
- `docs/reglas-negocio-itse.md` sección 10: número `CD-AAAA-NNNNN`, generación bajo demanda, jefe = quien aprobó en Jefatura (T4).
- `certificados` (futura): reutiliza la dependencia y el patrón de ruta de este documento.

## Criterios de aceptación
- AC-1 (número): `numeroConstancia("EXP-2026-00001")` devuelve `"CD-2026-00001"`; devuelve `null` para cualquier cadena que no cumpla `^EXP-\d{4}-\d{5}$` (vacía, otro prefijo, longitudes distintas).
- AC-2 (datos): `getConstanciaData(actor, expedienteId)` lanza `Error("No autorizado")` si el actor es `cliente`; devuelve `null` si el expediente no existe, tiene `numero` nulo o `nivelRiesgo` nulo, está `ANULADO` o no tiene designaciones. Si no, devuelve `numero` (constancia), `expedienteNumero`, establecimiento (`nombreComercial`, `direccion`, `distrito`), `nivelRiesgo`, `tipoItse`, `inspectores` (`nombre` «Apellidos, Nombres» y `documento`, ordenados por apellidos), `fechaDesignacion` y `jefeNombre` (o `null`). No incluye teléfono ni correo de los inspectores.
- AC-3 (ruta): `GET /api/expedientes/[id]/constancia` responde 401 sin usuario o con usuario inactivo; 404 para `cliente`, para id no uuid y cuando `getConstanciaData` devuelve `null`; y 200 para admin/superadmin con `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="constancia-CD-2026-00001.pdf"` y `Cache-Control: private, no-store`. El cuerpo empieza con `%PDF`.
- AC-4 (documento): el PDF (A4) contiene: título «Constancia de Designación de Inspectores», número de constancia, número de expediente, establecimiento y dirección, nivel de riesgo y tipo de ITSE (previa/posterior), tabla de inspectores (nombre y documento) con su cantidad, fecha de designación `dd/MM/yyyy`, línea de firma con «Jefe de GRDyDC» y el nombre del jefe si existe, y el pie académico. Textos con tildes correctos y sin fuentes externas.
- AC-5 (enlace, UI): `PanelInspeccion` muestra a admin/superadmin, cuando hay designaciones y el expediente no está `ANULADO`, un enlace «Descargar constancia» a `/api/expedientes/<id>/constancia` (`inline-flex min-h-11`, foco visible, nombre accesible que incluye el número del expediente). El cliente no lo ve (la sección del cliente es `InspeccionResumen`, que no lo incluye).
- AC-6 (seguridad y aislamiento): ningún dato de la constancia llega a `app/mi-cuenta/*`; la ruta no acepta parámetros del cliente más allá del id; `@react-pdf/renderer` solo se importa en `ConstanciaDesignacionDocument.tsx` y en `route.ts` (grep).
- AC-7 (docs): `docs/reglas-negocio-itse.md` sección 10 refleja las decisiones 1 a 3.
- AC-8: `npm run build`, `npm run lint` y `npx vitest run` pasan (el build confirma que el PDF se resuelve en servidor); sin `any`/`@ts-ignore`; solo tokens del tema en el enlace.

## Tareas
### T1 — Dependencia y número de constancia
- Archivos: `package.json` (modificar), `package-lock.json` (modificar), `modules/inspecciones/utils/constancia-numero.ts` (crear), `modules/inspecciones/utils/constancia-numero.test.ts` (crear)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-1
- Detalle: `npm install @react-pdf/renderer`; no tocar otras dependencias.
- Tests: `constancia-numero.test.ts` — formato válido y los casos inválidos de AC-1.
- [ ] Completada

### T2 — Servicio de datos de la constancia
- Archivos: `modules/inspecciones/services/constancia.service.ts` (crear), `modules/inspecciones/services/constancia.service.test.ts` (crear)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-2, AC-6 (datos)
- Tests: cliente rechazado; `null` por cada causa de AC-2; datos completos con `db` mockeado; ausencia de teléfono/correo; `jefeNombre` nulo sin fila de aprobación.
- [ ] Completada

### T3 — Documento PDF y ruta de descarga
- Archivos: `modules/inspecciones/components/ConstanciaDesignacionDocument.tsx` (crear), `app/api/expedientes/[id]/constancia/route.ts` (crear), `app/api/expedientes/[id]/constancia/route.test.ts` (crear)
- Depende de: T2
- Grupo paralelo: G3
- Cubre: AC-3, AC-4, AC-6 (ruta)
- Detalle: `route.ts` usa `renderToBuffer` y responde `new NextResponse(new Uint8Array(buffer), …)`; sigue el patrón de `app/api/documentos/[id]/route.ts`.
- Tests: `route.test.ts` — 401, 404 (cliente, id no uuid, datos `null`), 200 con las tres cabeceras de AC-3 (con `getOrCreateUser`, `getConstanciaData` y `renderToBuffer` mockeados). El documento es presentacional (SETUP.md 3.2).
- [ ] Completada

### T4 — Enlace de descarga y documentación
- Archivos: `modules/inspecciones/components/PanelInspeccion.tsx` (modificar), `docs/reglas-negocio-itse.md` (modificar)
- Depende de: T3 y `diligencia-inspeccion` T5
- Grupo paralelo: G4
- Cubre: AC-5, AC-7
- Tests: no aplica (enlace presentacional y documentación; SETUP.md 3.2).
- [ ] Completada

## Grupos paralelos
Secuencial por contrato (dependencia → servicio → ruta → enlace); no hay paralelismo útil.

## Fases siguientes
- Spec `certificados`: aprobación del superadmin, PDF del certificado con QR y vigencia, reutilizando el patrón de este documento.
