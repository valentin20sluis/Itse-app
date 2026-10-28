# Configuración 1/6: feriados en base de datos (datos y consumo)

Estado: approved

## Objetivo
Los feriados dejan de ser una constante en código y pasan a la tabla `feriados`, sembrada con los 26 de hoy (2026-2027), y el cálculo de días hábiles (plazo de subsanación, días restantes, vencido) los lee de la BD. Esta spec **no agrega pantalla**: deja el comportamiento actual idéntico pero con datos editables. Es la primera de seis specs de la sección «Configuración» del superadmin (`/panel/configuracion`); crea también la tabla de auditoría que usan todas.

Cortes de la funcionalidad (orden obligatorio, cada una depende de la anterior salvo 5-6):
1. `configuracion-feriados-datos` (esta)
2. `configuracion-feriados-gestion` — CRUD + auditoría + páginas (hub y feriados)
3. `configuracion-catalogo-datos` — catálogo de observaciones en BD y su consumo
4. `configuracion-catalogo-gestion` — CRUD del catálogo
5. `configuracion-tasa-pago` — tasa en BD y consistencia con el pago
6. `configuracion-tasa-gestion` — formulario de la tasa

## Decisiones de diseño (valen para las 6 specs)
- **Qué se vuelve configurable:** (a) feriados; (b) catálogo de observaciones no relevantes; (c) monto de la tasa por tipo de ITSE (posterior = bajo/medio, previa = alto/muy alto). Son datos de la municipalidad o del TUPA, no norma nacional, y la regla de negocio §11 ya asigna al superadmin feriados y catálogo.
- **Se dejan fijos por ser norma:** vigencia del certificado de 2 años (Ley 30619; `VIGENCIA_ANIOS` en `vigencia.ts`) y plazos de subsanación de 3 y 20 días hábiles (DS 002-2018-PCM arts. 23 y 28; `plazoSubsanacionDias`). Cambiarlos desde pantalla permitiría emitir certificados o dar plazos contrarios a la ley.
- **Se deja fijo por costo/beneficio (candidato a fase posterior):** alerta de vencimiento de 60 días. Es una regla del sistema, pero está cableada en `estadoCertificado`, en los filtros de certificados, en los tramos 0-30 / 31-60 del reporte de vencimientos, en el dashboard y en el texto de la landing (`faq.ts`); hacerla configurable toca más de 8 archivos de lectura y de copy para un beneficio bajo. El hub de configuración (spec 2) muestra estas reglas fijas como información de solo lectura con su base legal.
- **Datos:** módulo nuevo `modules/configuracion/`. Tablas: `feriados` (spec 1), `configuracion_auditoria` (spec 1), `catalogo_observaciones` (spec 3), `tasas` y `expedientes.tasa_monto` (spec 5). Migraciones siguientes libres: `0022` (spec 1), `0023` (spec 3), `0024` (spec 5), una por spec y en ese orden (si se altera el orden, renumerar). Cada migración trae su `INSERT` de semilla con los datos de hoy; `drizzle-kit generate` crea el esquema y el developer añade el `INSERT` a mano al `.sql`.
- **Lectura en servidor:** consultas simples con `cache()` de React solo para evitar repetir la misma consulta dentro de una misma petición. Sin caché entre peticiones (`unstable_cache`, `use cache`): las páginas con sesión ya son dinámicas, así que un cambio se ve en la siguiente petición sin invalidar nada. Las funciones de lectura que usan los flujos normales (`getFeriados`, etc.) no exigen rol (los datos no son sensibles y ninguna Server Action las expone); las de listado para la pantalla de configuración exigen `superadmin`.
- **Escritura y auditoría (specs 2, 4, 6):** `requireRole("superadmin")` en página y acción, `assertSuperadmin(actor)` en el servicio, zod en la frontera. Cada cambio escribe el dato **y** su fila en `configuracion_auditoria` en un único `db.batch([...])` (transacción del driver, igual que `transicion.service.ts`): o quedan ambos o ninguno. Más estricto que `usuarios_auditoria`, porque aquí «cada cambio auditado» es requisito. Límite aceptado: `valor_anterior` se lee justo antes del lote; si dos superadmins editan el mismo registro en el mismo instante, el anterior registrado puede quedar desfasado.
- **Histórico:** un expediente ya emitido no cambia. Feriados: `subsanacion_limite` ya guarda la fecha límite calculada; los «días restantes» y «vencido» se recalculan siempre con los feriados vigentes (límite declarado). Catálogo: `observaciones_diligencia` ya guarda `codigo` y `descripcion` copiados. Tasa: `expedientes.tasa_monto` guarda el monto cobrado. Certificado: `certificados.vence_at` ya guarda el vencimiento.
- **Convenciones:** nombres de dominio en español (`feriado`, `catalogo`, `tasa`), infraestructura en inglés (`SETUP.md` §1.1). Textos en español sin términos técnicos. Botón principal con la variante por defecto del tema (azul). Tarjetas con `Card` (borde y sombra actuales). Solo tokens del tema. No se leen `.env*`.

## Fuera de alcance
- Pantalla de feriados (spec 2), catálogo (3-4), tasa (5-6).
- Gestión de usuarios (ya existe), perfil del cliente, jobs/cron, importación masiva de feriados.
- Recalcular o reescribir `subsanacion_limite` de expedientes existentes al cambiar feriados.
- Cambiar vigencia, plazos de subsanación o alerta de 60 días.

## Reutilización
- Existente que se reutiliza: `modules/inspecciones/utils/dias-habiles.ts` (`esDiaHabil`, `sumarDiasHabiles`, `estadoPlazo` ya reciben `feriados` como parámetro); `db` y el patrón de servicios con `Actor`; `usuarios` (FK del actor de la auditoría).
- Existente que se extiende: `modules/inspecciones/utils/plazo-subsanacion.ts` (`calcularLimiteSubsanacion` recibe `feriados`); `diligencia.service.ts`, `subsanacion.service.ts`, `PanelInspeccion.tsx`, `PlazoSubsanacion.tsx`, `ExpedienteDetalleCliente.tsx` y la página de detalle del cliente (leen feriados de la BD).
- Nuevo (y por qué): `modules/configuracion/services/feriado-lectura.service.ts` (no hay lectura de BD para feriados); tablas `feriados` y `configuracion_auditoria` (los feriados no existían en BD y la auditoría de configuración es transversal a las 3 entidades).
- Se elimina: `modules/inspecciones/constants/feriados.ts`.
- Dependencias / componentes shadcn a instalar antes de implementar: ninguno.

## Specs afectadas
- `docs/specs/plazos-dias-habiles.md` y `docs/specs/subsanacion-requisitos.md`: el origen de los feriados pasa de constante a BD; las reglas de días hábiles no cambian.
- Tests existentes que cambian: `dias-habiles.test.ts` y `plazo-subsanacion.test.ts` (pasan los feriados como arreglo explícito, ya no importan `FERIADOS`), `diligencia.service.test.ts` y `subsanacion.service.test.ts` (mockean `getFeriados`), `PlazoSubsanacion.test.tsx` (prop `feriados`), `app/mi-cuenta/expedientes/[id]/page.test.tsx` (mockea `getFeriados`).
- Documentación (orquestador, al cerrar la spec 6): `docs/reglas-negocio-itse.md` §7.3, §11 y nota final; `docs/constitucion-itse.md` §6.

## Criterios de aceptación
- AC-1 (migración y semilla): la migración `0022` crea `feriados` (`fecha` date clave primaria, `nombre`, `created_at`, `updated_at`), los enums `entidad_configuracion` (`FERIADO`, `OBSERVACION`, `TASA`) y `accion_configuracion` (`CREAR`, `EDITAR`, `ELIMINAR`, `ACTIVAR`, `DESACTIVAR`) y `configuracion_auditoria` (`id`, `actor_id` FK a `usuarios` con `restrict`, `entidad`, `accion`, `referencia`, `valor_anterior`, `valor_nuevo`, `created_at`, índice por `entidad, created_at`). Inserta exactamente los 26 feriados de `feriados.ts` con su nombre y con `ON CONFLICT DO NOTHING`. Verificación: lectura del `.sql` y que `db/schema.ts` y el snapshot coinciden (`npx drizzle-kit generate` no produce cambios nuevos).
- AC-2 (lectura): `getFeriados()` devuelve las fechas `YYYY-MM-DD` ordenadas ascendentemente, sin exigir rol, y llama a la BD una sola vez por petición. Test con `@/db` simulado (incluido el caso de tabla vacía → `[]`).
- AC-3 (plazos): `calcularLimiteSubsanacion(tipo, suspendidaEn, feriados)` suma días hábiles con los feriados recibidos; con los 26 feriados de la semilla da las mismas fechas que antes de la spec (misma batería de casos del test actual). Tests.
- AC-4 (servicios): `registrarResultadoDiligencia` calcula `subsanacion_limite` y `evaluarSubsanacion`/`presentarSubsanacion` evalúan el vencimiento con los feriados leídos de la BD; un feriado extra en el mock mueve el límite un día hábil. Tests de servicio.
- AC-5 (pantallas): `PanelInspeccion` (rama `EN_SUBSANACION`, rango máximo de reprogramación y `vencido`), `PlazoSubsanacion` y `ExpedienteDetalleCliente` usan los feriados de la BD; ninguna usa la constante. Tests de `PlazoSubsanacion` (días restantes con y sin un feriado intermedio) y de la página del cliente (llama `getFeriados` y pasa el resultado).
- AC-6 (sin constante): tras T6 `modules/inspecciones/constants/feriados.ts` no existe, `esDiaHabil`/`sumarDiasHabiles`/`estadoPlazo` exigen el parámetro `feriados` y `grep -rn "constants/feriados"` no devuelve resultados. `npm run build`, `npm run lint` y `npx vitest run` pasan.
- AC-7 (comportamiento): sin cambios visibles para el usuario final: mismas fechas límite y mismos días restantes que antes con la semilla.

## Tareas
### T1 — Tablas, enums y semilla
- Archivos: `db/schema.ts` (modificar), `drizzle/0022_<nombre generado>.sql` (crear), `drizzle/meta/_journal.json` (modificar), `drizzle/meta/0022_snapshot.json` (crear)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-1
- Detalle: `feriados.fecha` con `date("fecha", { mode: "string" })`. Semilla (nombre por fecha): 01-01 «Año Nuevo»; 2026-04-02 y 2027-03-25 «Jueves Santo»; 2026-04-03 y 2027-03-26 «Viernes Santo»; 05-01 «Día del Trabajo»; 06-29 «San Pedro y San Pablo»; 07-28 y 07-29 «Fiestas Patrias»; 08-30 «Santa Rosa de Lima»; 10-08 «Combate de Angamos»; 11-01 «Todos los Santos»; 12-08 «Inmaculada Concepción»; 12-09 «Batalla de Ayacucho»; 12-25 «Navidad» (cada año 2026 y 2027). Exportar los tipos `Feriado` y `ConfiguracionAuditoria`.
- Tests: no aplica (esquema y SQL; se valida con `drizzle-kit generate` sin cambios y `npm run build`).
- [x] Completada

### T2 — Lectura de feriados y parámetro explícito en el plazo
- Archivos: `modules/configuracion/services/feriado-lectura.service.ts` (crear), `modules/configuracion/services/feriado-lectura.service.test.ts` (crear), `modules/inspecciones/utils/plazo-subsanacion.ts` (modificar), `modules/inspecciones/utils/plazo-subsanacion.test.ts` (modificar)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-2, AC-3
- Detalle: `getFeriados(): Promise<string[]>` envuelto en `cache()` de React. `calcularLimiteSubsanacion(tipo, suspendidaEn, feriados = FERIADOS)`: el valor por defecto se conserva solo hasta T6 para no romper a los consumidores intermedios.
- Tests: lectura (orden, vacío, una consulta) y plazo (misma batería con feriados explícitos; un feriado extra mueve el límite).
- [x] Completada

### T3 — Servicios de diligencia y subsanación
- Archivos: `modules/inspecciones/services/diligencia.service.ts` (modificar), `modules/inspecciones/services/diligencia.service.test.ts` (modificar), `modules/inspecciones/services/subsanacion.service.ts` (modificar), `modules/inspecciones/services/subsanacion.service.test.ts` (modificar)
- Depende de: T2
- Grupo paralelo: G3
- Cubre: AC-4, AC-7
- Detalle: cada función que calcula o evalúa un plazo llama `getFeriados()` una vez y lo pasa a `calcularLimiteSubsanacion` / `estadoPlazo`.
- Tests: los existentes con `getFeriados` simulado devolviendo los 26 de la semilla; un caso por servicio con un feriado extra.
- [x] Completada

### T4 — Panel de inspección y tarjeta de plazo
- Archivos: `modules/inspecciones/components/PanelInspeccion.tsx` (modificar), `modules/inspecciones/components/PlazoSubsanacion.tsx` (modificar), `modules/inspecciones/components/PlazoSubsanacion.test.tsx` (modificar)
- Depende de: T2
- Grupo paralelo: G3
- Cubre: AC-5, AC-7
- Detalle: `PlazoSubsanacion` recibe la prop obligatoria `feriados: readonly string[]` (sigue siendo componente de servidor, sin leer BD). `PanelInspeccion` (ya asíncrono) llama `getFeriados()` y lo pasa a `PlazoSubsanacion`, a `estadoPlazo` y a `calcularLimiteSubsanacion("PREVIA", ahora, feriados)`.
- Tests: `PlazoSubsanacion` con y sin feriado entre hoy y el límite.
- [x] Completada

### T5 — Detalle del cliente
- Archivos: `modules/expedientes/components/ExpedienteDetalleCliente.tsx` (modificar), `app/mi-cuenta/expedientes/[id]/page.tsx` (modificar), `app/mi-cuenta/expedientes/[id]/page.test.tsx` (modificar)
- Depende de: T4
- Grupo paralelo: G4
- Cubre: AC-5, AC-7
- Detalle: la página agrega `getFeriados()` al `Promise.all` y lo pasa por la prop `feriados` a `ExpedienteDetalleCliente`, que lo usa en `estadoPlazo` y se lo pasa a `PlazoSubsanacion`.
- Tests: la página llama `getFeriados` y entrega el resultado al componente.
- [x] Completada

### T6 — Retirar la constante
- Archivos: `modules/inspecciones/utils/dias-habiles.ts` (modificar), `modules/inspecciones/utils/dias-habiles.test.ts` (modificar), `modules/inspecciones/utils/plazo-subsanacion.ts` (modificar), `modules/inspecciones/utils/plazo-subsanacion.test.ts` (modificar), `modules/inspecciones/constants/feriados.ts` (eliminar)
- Depende de: T3, T4, T5
- Grupo paralelo: G5
- Cubre: AC-6
- Detalle: `feriados` pasa a parámetro obligatorio en `esDiaHabil`, `sumarDiasHabiles`, `estadoPlazo` y `calcularLimiteSubsanacion`; se borra el import y el archivo de la constante. Los tests declaran su propio arreglo de feriados.
- Tests: `dias-habiles.test.ts` (fines de semana, feriado en medio, sin feriados) y `plazo-subsanacion.test.ts` actualizados.
- [x] Completada

## Grupos paralelos
G1: T1. G2: T2. G3: T3 y T4 (archivos disjuntos). G4: T5. G5: T6.

## Fases siguientes
- Fase 2: `configuracion-feriados-gestion` (CRUD, auditoría y páginas).
- Fases 3 a 6: catálogo y tasa (ver Objetivo).
