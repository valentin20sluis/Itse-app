# Configuración 3/6: catálogo de observaciones en base de datos (datos y consumo)

Estado: approved

## Objetivo
El catálogo de observaciones no relevantes (reglas de negocio §7.3) deja de ser una constante de 6 ejemplos y pasa a la tabla `catalogo_observaciones`, sembrada con esas mismas 6, con campo `activo`. El registro del resultado de la diligencia lee el catálogo activo de la BD. Sin pantalla aún (spec 4). Comparte las «Decisiones de diseño» de `docs/specs/configuracion-feriados-datos.md`.

## Decisiones
- **Sin campo «relevante/no relevante»:** por §7.3 y §7.5 el catálogo **es** la lista de observaciones no relevantes; todo lo que no está en él es relevante en ITSE posterior. Agregar una marca contradiría esa regla. Una observación relevante se registra como texto libre, como hoy.
- **Desactivar, no borrar:** una observación desactivada deja de ofrecerse y de aceptarse en registros nuevos, pero las ya registradas en expedientes no cambian (`observaciones_diligencia` guarda `codigo` y `descripcion` copiados).
- **Código estable:** `codigo` es único e inmutable (los 6 actuales se conservan tal cual en la semilla para que coincidan con lo ya registrado). Las altas nuevas lo generan el sistema (spec 4); no se muestra al usuario.
- **Efecto en ITSE previa:** sin cambios; allí las observaciones siguen siendo texto libre y el catálogo es un apoyo opcional.
- **Carrera:** si el superadmin desactiva una observación mientras un admin tiene el formulario abierto, el servidor rechaza el código con el estado existente `observacion_invalida` (mensaje ya mostrado por la acción).

## Fuera de alcance
- Pantalla y alta/edición/desactivación (spec 4).
- Completar la lista con el Anexo 9 oficial (pasa a ser tarea de carga del superadmin desde la pantalla).
- Categorías, orden manual o versiones de observaciones.

## Reutilización
- Existente que se reutiliza: `configuracion_auditoria` y los enums de la spec 1; `observacionesDiligencia` (sin cambios); `evaluarObservaciones` y `registrarResultadoDiligencia` como puntos de consumo.
- Existente que se extiende: `observaciones.ts`, `diligencia.service.ts`, `ResultadoDiligenciaForm.tsx`, `PanelInspeccion.tsx`.
- Nuevo (y por qué): tabla `catalogo_observaciones` y `catalogo-lectura.service.ts` (no existe lectura de BD); el tipo `ObservacionCatalogo` pasa a `modules/configuracion/types/configuracion.types.ts` porque el archivo de la constante se elimina.
- Se elimina: `modules/inspecciones/constants/observaciones-no-relevantes.ts`.
- Dependencias / componentes shadcn a instalar antes de implementar: ninguno.

## Specs afectadas
- `docs/specs/observaciones-diligencia.md`: el origen del catálogo pasa de constante a BD; reglas §7.5 sin cambios.
- Tests existentes que cambian: `observaciones.test.ts`, `diligencia.service.test.ts`, `ResultadoDiligenciaForm.test.tsx`.
- Documentación (spec 6): `reglas-negocio-itse.md` §7.3 («definida como constante… no hay tabla»).

## Criterios de aceptación
- AC-1 (migración y semilla): la migración `0023` crea `catalogo_observaciones` (`id` uuid, `codigo` único no nulo, `descripcion` no nulo, `activo` booleano por defecto `true`, `created_at`, `updated_at`) e inserta las 6 observaciones actuales con el mismo `codigo` y la misma `descripcion`, con `ON CONFLICT (codigo) DO NOTHING`. `drizzle-kit generate` no produce cambios nuevos.
- AC-2 (lectura): `getCatalogoActivo()` devuelve solo las activas, ordenadas por descripción, una consulta por petición, sin exigir rol. Test (incluye catálogo vacío).
- AC-3 (evaluación): `evaluarObservaciones(tipo, input, catalogo)` considera inválido (`codigo_invalido`) un código ausente del catálogo recibido o repetido; en POSTERIOR con textos libres devuelve `relevante`; sin nada devuelve `sin_observaciones`. Un código desactivado (no incluido en el catálogo activo) es inválido. Tests.
- AC-4 (registro): `registrarResultadoDiligencia` usa `getCatalogoActivo()` tanto para validar como para copiar `codigo` y `descripcion` a `observaciones_diligencia`; con un código desactivado devuelve `observacion_invalida` y no escribe; con la semilla el comportamiento es idéntico al actual. Tests.
- AC-5 (formulario): `ResultadoDiligenciaForm` recibe el catálogo por la prop `catalogo` y lista solo esas casillas; con catálogo vacío en ITSE posterior muestra «No hay observaciones no relevantes activas: cualquier observación será relevante.» y no ofrece casillas. Tests.
- AC-6 (sin constante): `grep -rn "observaciones-no-relevantes"` no devuelve resultados. `npm run build`, `npm run lint` y `npx vitest run` pasan.
- AC-7 (histórico): editar o desactivar el catálogo no modifica filas de `observaciones_diligencia` (no hay `UPDATE`/FK desde esa tabla hacia el catálogo). Revisión de esquema por el reviewer.

## Tareas
### T1 — Tabla y semilla del catálogo
- Archivos: `db/schema.ts` (modificar), `drizzle/0023_<nombre generado>.sql` (crear), `drizzle/meta/_journal.json` (modificar), `drizzle/meta/0023_snapshot.json` (crear)
- Depende de: ninguna (spec 1 implementada)
- Grupo paralelo: G1
- Cubre: AC-1, AC-7
- Detalle: las 6 filas con los códigos `RETIRAR_OBSTACULOS_EVACUACION`, `COLOCAR_SENALIZACION`, `EXTINTORES`, `TAPAS_TABLEROS_ELECTRICOS`, `TAPA_CAJAS_DE_PASO`, `ILUMINACION_TABLEROS` y las descripciones textuales de `observaciones-no-relevantes.ts`. Exportar el tipo `CatalogoObservacion`.
- Tests: no aplica (esquema y SQL).
- [x] Completada

### T2 — Lectura del catálogo
- Archivos: `modules/configuracion/services/catalogo-lectura.service.ts` (crear), `modules/configuracion/services/catalogo-lectura.service.test.ts` (crear), `modules/configuracion/types/configuracion.types.ts` (crear)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-2
- Detalle: `configuracion.types.ts` exporta `ObservacionCatalogo = { codigo: string; descripcion: string }`. `getCatalogoActivo()` con `cache()` de React.
- Tests: solo activas, orden, vacío, una consulta.
- [x] Completada

### T3 — Formulario del resultado con catálogo por prop
- Archivos: `modules/inspecciones/components/ResultadoDiligenciaForm.tsx` (modificar), `modules/inspecciones/components/ResultadoDiligenciaForm.test.tsx` (modificar), `modules/inspecciones/components/PanelInspeccion.tsx` (modificar)
- Depende de: T2
- Grupo paralelo: G3
- Cubre: AC-5
- Detalle: prop obligatoria `catalogo: readonly ObservacionCatalogo[]`; `PanelInspeccion` la llena con `await getCatalogoActivo()` en la rama `DILIGENCIA_PROGRAMADA`. Deja de importar la constante.
- Tests: casillas según prop; catálogo vacío en POSTERIOR muestra el aviso; en PREVIA no cambia.
- [x] Completada

### T4 — Evaluación y servicio de diligencia; retirar la constante
- Archivos: `modules/inspecciones/utils/observaciones.ts` (modificar), `modules/inspecciones/utils/observaciones.test.ts` (modificar), `modules/inspecciones/services/diligencia.service.ts` (modificar), `modules/inspecciones/services/diligencia.service.test.ts` (modificar), `modules/inspecciones/constants/observaciones-no-relevantes.ts` (eliminar)
- Depende de: T3
- Grupo paralelo: G4
- Cubre: AC-3, AC-4, AC-6, AC-7
- Detalle: `evaluarObservaciones(tipo, input, catalogo: readonly ObservacionCatalogo[])` (parámetro obligatorio); `registrarResultadoDiligencia` lee `getCatalogoActivo()` una vez, lo usa para validar y para `filasObservaciones` (reemplaza a `buscarObservacion`). Se borra la constante y `buscarObservacion`.
- Tests: casos de AC-3 y AC-4 con catálogo simulado (incluido código desactivado y semilla completa).
- [x] Completada

## Grupos paralelos
G1: T1. G2: T2. G3: T3. G4: T4. (Cadena por contratos: tabla → lectura → componente → servicio.)

## Fases siguientes
- Fase 4: `configuracion-catalogo-gestion` (alta, edición y desactivación con auditoría).
