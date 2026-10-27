# Establecimientos del cliente (CRUD con propiedad por dueño)

Estado: approved

## Objetivo
Permitir que el cliente (administrado) registre, edite y archive los establecimientos que luego inspeccionará la ITSE, desde `/mi-cuenta/establecimientos`. Cada cliente solo ve y modifica los suyos. Es prerrequisito de `solicitud-itse` (cada solicitud apunta a un establecimiento). Admin y superadmin podrán consultarlos (solo lectura) a través de la capa de servicio cuando exista la bandeja.

## Fuera de alcance
- Vista de establecimientos en el panel (`/panel`): se hará con `bandeja-estados`. Aquí solo se deja la función de servicio con autorización explícita para staff, sin pantalla.
- Declarar o calcular el nivel de riesgo, y las preguntas orientativas (sótano, inflamables): pertenecen a la solicitud (wizard), no al establecimiento (reglas de negocio sección 2.1: el cliente declara en el wizard y el admin confirma).
- Aforo, RUC, licencia de funcionamiento, fotos o documentos del local.
- Restaurar un establecimiento archivado, ver la lista de archivados, borrado físico.
- Paginación y búsqueda (un cliente tiene pocos locales; se agrega si hace falta).
- Impedir archivar si hay expedientes activos: la tabla `expedientes` aún no existe. Queda anotado para `solicitud-itse`.
- Roles distintos de `cliente` creando o editando establecimientos.

## Hallazgos (estado actual del repo)
- Existen `db/schema.ts` (`usuarios`, `rolEnum`), `db/index.ts` (Drizzle `neon-http`, sin transacciones: cada operación debe ser una sola sentencia), migración `0000` y `drizzle.config.ts`.
- `requireRole(...roles)` (`modules/usuarios/services/authorization.service.ts`) devuelve el `Usuario` (con `id` uuid y `rol`) o redirige. Debe llamarse en cada página y Server Action (el layout no protege acciones).
- `/mi-cuenta/establecimientos` hoy lo sirve `app/mi-cuenta/[section]/page.tsx` como "Próximamente". Una ruta estática `app/mi-cuenta/establecimientos/page.tsx` tiene prioridad y debe llamar `requireRole("cliente")` ella misma. El ítem del menú ya existe en `modules/navigation/constants/nav-items.ts` (no se toca).
- `components/ui/` tiene `button, card, badge, input, sheet, accordion, carousel, separator, skeleton, tooltip, sidebar`. Faltan `alert-dialog` y `label`. `components/shared/` tiene `PageHeader` y `EmptyState` (reutilizables tal cual).
- Next 16 (`node_modules/next/dist/docs/01-app/02-guides/forms.md` y `server-actions.md`): formularios con `<form action>` + `useActionState`; Server Actions con `"use server"`; revalidar con `revalidatePath`.
- Zod v4: errores por campo con `z.flattenError(error).fieldErrors`; mensajes personalizados con el parámetro `error`.
- Constitución sección 3: toda Server Action = usuario, rol, Zod, propiedad del recurso, revalidar, resultado `{ ok: true, data } | { ok: false, error }`.

## Decisiones de diseño
- **Sin `nivelRiesgo` en el establecimiento.** El riesgo depende de la solicitud (la declara el cliente en el wizard, la confirma el admin) y puede cambiar entre trámites. Guardar `areaM2` y `numeroPisos` aquí sirve luego para sugerir el riesgo (>3 pisos o >750 m² → ALTO), sin decidirlo.
- **Archivar = borrado lógico** (`archivado_at timestamptz` nulo; no un booleano, para saber cuándo). Motivo: las solicitudes y certificados futuros referencian al establecimiento y no deben perder su historial. La FK desde expedientes será `restrict`, por lo que un borrado físico quedaría bloqueado de todos modos. Los archivados no se listan ni se pueden editar.
- **Propiedad aplicada en la consulta SQL, no después.** Editar y archivar son un único `UPDATE ... WHERE id = ? AND usuario_id = ? AND archivado_at IS NULL RETURNING`: si no hay fila, el resultado es "no encontrado" (el mismo para "no existe" y "es de otro", para no filtrar existencia). Es atómico y funciona con `neon-http`.
- **Autorización explícita en el servicio** (defensa en profundidad, además de `requireRole` en la acción): las funciones reciben un `actor: { id, rol }`. Mutaciones y `listOwn`: solo `cliente` (otro rol lanza `Error("No autorizado")`). `getEstablecimientoById`: `cliente` ve solo uno propio y no archivado; `admin`/`superadmin` ven cualquiera, incluso archivado, solo lectura. El listado para staff no se crea ahora (YAGNI; lo añade `bandeja-estados`).
- **Server Actions + zod, sin React Query/axios/zustand/react-table.** Lecturas en Server Component, mutaciones con Server Actions y `revalidatePath` (constitución sección 1.1). Un cliente tiene pocos locales: tarjetas, no tabla (por eso no `@tanstack/react-table`). Sin `react-hook-form`: formulario nativo con `useActionState`; errores del servidor por campo (el mismo schema valida; la validación del navegador usa `required`, `type`, `min`, `max`).
- **Un solo schema zod** (`establecimientoSchema`) usado por las acciones (servidor) y exportado para el cliente. Para formularios nativos, los números llegan como texto: se usa `z.coerce.number()`.
- **UI:** listado de `Card` en cuadrícula (1 columna a 360 px, 2 en `md`, 3 en `xl`); crear y editar en un `Sheet` (se abre desde la derecha en escritorio y ocupa el ancho en móvil); confirmación de archivado con `AlertDialog`.
- **Campos** (todo ficticio en demos): `nombreComercial`, `direccion`, `distrito`, `giro`, `areaM2`, `numeroPisos`. El dueño es `usuarioId`.

## Modelo de datos

Tabla `establecimientos`:

| Columna SQL | Tipo | Reglas |
|---|---|---|
| `id` | uuid pk | default aleatorio |
| `usuario_id` | uuid, no nulo | FK a `usuarios.id`, `onDelete: restrict`, índice |
| `nombre_comercial` | text, no nulo | 3 a 100 caracteres, con trim |
| `direccion` | text, no nulo | 5 a 200 caracteres |
| `distrito` | text, no nulo | 2 a 80 caracteres |
| `giro` | text, no nulo | 3 a 100 caracteres (actividad, p. ej. "Bodega", "Botica") |
| `area_m2` | numeric(10,2), no nulo | mayor que 0 y hasta 100000 (área techada total) |
| `numero_pisos` | integer, no nulo | entero de 1 a 50 |
| `archivado_at` | timestamptz, nulo | nulo = activo |
| `created_at`, `updated_at` | timestamptz | default `now()` |

## Reutilización
- Existente que se reutiliza: `components/shared/PageHeader.tsx`, `components/shared/EmptyState.tsx`; `components/ui/` `card`, `button` (y `buttonVariants`), `input`, `sheet`, `badge`; `requireRole` de `modules/usuarios/services/authorization.service.ts`; `Usuario`/`Role` de `modules/usuarios/types/user.types.ts`; `db` y `usuarios` de `db/`; `cn`; lucide-react.
- Existente que se extiende: `db/schema.ts` (tabla nueva `establecimientos`). `app/mi-cuenta/[section]/page.tsx` NO se modifica: la ruta estática nueva lo reemplaza para esta URL.
- Nuevo (y por qué): `modules/establecimientos/` (dominio propio, constitución sección 2); `lib/action-result.ts` (el tipo `ActionResult` lo usarán todas las specs de dominio; transversal, va en `lib/`).
- Dependencias / componentes shadcn a instalar antes de implementar (preparación del orquestador, una sola vez): `npx shadcn@latest add alert-dialog label`. Responder NO a sobrescribir `button`, `sheet` o `input`. El developer debe leer `components/ui/alert-dialog.tsx` generado (props Base UI, no Radix) antes de usarlo. Sin dependencias npm nuevas.
- Prerrequisito manual del usuario: `npm run db:migrate` tras T1.

## Criterios de aceptación
- AC-1: `db/schema.ts` define `establecimientos` con las columnas de la sección "Modelo de datos" (nombres SQL en snake_case, campos Drizzle en camelCase), FK `usuario_id` → `usuarios.id` con `restrict` e índice en `usuario_id`. `npm run db:generate` produce la migración `0001` en `drizzle/` y `npm run db:migrate` la aplica sin errores.
- AC-2: `establecimientoSchema` acepta un registro válido (recorta espacios con trim) y rechaza con mensajes en español: textos vacíos o fuera de rango de longitud, `areaM2` menor o igual a 0, no numérica o mayor a 100000, `numeroPisos` no entero, menor que 1 o mayor que 50. Los números se aceptan como texto de formulario (`"120.5"`, `"2"`).
- AC-3: `createEstablecimiento(actor, input)` inserta una fila con `usuarioId = actor.id` ignorando cualquier `usuarioId` presente en `input`; `listOwnEstablecimientos(actor)` devuelve solo los no archivados de ese actor, ordenados del más reciente al más antiguo.
- AC-4 (seguridad, IDOR): con un cliente B y un establecimiento del cliente A: `getEstablecimientoById(B, idDeA)`, `updateEstablecimiento(B, idDeA, ...)` y `archiveEstablecimiento(B, idDeA)` devuelven `null` y no modifican nada; el resultado es idéntico al de un id inexistente. Las Server Actions responden `{ ok: false, error: "No se encontró el establecimiento." }` en ambos casos. Verificado con tests.
- AC-5: `getEstablecimientoById` con `admin` o `superadmin` devuelve el establecimiento de cualquier cliente (incluso archivado); un `cliente` no obtiene un archivado ni ajeno. `createEstablecimiento`, `updateEstablecimiento`, `archiveEstablecimiento` y `listOwnEstablecimientos` lanzan `Error("No autorizado")` si el actor no es `cliente` (test por cada rol y función).
- AC-6: `archiveEstablecimiento` marca `archivado_at` (no borra la fila) y es atómico (una sola sentencia con filtro de dueño); un establecimiento archivado no se lista, no se puede editar (devuelve `null`) ni archivar otra vez.
- AC-7: Cada Server Action (`createEstablecimiento`, `updateEstablecimiento`, `archiveEstablecimiento`) llama `requireRole("cliente")`, valida con zod (el `id` con `z.uuid()`; un id inválido responde "No se encontró el establecimiento." sin consultar la BD), invoca al servicio con el `Usuario` obtenido (nunca con un id de usuario recibido del formulario), ejecuta `revalidatePath("/mi-cuenta/establecimientos")` solo si tuvo éxito y devuelve `{ ok: true, data } | { ok: false, error, fieldErrors? }`. Con datos inválidos no se llama al servicio y se devuelven `fieldErrors` por campo.
- AC-8: Un `admin` o `superadmin` que abre `/mi-cuenta/establecimientos` es redirigido a `/panel`; sin sesión va a `/sign-in`; un usuario inactivo a `/cuenta-desactivada` (`requireRole("cliente")` en la página).
- AC-9: `/mi-cuenta/establecimientos` muestra `PageHeader` "Mis establecimientos" y un botón "Nuevo establecimiento". Sin registros muestra `EmptyState` ("Aún no tienes establecimientos") con un botón que abre el formulario. Con registros, una `Card` por establecimiento con nombre comercial, dirección, distrito, giro, área en m² y número de pisos, y acciones "Editar" y "Archivar" con nombre accesible que incluya el establecimiento.
- AC-10: Crear: el formulario (en `Sheet`) tiene `label` asociado a cada campo, campos numéricos con `inputMode` adecuado, muestra el error de cada campo en español junto al campo (`aria-invalid` y `aria-describedby`), deshabilita el botón mientras envía y, al tener éxito, cierra el panel y el nuevo establecimiento aparece en la lista sin recargar manualmente. Editar precarga los valores y guarda los cambios.
- AC-11: Archivar abre un `AlertDialog` que nombra el establecimiento y pide confirmar ("Archivar" / "Cancelar"); cancelar no cambia nada; confirmar lo quita de la lista. Si la acción falla, se muestra el mensaje de error sin cerrar el diálogo.
- AC-12: La página funciona sin desborde horizontal a 360, 768 y 1280 px (cuadrícula 1/2/3 columnas), con navegación por teclado (foco visible, Esc cierra Sheet y diálogo, foco regresa al botón que los abrió).
- AC-13: Todo texto visible y mensaje de error está en español y sin términos técnicos; solo tokens del tema (grep de `#[0-9a-f]{3,6}` y `oklch(` sin resultados en `modules/establecimientos/`); sin `any` ni `@ts-ignore`. No se importan React Query, axios, zustand ni react-table en este módulo.
- AC-14: `npm run build`, `npm run lint` y `npx vitest run` pasan.

## Tareas
### T1 — Tabla `establecimientos` y tipos
- Archivos: `db/schema.ts` (modificar: solo agregar la tabla y el tipo inferido), `modules/establecimientos/types/establecimiento.types.ts` (crear: re-exporta `Establecimiento` inferido y el tipo `Actor = Pick<Usuario, "id" | "rol">`), migración `drizzle/0001_*.sql` y `drizzle/meta/*` (generados con `npm run db:generate`, no cuentan como edición manual)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-1
- Tests: no aplica (esquema declarativo; verificado con `db:generate` y build, SETUP.md 3.2)
- [x] Completada

### T2 — Schema zod y tipo de resultado de acciones
- Archivos: `modules/establecimientos/schemas/establecimiento.schema.ts` (crear: `establecimientoSchema`, `EstablecimientoInput`), `modules/establecimientos/schemas/establecimiento.schema.test.ts` (crear), `lib/action-result.ts` (crear: `ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string[]> }`)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-2 (y el contrato de resultado de AC-7)
- Tests: `establecimiento.schema.test.ts` — registro válido (con espacios que se recortan y números como texto); cada campo vacío; longitud mínima y máxima de cada texto; `areaM2` 0, negativa, no numérica y 100001; `numeroPisos` 0, 51, `"1.5"`, `"abc"`; mensajes en español.
- [x] Completada

### T3 — Servicio con autorización por dueño
- Archivos: `modules/establecimientos/services/establecimiento.service.ts` (crear), `modules/establecimientos/services/establecimiento.service.test.ts` (crear)
- Depende de: T1, T2
- Grupo paralelo: G2
- Cubre: AC-3, AC-4, AC-5, AC-6
- Detalle: exporta `listOwnEstablecimientos(actor)`, `getEstablecimientoById(actor, id)`, `createEstablecimiento(actor, input)`, `updateEstablecimiento(actor, id, input)`, `archiveEstablecimiento(actor, id)` según "Decisiones de diseño". `update` también fija `updatedAt`. Sin imports de Clerk, `next/*` ni `requireRole` (servicio puro de datos y autorización por actor, testeable).
- Tests: con `@/db` mockeado por un fake en memoria que respete el filtro `where` aplicado (o que registre las condiciones): cada función con rol `admin`/`superadmin` (lanza `No autorizado`, salvo `getEstablecimientoById`); cliente A crea y lista solo lo suyo; cliente B no obtiene, edita ni archiva lo de A (devuelve `null`, la fila sigue intacta); `usuarioId` del input se ignora; archivar no borra y excluye de la lista; archivado no editable ni re-archivable; staff lee uno de otro cliente y uno archivado.
- [x] Completada

### T4 — Server Actions
- Archivos: `modules/establecimientos/actions/establecimiento.actions.ts` (crear: `"use server"`), `modules/establecimientos/actions/establecimiento.actions.test.ts` (crear)
- Depende de: T3
- Grupo paralelo: G3
- Cubre: AC-4 (nivel acción), AC-7
- Contrato para la UI: `createEstablecimientoAction(prev: ActionResult<Establecimiento> | null, formData: FormData)` y `updateEstablecimientoAction(id: string, prev, formData)` (se enlaza con `.bind(null, id)` para `useActionState`) devuelven `ActionResult<Establecimiento>`; `archiveEstablecimientoAction(id: string)` devuelve `ActionResult<{ id: string }>`. Mensaje genérico ante error inesperado: "No se pudo completar la operación. Inténtalo de nuevo."
- Tests: con `requireRole`, el servicio y `next/cache` mockeados: llama `requireRole("cliente")` primero; datos inválidos → `fieldErrors` y el servicio no se llama; el servicio se invoca con el usuario de `requireRole` aunque el `FormData` traiga un `usuarioId`; servicio devuelve `null` → "No se encontró el establecimiento."; id no uuid → mismo error sin llamar al servicio; éxito llama `revalidatePath("/mi-cuenta/establecimientos")`, el fallo no.
- [x] Completada

### T5 — Componentes de interfaz
- Archivos: `modules/establecimientos/components/EstablecimientosView.tsx` (crear: `"use client"`; recibe `establecimientos` y gestiona qué `Sheet`/diálogo está abierto; incluye el botón "Nuevo establecimiento", el `EmptyState` y la cuadrícula), `modules/establecimientos/components/EstablecimientoCard.tsx` (crear), `modules/establecimientos/components/EstablecimientoForm.tsx` (crear: formulario dentro de `Sheet`, `useActionState`), `modules/establecimientos/components/ArchiveEstablecimientoDialog.tsx` (crear: `AlertDialog`), `modules/establecimientos/components/EstablecimientoForm.test.tsx` (crear)
- Depende de: T4 (contrato de las acciones), preparación del orquestador (`alert-dialog`, `label`)
- Grupo paralelo: G4
- Cubre: AC-9, AC-10, AC-11, AC-12, AC-13
- Detalle: componentes de presentación y de estado de UI; ninguna llamada a BD ni a servicios (solo Server Actions). Reutiliza `Card`, `Button`, `Input`, `Label`, `Sheet`, `AlertDialog`, `EmptyState`, `PageHeader`; no crea componentes genéricos nuevos.
- Tests: `EstablecimientoForm.test.tsx` — con la acción mockeada: renderiza los 6 campos con su `label`; muestra `fieldErrors` junto al campo con `aria-invalid`; en modo edición precarga los valores. (Las demás piezas son presentacionales, SETUP.md 3.2.)
- [x] Completada

### T6 — Página `/mi-cuenta/establecimientos`
- Archivos: `app/mi-cuenta/establecimientos/page.tsx` (crear), `app/mi-cuenta/establecimientos/page.test.tsx` (crear)
- Depende de: T3, T5
- Grupo paralelo: G5
- Cubre: AC-8, AC-9 (carga de datos), AC-12
- Detalle: Server Component: `const usuario = await requireRole("cliente")`, `listOwnEstablecimientos(usuario)` y compone `EstablecimientosView`. Sin lógica propia.
- Tests: `page.test.tsx` (mismo estilo que `app/panel/[section]/page.test.tsx`) — con `requireRole` y el servicio mockeados: llama `requireRole("cliente")` antes de leer datos y pasa al servicio el usuario devuelto; si `requireRole` lanza (redirect), el servicio no se llama.
- [x] Completada

## Grupos paralelos
G1: T1, T2 (archivos disjuntos). G2: T3. G3: T4. G4: T5. G5: T6. (T3 necesita los tipos de T1 y el schema de T2; T5 consume el contrato de acciones de T4; T6 consume T3 y T5.)

## Fases siguientes
- `solicitud-itse`: el wizard elige un establecimiento propio (usa `getEstablecimientoById`), declara el riesgo con preguntas orientativas; bloquear archivado con expedientes activos.
- `bandeja-estados`: lectura de establecimientos para staff en el panel (listado para admin/superadmin sobre el mismo servicio).
- Opcional: ver y restaurar archivados; paginación y búsqueda si un cliente acumula muchos locales.

## Cambio posterior: Número de giro

- `db/schema.ts`: columna `numeroGiro` (`numero_giro`, text) nullable en BD por las filas existentes; migración `drizzle/0003_smiling_tarantula.sql` (solo `ADD COLUMN`).
- Schema: `numeroGiro` obligatorio en el formulario, trim, 1 a 20 caracteres, solo letras, números y guion.
- Servicio y acciones lo mapean en crear y editar; al editar una fila antigua el campo parte vacío y se exige.
- Formulario: orden Nombre comercial, Dirección, Distrito + Número de giro, Giro o actividad (ancho completo), Área + Pisos. La tarjeta muestra el número junto al giro si existe.
- Tests actualizados y casos nuevos (válido, vacío, inválido, más de 20).

## Cambio posterior: Función

- Nuevo campo `funcion` (enum `funcion_establecimiento`: ALMACEN, COMERCIO, ENCUENTRO, EDUCACION, HOSPEDAJE, INDUSTRIA, OFICINAS_ADMINISTRATIVAS, SALUD), nullable en BD por las filas existentes (migración `0004`), obligatorio en el formulario.
- Opciones y etiquetas definidas una sola vez en `modules/establecimientos/constants/funciones.ts` (schema zod, formulario y tarjeta).
- Formulario: `<select>` nativo ancho completo antes de "Giro o actividad". Al editar una fila antigua parte vacío y se exige elegir.
- `docs/reglas-negocio-itse.md` solo menciona "función" (Comercio) como referencia de la matriz de riesgos y no define lista; se sigue la petición.

## Cambio posterior: pisos y orden del formulario

- "Número de pisos" pasa a llamarse "Número de pisos de la edificación" (mismo dato `numeroPisos`, columna `numero_pisos`, regla de riesgo intacta; solo cambian etiqueta y mensajes).
- Nuevo campo `pisoEstablecimiento` (`piso_establecimiento`, integer, nullable en BD por filas existentes; migración `0005`, solo `ADD COLUMN`). Obligatorio en el formulario, entero de 1 a 50 y no mayor que `numeroPisos` (error en el campo del piso: "No puede ser mayor que el número de pisos de la edificación."). Al editar una fila antigua parte vacío y se exige.
- Orden (escritorio): Nombre comercial; Dirección; Distrito + Número de giro; Giro o actividad; Función + Área techada total (m²); Pisos de la edificación + Piso donde está el establecimiento. En móvil, una columna en el mismo orden.
- La tarjeta muestra "Pisos de la edificación" y, si existe, "Piso del establecimiento".
