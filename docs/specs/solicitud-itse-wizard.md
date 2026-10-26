# Solicitud de ITSE: Server Actions, UploadThing y wizard (parte 2 de 3)

Estado: approved

Depende de `solicitud-itse-datos.md` (debe estar `done`: tablas, schemas, reglas y servicios). El listado de expedientes y la descarga protegida de archivos están en `mis-expedientes.md`.

## Entrega en dos fases (decisión del usuario)
El usuario pidió ver primero el formulario, sin esperar el token de UploadThing (aún sin cuenta).
- **Fase A (ahora):** T2 sin `removeDocumentoAction`, T4, T5 y T6. El paso 3 "Documentos" muestra un aviso ("La subida de documentos estará disponible pronto") y la lista de documentos requeridos, sin subir. `enviarSolicitudAction` ya valida documentos requeridos, así que el envío responde "incompleto" con los documentos faltantes hasta que exista la Fase B.
- **Fase B (con el token):** T1, T3, `removeDocumentoAction` y conectar el paso Documentos real.

## Objetivo
Que el cliente cree una solicitud de ITSE para uno de sus establecimientos en `/mi-cuenta/nueva-solicitud`, mediante un wizard de 5 pasos con borrador guardable y retomable, subida de documentos (PDF/imágenes) con UploadThing y envío final que genera el número de expediente y deja el estado en `PRESENTADO`.

## Fuera de alcance
- Listado "Mis expedientes", detalle, línea de tiempo y descarga/visualización de archivos (spec `mis-expedientes`: el enlace "Ver archivo" de esta spec apunta a `/api/documentos/<id>`).
- Bandeja y transiciones del admin; confirmación del nivel de riesgo; subsanación de `OBSERVADO_REQUISITOS` y reenvío.
- Descartar borradores; autoguardado mientras se escribe (se guarda al pulsar "Siguiente"); editar una solicitud ya presentada.
- Pago en línea (solo número de boleta + comprobante); PDF de la solicitud/FUT; previsualización de imágenes y arrastrar-y-soltar (YAGNI: botón de elegir archivo).
- Pantalla para staff (su vista es `bandeja-estados`).

## Hallazgos (estado actual del repo)
- Estado tras la parte 1: servicios `expediente.service.ts` y `documento.service.ts`, schemas `paso1` a `paso4` y `declaracionSchema`, `validateArchivo`, `sugerirNivelRiesgo`, `tipoItsePorRiesgo`, `DOCUMENTOS`, `documentosFaltantes`.
- `/mi-cuenta/nueva-solicitud` hoy lo sirve `app/mi-cuenta/[section]/page.tsx` ("Próximamente"). Una ruta estática propia tiene prioridad y debe llamar `requireRole("cliente")` ella misma. El ítem "Nueva solicitud" de `modules/navigation/constants/nav-items.ts` ya existe (no se toca).
- `proxy.ts` (Clerk) protege todo salvo `/`, `/sign-in`, `/sign-up` y `/verificar`. Las devoluciones de llamada de UploadThing (`onUploadComplete`) llegan desde sus servidores sin sesión de Clerk, por lo que `/api/uploadthing` debe ser pública a nivel de proxy y autenticarse dentro del middleware del file router (si no, en producción el registro del archivo falla).
- `uploadthing` y `@uploadthing/react` no están instalados; no existe `UPLOADTHING_TOKEN` local. Constitución sección 3: API routes solo para webhooks y UploadThing.
- `components/ui/` tiene `card, button, input, label, badge, alert-dialog, dialog, sheet, separator, skeleton`. Faltan `checkbox` y `radio-group` (sobre Base UI: se envían en `FormData` solo si llevan `name`; el developer lee los archivos generados).
- Patrón de acciones a repetir: `modules/establecimientos/actions/establecimiento.actions.ts` (`requireRole("cliente")` primero, zod con `z.flattenError`, `run()` que traduce `null` a "No se encontró...", `revalidatePath` solo en éxito, mensaje genérico ante error).
- Next 16: `searchParams` y `params` son Promesas; usar los helpers de tipos globales `PageProps` / `RouteContext`. Consultar `node_modules/next/dist/docs/01-app/` (route handlers, forms, server-actions) antes de escribir.
- Documentación de UploadThing (versión vigente al implementar): el developer debe leerla; esta spec fija el comportamiento, no la API exacta.

## Decisiones de diseño
- **Un wizard de 5 pasos**: 1 Establecimiento y trámite, 2 Nivel de riesgo, 3 Solicitante, 4 Documentos, 5 Resumen y envío. El paso actual es estado del cliente; cada "Siguiente" guarda el paso en el servidor con una Server Action (crea el borrador en el paso 1). "Atrás" no guarda. Retomar un borrador abre el paso 1 con todo precargado (YAGNI: no se calcula el primer paso incompleto).
- **El borrador se identifica por `?borrador=<uuid>`** en la URL de la página; se pasa el `id` a las acciones con `.bind(null, paso, id)`. Un `borrador` ajeno, inexistente o ya presentado se ignora y se muestra una solicitud nueva (mismo resultado en los tres casos).
- **Sin estado global ni libs extra**: formularios nativos con `useActionState`; el avance de paso se hace dentro de la acción envuelta (no con `useEffect` + `setState`, para respetar las reglas de lint de React 19). Sin React Query, axios, zustand ni react-hook-form.
- **Sugerencia de riesgo en vivo (paso 2)**: se calcula en el cliente con `sugerirNivelRiesgo` (función pura) a partir del área y pisos del establecimiento y de los dos checkboxes; se muestra como texto ("Sugerencia: Riesgo alto") y también el tipo de ITSE resultante del nivel elegido (Previa/Posterior). No preselecciona el nivel: lo elige el cliente. Aviso fijo: "Es solo una orientación. GRDyDC confirmará el nivel de riesgo."
- **Subida con UploadThing, registro en servidor**: el cliente sube con `useUploadThing`; el registro en BD lo hace `onUploadComplete` con datos de confianza (clave, nombre, tipo, tamaño devueltos por UploadThing y `expedienteId`/`tipo` validados en el middleware), no un dato enviado por el navegador. Tras terminar, el cliente llama `router.refresh()`.
- **Privacidad de archivos**: se guarda solo la `file_key`; el navegador nunca recibe una URL pública directa: se accede por `/api/documentos/<id>` (spec `mis-expedientes`). Recomendación: subir con ACL privada y URL firmada de corta duración si la versión de UploadThing lo permite (ver preguntas abiertas). **Decisión del usuario: se usa el plan gratuito de UploadThing, que NO ofrece archivos privados ni URL firmadas; se aplica el plan B (solo la clave, descarga por la ruta autorizada). Límite conocido: la URL real del archivo en UploadThing sigue siendo pública para quien la conozca; aceptable con datos ficticios, no para documentos reales.**
- **Validación de archivos en tres puntos**: configuración del file router (tipo/tamaño), `validateArchivo` en el cliente antes de subir (mensaje inmediato) y `validateArchivo` en `onUploadComplete` (si falla, se borra el archivo remoto y no se registra).
- **Archivos reemplazados o quitados** se borran de UploadThing con `UTApi` (mejor esfuerzo: si el borrado remoto falla, se ignora el error y el registro ya cambió).
- **Texto de la declaración jurada** según caso (función pura `declaracionTexto(tipoTramite, nivelRiesgo)`): bajo/medio → cumplimiento de condiciones de seguridad; renovación alto/muy alto → se mantienen las condiciones de seguridad; nueva alto/muy alto → veracidad de los datos y documentos. Ficticio y breve.
- **Éxito del envío** se muestra en el mismo paso 5 (número de expediente, estado "Presentado" y botón a "Mis expedientes"), sin redirección.

## Reutilización
- Existente que se reutiliza: `getOrCreateUser` y `requireRole` (`modules/usuarios/`); `ActionResult`; servicios, schemas y reglas de la parte 1; `listOwnEstablecimientos`; `components/shared/PageHeader.tsx`, `EmptyState.tsx`; `components/ui/` `card, button, input, label, badge, separator, alert-dialog`; `cn`; lucide-react.
- Existente que se extiende: `proxy.ts` (una ruta pública más). `app/mi-cuenta/[section]/page.tsx` NO se modifica.
- Nuevo (y por qué): `app/api/uploadthing/*` (única forma soportada de integrar UploadThing); `lib/uploadthing.ts` y `lib/uploadthing-server.ts` (clientes transversales de UploadThing, los reutilizarán `subsanacion-plazos` y el resto de specs con archivos); componentes del wizard en `modules/expedientes/components/`; `WizardStepper` es específico de este wizard hoy (YAGNI: se promueve a `components/shared/` cuando otro flujo lo use).
- Dependencias / componentes shadcn a instalar antes de implementar (preparación del orquestador, una sola vez):
  - `npm install uploadthing @uploadthing/react`
  - `npx shadcn@latest add checkbox radio-group` (responder NO a sobrescribir `button`, `input`, `label`, `card` u otros existentes).
  - Agregar `UPLOADTHING_TOKEN=` (sin valor) a `.env.example` si no está. El usuario completa el valor real en `.env.local`.
- Prerrequisitos manuales del usuario: crear cuenta y app en uploadthing.com, copiar el token a `UPLOADTHING_TOKEN` en `.env.local` (y en Vercel al desplegar); haber aplicado la migración de la parte 1.

## Criterios de aceptación
- AC-1: `app/api/uploadthing/route.ts` expone GET y POST con el file router `documentoExpediente` (1 archivo por subida; PDF hasta 8 MB e imagen hasta 4 MB). Su middleware exige sesión, `rol === "cliente"`, usuario activo, `input` válido (`expedienteId` uuid y `tipo` del catálogo) y un expediente propio en `BORRADOR` (`getExpedienteById`); en cualquier otro caso lanza un error de UploadThing con mensaje en español y no se sube nada. No usa `requireRole` (redirige; no sirve en una API).
- AC-2: `onUploadComplete` registra el archivo con `registerDocumento` usando solo los datos de confianza del middleware y de UploadThing; si `registerDocumento` devuelve una clave anterior, la borra remotamente; si `validateArchivo` rechaza el archivo, lo borra remotamente, no lo registra y responde error. Devuelve al cliente el `id` del documento.
- AC-3: `proxy.ts` agrega `/api/uploadthing(.*)` a las rutas públicas y deja el resto de `/api/*` protegido por Clerk. `UPLOADTHING_TOKEN` se lee solo en servidor (sin prefijo `NEXT_PUBLIC_`; grep sin resultados en componentes cliente).
- AC-4: `saveBorradorAction`, `enviarSolicitudAction` y `removeDocumentoAction` llaman `requireRole("cliente")` antes de cualquier otra cosa, usan el `Usuario` devuelto (nunca un `usuarioId` del formulario), validan ids con `z.uuid()` (id inválido → "No se encontró la solicitud." sin consultar la BD) y devuelven `ActionResult`. Con datos inválidos no se llama al servicio y se devuelven `fieldErrors`. Error inesperado: "No se pudo completar la operación. Inténtalo de nuevo."
- AC-5: `saveBorradorAction(paso, id, prev, formData)`: paso 1 sin `id` crea el borrador, con `id` actualiza; pasos 2 a 4 sin `id` responden "No se encontró la solicitud."; el `paso` fuera de 1 a 4 responde el mismo error; el servicio devuelve `null` (ajeno, inexistente o no `BORRADOR`) → "No se encontró la solicitud." Un establecimiento ajeno en el paso 1 → "No se encontró el establecimiento." Éxito devuelve el `Expediente` actualizado.
- AC-6: `enviarSolicitudAction(id, prev, formData)` valida `declaracionSchema`; mapea `incompleto` a un error "Aún falta completar: <lista en español>." (nombres de pasos y documentos), `no_encontrado` a "No se encontró la solicitud." y éxito a `{ ok: true, data: { id, numero } }` con `revalidatePath("/mi-cuenta/expedientes")` solo en éxito.
- AC-7: `removeDocumentoAction(documentoId)` elimina vía `removeDocumento`; si el documento no es propio o el expediente no es `BORRADOR` responde "No se encontró el documento."; tras borrar el registro intenta borrar el archivo remoto y su fallo no cambia el resultado.
- AC-8: `/mi-cuenta/nueva-solicitud`: `admin`/`superadmin` van a `/panel`, sin sesión a `/sign-in`, inactivo a `/cuenta-desactivada` (`requireRole("cliente")` en la página). Sin establecimientos propios muestra `EmptyState` con botón a `/mi-cuenta/establecimientos`. Con `?borrador=<id>` propio y en `BORRADOR` carga el borrador y sus documentos; con uno ajeno, inexistente, no uuid o presentado muestra una solicitud nueva.
- AC-9: `WizardStepper` es un `nav` con `aria-label`, una lista ordenada con los 5 pasos, `aria-current="step"` en el actual y estado completado/pendiente legible por lector de pantalla (no solo color). A 360 px muestra "Paso X de 5: <título>" compacto; desde `md` muestra los 5 pasos en horizontal.
- AC-10: Paso 1: tarjetas seleccionables (radio nativo o `radio-group`) con los establecimientos propios (nombre, dirección, área y pisos) y selección del tipo de trámite (Nueva / Renovación). Paso 2: checkboxes "¿Tiene sótano?" y "¿Almacena inflamables?", sugerencia en vivo con el aviso fijo, elección del nivel (Bajo/Medio/Alto/Muy alto) y tipo de ITSE resultante visible. Paso 3: datos del solicitante precargados desde el usuario (nombres y apellidos, documento, teléfono, correo, editables); interruptor "Actúo como representante de una empresa" que muestra y exige la razón social. Cada campo con `label`, error en español junto al campo (`aria-invalid`, `aria-describedby`) y botón de envío deshabilitado mientras guarda.
- AC-11: Paso 4: una fila por documento de `DOCUMENTOS` con etiqueta, "Obligatorio"/"Opcional", estado (subido/pendiente), botón elegir archivo (acepta PDF, JPG, PNG, WebP), "Ver archivo" (enlace a `/api/documentos/<id>`, nueva pestaña) y "Quitar" (con `AlertDialog` de confirmación). Un archivo inválido muestra el mensaje de `validateArchivo` sin iniciar la subida. El estado de subida y los errores se anuncian con `aria-live="polite"`. Campo "Número de boleta" con error por campo. "Siguiente" guarda el número de boleta; no se bloquea por documentos faltantes (se informa en el paso 5 y el servidor lo valida al enviar).
- AC-12: Paso 5: resumen en solo lectura (establecimiento, trámite, nivel y tipo de ITSE, solicitante, boleta, documentos con estado) con avisos para lo que falte; texto de `declaracionTexto` y checkbox obligatorio; botón "Presentar solicitud" deshabilitado mientras envía; con éxito muestra el número `EXP-AAAA-NNNNN`, estado "Presentado" y un enlace a `/mi-cuenta/expedientes`; la solicitud ya no se puede editar (los pasos pasan a solo lectura o se oculta el wizard).
- AC-13: `declaracionTexto` devuelve un texto distinto para cada una de las tres combinaciones descritas en "Decisiones" (test).
- AC-14: Aislamiento verificado con tests de acciones y del file router de forma indirecta (servicio): un cliente B no puede guardar, subir, quitar ni enviar sobre un expediente de A; ningún dato de A aparece en las respuestas.
- AC-15: Sin desborde horizontal a 360, 768 y 1280 px; navegación por teclado completa (foco visible, orden lógico, Esc cierra el diálogo y devuelve el foco); todo texto visible en español y sin términos técnicos; solo tokens del tema (grep de `#[0-9a-f]{3,6}` y `oklch(` sin resultados en `modules/expedientes/`); sin `any` ni `@ts-ignore`; no se importan React Query, axios, zustand ni react-table.
- AC-16: `npm run build`, `npm run lint` y `npx vitest run` pasan.

## Tareas
### T1 — Infraestructura de UploadThing
- Archivos: `app/api/uploadthing/core.ts` (crear: file router `documentoExpediente`), `app/api/uploadthing/route.ts` (crear), `lib/uploadthing.ts` (crear: helpers de cliente `useUploadThing` tipados con el router), `lib/uploadthing-server.ts` (crear: instancia `UTApi`; exporta `deleteUploadedFile(key)`), `proxy.ts` (modificar: ruta pública)
- Depende de: `solicitud-itse-datos` hecha; preparación del orquestador (`uploadthing`, `@uploadthing/react`)
- Grupo paralelo: G1
- Cubre: AC-1, AC-2, AC-3
- Tests: no aplica a `core.ts`/`route.ts`/`proxy.ts` (glue de framework y configuración; la lógica de autorización y validación vive en servicios y utils ya testeados, SETUP.md 3.2). Verificación manual indicada en la descripción de la tarea.
- [ ] Completada

### T2 — Server Actions del expediente
- Archivos: `modules/expedientes/actions/expediente.actions.ts` (crear: `"use server"`; `saveBorradorAction`, `enviarSolicitudAction`, `removeDocumentoAction`), `modules/expedientes/actions/expediente.actions.test.ts` (crear)
- Depende de: T1 (`deleteUploadedFile`)
- Grupo paralelo: G2
- Cubre: AC-4, AC-5, AC-6, AC-7, AC-14
- Contrato para la UI: `saveBorradorAction(paso: 1|2|3|4, id: string | null, prev: ActionResult<Expediente> | null, formData: FormData): Promise<ActionResult<Expediente>>`; `enviarSolicitudAction(id: string, prev: ActionResult<{ id: string; numero: string }> | null, formData: FormData)`; `removeDocumentoAction(documentoId: string): Promise<ActionResult<{ id: string }>>`.
- Nota: Fase A hecha; falta removeDocumentoAction en Fase B.
- Tests: con `requireRole`, los servicios, `next/cache` y `deleteUploadedFile` mockeados: `requireRole("cliente")` primero; datos inválidos → `fieldErrors` sin llamar al servicio; el servicio recibe el usuario de `requireRole` aunque el `FormData` traiga `usuarioId`; paso inválido, id no uuid y `null` del servicio → mensajes de AC-5; envío `incompleto`/`no_encontrado`/éxito; `revalidatePath` solo en éxito; quitar documento intenta borrar el remoto y tolera su fallo.
- [ ] Completada

### T3 — Paso Documentos
- Archivos: `modules/expedientes/components/StepDocumentos.tsx` (crear), `modules/expedientes/components/DocumentoUploader.tsx` (crear: una fila por tipo; `"use client"`; usa `useUploadThing`, `validateArchivo`, `removeDocumentoAction`, `router.refresh()`), `modules/expedientes/components/DocumentoUploader.test.tsx` (crear)
- Depende de: T1 (`lib/uploadthing.ts`), T2 (contratos de acciones)
- Grupo paralelo: G3
- Cubre: AC-11, AC-15
- Tests: `DocumentoUploader.test.tsx` — con `@/lib/uploadthing` y acciones mockeadas: un archivo `.exe` o PDF > 8 MB muestra el mensaje y no llama a la subida; un PDF válido llama a la subida con `expedienteId` y `tipo`; muestra "Subido" con enlace "Ver archivo" cuando hay documento; "Quitar" pide confirmación.
- [ ] Completada

### T4 — Paso Resumen, texto de declaración y stepper
- Archivos: `modules/expedientes/components/StepResumen.tsx` (crear), `modules/expedientes/utils/declaracion.ts` (crear: `declaracionTexto`), `modules/expedientes/utils/declaracion.test.ts` (crear), `modules/expedientes/components/WizardStepper.tsx` (crear)
- Depende de: T2 (contrato de `enviarSolicitudAction`)
- Grupo paralelo: G3
- Cubre: AC-9, AC-12, AC-13, AC-15
- Tests: `declaracion.test.ts` — los tres textos distintos y que ninguno esté vacío. (`StepResumen` y `WizardStepper` son presentacionales, SETUP.md 3.2; su accesibilidad se revisa por lectura y la integración en el test de T5.)
- [x] Completada

### T5 — Wizard (shell) y pasos 1 a 3
- Archivos: `modules/expedientes/components/SolicitudWizard.tsx` (crear: `"use client"`, estado del paso y del expediente), `modules/expedientes/components/StepEstablecimiento.tsx` (crear), `modules/expedientes/components/StepRiesgo.tsx` (crear), `modules/expedientes/components/StepSolicitante.tsx` (crear), `modules/expedientes/components/SolicitudWizard.test.tsx` (crear)
- Depende de: T2, T3, T4
- Grupo paralelo: G4
- Cubre: AC-10, AC-12 (integración), AC-15
- Contrato: `SolicitudWizard({ establecimientos, borrador, documentos, defaultsSolicitante })` compone `WizardStepper`, los 5 pasos y las acciones; cada paso recibe `onSaved(expediente)` y `onBack()`.
- Tests: `SolicitudWizard.test.tsx` — con acciones y `useUploadThing` mockeados: arranca en el paso 1 con `aria-current="step"`; "Siguiente" con una acción exitosa avanza al paso 2; con `fieldErrors` permanece y muestra el error junto al campo; en el paso 2 marcar sótano con un local de 4 pisos muestra la sugerencia correspondiente y el aviso fijo; con un borrador precarga sus valores.
- [x] Completada (sin paso Documentos real: Fase B)

### T6 — Página `/mi-cuenta/nueva-solicitud`
- Archivos: `app/mi-cuenta/nueva-solicitud/page.tsx` (crear), `app/mi-cuenta/nueva-solicitud/page.test.tsx` (crear)
- Depende de: T5
- Grupo paralelo: G5
- Cubre: AC-8
- Detalle: Server Component: `requireRole("cliente")`, `listOwnEstablecimientos`, lectura de `searchParams.borrador` (uuid; `getExpedienteById` + `listDocumentos` solo si es propio y `BORRADOR`), `defaultsSolicitante` desde el usuario; sin lógica propia más allá de componer.
- Tests: `page.test.tsx` (estilo de `app/mi-cuenta/establecimientos/page.test.tsx`) — `requireRole("cliente")` antes de leer datos; si lanza redirect no se llama a ningún servicio; sin establecimientos renderiza el estado vacío; `borrador` no uuid o con servicio `null` renderiza solicitud nueva; `borrador` en estado distinto de `BORRADOR` se ignora.
- [x] Completada

## Grupos paralelos
G1: T1. G2: T2. G3: T3, T4 (archivos disjuntos). G4: T5. G5: T6.

## Fases siguientes
- `mis-expedientes`: listado, descarga protegida (`/api/documentos/<id>`) y continuar borrador.
- `bandeja-estados`: el admin recibe los `PRESENTADO`, confirma el nivel de riesgo y mueve estados; ver y descargar documentos con el mismo servicio.
- `subsanacion-plazos`: corregir y reenviar un `OBSERVADO_REQUISITOS` y subir DJ + fotos reutilizando `lib/uploadthing*` y `DocumentoUploader`.
- Opcional: descartar borradores, ir directo al primer paso incompleto, mover `WizardStepper` a `components/shared/`.
