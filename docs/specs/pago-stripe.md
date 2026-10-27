# Pago de la tasa con Stripe (Checkout hospedado, modo prueba)

Estado: approved

Reemplaza parcialmente `solicitud-itse-wizard.md`, `solicitud-itse-datos.md`, `documentos-por-riesgo.md` y `mis-expedientes.md` (ver "ACs reemplazados"). Depende de que esas specs estén implementadas (lo están en el repo, salvo la subida de documentos, ver Riesgos).

## Objetivo
El cliente ya no escribe un número de boleta: paga la tasa del trámite en línea con Stripe (modo prueba, dinero ficticio). La solicitud pasa de `BORRADOR` a `PRESENTADO` (y recibe su número `EXP-AAAA-NNNNN`) solo cuando Stripe confirma el pago. En "Mis expedientes", un borrador completo sin pagar se ve como «Falta el pago» con botón «Pagar».

## Fuera de alcance
- Webhooks de Stripe (decisión del proyecto: localhost). En producción se debería añadir un webhook `checkout.session.completed` que llame a la misma confirmación idempotente.
- Reembolsos, recibos/facturas, guardar el monto pagado (`monto_pagado`: descartado por YAGNI; la fuente de verdad es la sesión de Stripe, recuperable con `stripe_session_id`), cupones, varios métodos de pago, Stripe Elements/formularios propios.
- Cobros por renovación distintos a nueva ITSE (monto solo depende del nivel de riesgo).
- Borrar la columna `numero_boleta` (queda sin uso, con comentario de obsoleta).

## Decisiones y supuestos (el humano debe confirmar al aprobar)
1. **Wizard con 5 pasos**: el paso 4 (Documentos) pierde el número de boleta y su botón solo avanza (ya no llama a `saveBorradorAction`). El paso 5 pasa a «Resumen y pago» con botón «Aceptar y pagar». Se elimina `paso4Schema`.
2. **Sin webhooks**: la confirmación ocurre en la ruta de retorno `GET /mi-cuenta/pago/confirmar?session_id=...`, que consulta a Stripe desde el servidor. **Límite aceptado**: si el cliente paga pero nunca vuelve a esa ruta, la solicitud sigue en `BORRADOR` hasta que pulse «Pagar» otra vez (al hacerlo se detecta la sesión ya pagada y se confirma sin cobrar de nuevo).
3. **Una sesión vigente por borrador**: `stripe_session_id` guarda la última sesión creada (se sobrescribe). Al pulsar «Aceptar y pagar»: si la sesión guardada está pagada se confirma; si sigue abierta y su monto coincide con la tasa actual se reutiliza su URL; en otro caso (expirada, otro monto, inexistente) se crea una nueva. Una sesión anterior ya sobrescrita nunca confirma (límite aceptado).
4. **Moneda PEN** (supuesto). Stripe permite cobrar en soles como moneda de presentación, pero no pude verificarlo contra la documentación en línea al redactar: el developer debe comprobar en modo prueba que Checkout acepta `pen`; si no, cambiar solo la constante `MONEDA` a `usd` y los montos, y avisar. Montos ficticios (a confirmar): BAJO/MEDIO S/ 150,00 (15000) y ALTO/MUY_ALTO S/ 300,00 (30000), en céntimos, en `modules/expedientes/constants/tasa.ts`.
5. **Número de expediente al pagar**: el correlativo `EXP-AAAA-NNNNN` ya no se consume al "enviar" sino al confirmar el pago (misma lógica de correlativo e historial).
6. **Un borrador completo abre directo en el paso 5** (el wizard calcula "completo" con la función pura compartida); desde ahí puede volver atrás. «Continuar» y «Pagar» apuntan a la misma URL `?borrador=<id>`; solo cambia la etiqueta.
7. **Variable de URL base**: se usa `NEXT_PUBLIC_APP_URL` (ya prevista en la constitución §9) solo en servidor para armar `success_url`/`cancel_url`.
8. Éxito: la ruta de retorno redirige a `/mi-cuenta/expedientes` (el expediente aparece ya como «Presentado» con su número). Cancelación o pago no completado: vuelve a `/mi-cuenta/nueva-solicitud?borrador=<id>` (paso 5). Sin banners ni páginas extra (YAGNI).

## Preparación previa (la hace el humano / orquestador antes de implementar)
1. Crear cuenta gratuita de Stripe, quedarse en **modo prueba**, copiar la clave secreta `sk_test_...` y ponerla en `.env.local` como `STRIPE_SECRET_KEY=` junto a `NEXT_PUBLIC_APP_URL=http://localhost:3000`. Nunca commitear `.env.local`.
2. `npm install stripe` (la última versión estable; el developer anota la versión instalada en su reporte). No se instalan paquetes de cliente (`@stripe/stripe-js` no hace falta con Checkout hospedado).
3. Tras la tarea T2: `npm run db:generate` (produce `0009`) y `npm run db:migrate`.
4. Para probar: tarjeta `4242 4242 4242 4242`, cualquier fecha futura, cualquier CVC.

## Reutilización
- Existente que se reutiliza: `requireRole`, `getOrCreateUser` (`modules/usuarios/services/`); `ActionResult` (`lib/action-result.ts`); `declaracionSchema`, `paso1Schema`..`paso3Schema`; `documentosFaltantes` / `documentosRequeridos` (`utils/documentos.ts`); `declaracionTexto`; `getEstablecimientoById`; el correlativo, `formatNumeroExpediente` e inserción en `historial_estados` de `expediente.service.ts` (se extraen en `presentarExpediente`, no se duplican); `Badge`, `Card`, `Button`.
- Existente que se extiende: `expediente.service.ts` (`enviarExpediente` se divide en `prepararPago` + `presentarExpediente`; `listOwnExpedientes` añade `pagoPendiente`); `expediente.actions.ts` (se quita el paso 4 y `enviarSolicitudAction`); `StepResumen`, `SolicitudWizard`, `ExpedientesView`; `docs/reglas-negocio-itse.md`.
- Nuevo (y por qué): `lib/stripe.ts` (cliente transversal, nada existente); `constants/tasa.ts` (montos por riesgo); `utils/completitud.ts` (regla pura "borrador completo", usada por servicio y wizard sin duplicar); `services/pago.service.ts` (todo lo que habla con Stripe, separado de `expediente.service.ts`); `actions/pago.actions.ts`; `app/mi-cuenta/pago/confirmar/route.ts` (retorno de Stripe: GET con efecto, un Route Handler y no una página).
- Dependencias / componentes shadcn a instalar antes de implementar: `stripe` (npm). Ningún componente shadcn.

## ACs reemplazados (esta spec manda; las otras specs no se editan)
- `solicitud-itse-wizard`: AC-4 y AC-6 (`enviarSolicitudAction` se elimina; lo cubre `iniciarPagoAction`); AC-5 (el `paso` válido ahora es 1 a 3); los ACs del paso Documentos con boleta y de Resumen "Presentar solicitud" (AC-10/AC-11/AC-12, texto de boleta y botón); AC-14 en lo referido a "enviar".
- `solicitud-itse-datos`: AC-5 en lo referido a `paso4Schema`/`numeroBoleta`; AC-10 y AC-12 en lo referido a `enviarExpediente` (reemplazado por `prepararPago` + `presentarExpediente`).
- `documentos-por-riesgo`: AC-7 (`enviarExpediente`) y AC-9 en la parte "conservan el campo de número de boleta".
- `mis-expedientes`: AC-4 (los borradores completos muestran «Falta el pago»/«Pagar» en vez de «Continuar»; AC-1 y AC-3 siguen igual, `BORRADOR` conserva su etiqueta «Borrador» en `ESTADO_LABELS`).

## Criterios de aceptación
- AC-1: `montoTasa(nivel)` devuelve 15000 para BAJO y MEDIO y 30000 para ALTO y MUY_ALTO (céntimos); `MONEDA` y los montos son constantes exportadas de `modules/expedientes/constants/tasa.ts`. El monto nunca se lee de `FormData` ni de parámetros del cliente (grep en `pago.actions.ts`).
- AC-2: `faltantesBorrador(exp, tiposSubidos)` (pura) devuelve `paso1`/`paso2`/`paso3` según `paso1Schema`..`paso3Schema` mas los documentos requeridos faltantes; vacía solo si el borrador está completo. `paso4Schema`, `Paso4Input`, el caso 4 de `parsePaso`/`PatchBorrador`/`patchToValues` y `paso4` en `NOMBRES_FALTANTE` ya no existen (grep sin resultados fuera de `drizzle/`).
- AC-3: `saveBorradorAction` acepta solo `paso` 1 a 3; `paso` 4 responde "No se encontró la solicitud." sin llamar al servicio.
- AC-4: `expedientes` tiene `stripe_session_id` (text, nullable, único) y `pagado_at` (timestamptz, nullable); la migración `0009` solo hace `ADD COLUMN` y el índice único, y `db:migrate` la aplica. `numero_boleta` sigue en el schema con comentario de obsoleta y ningún código la lee ni escribe.
- AC-5: `prepararPago(actor, id, aceptada)`: `cliente` dueño con `BORRADOR` completo (`faltantesBorrador` vacía, declaración aceptada, establecimiento propio y activo) guarda `declaracion_aceptada_at` y devuelve el expediente; si falta algo devuelve `incompleto` con la lista; ajeno, inexistente o no `BORRADOR` devuelve `no_encontrado` (igual que inexistente); actor no `cliente` lanza `Error("No autorizado")`. No cambia el estado.
- AC-6: `presentarExpediente(actor, id, { stripeSessionId, pagadoAt })` pasa `BORRADOR` -> `PRESENTADO` en un solo `UPDATE` con filtro de dueño y `BORRADOR` (conserva el reintento de correlativo por choque `23505`), guarda `stripe_session_id`, `pagado_at`, `presentado_at`, e inserta en `historial_estados` (comentario "Solicitud presentada con pago en línea"). Sobre un expediente ya presentado o ajeno devuelve `no_encontrado` sin consumir número.
- AC-7: `crearSesionPago` crea una sesión `mode: "payment"`, un solo ítem con `currency: MONEDA`, `unit_amount: montoTasa(nivelGuardado)`, nombre "Tasa por Inspección Técnica de Seguridad en Edificaciones – ficticia", `client_reference_id = actor.id`, `metadata.expedienteId`, `success_url = ${NEXT_PUBLIC_APP_URL}/mi-cuenta/pago/confirmar?session_id={CHECKOUT_SESSION_ID}` y `cancel_url = ${NEXT_PUBLIC_APP_URL}/mi-cuenta/nueva-solicitud?borrador=<id>`, y guarda el id de la sesión en `stripe_session_id`. Con sesión guardada: pagada -> devuelve la URL de confirmación sin crear otra; abierta con el mismo monto -> reutiliza su `url`; expirada, con otro monto o inexistente -> crea una nueva. Con nivel de riesgo nulo no llama a Stripe.
- AC-8: `confirmarPago(actor, sessionId)` solo devuelve `ok` si: `sessionId` cumple el formato `cs_test_`/`cs_live_` + alfanumérico; la sesión se recupera de Stripe con la clave secreta; `payment_status === "paid"`; `client_reference_id === actor.id`; `metadata.expedienteId` es uuid y el expediente es del actor (consulta con filtro de dueño); y `expediente.stripe_session_id === session.id`. Entonces llama `presentarExpediente` y devuelve `{ status: "ok", numero }`. Tests de IDOR: sesión de otro usuario, `expedienteId` ajeno, sesión distinta de la guardada y `payment_status: "unpaid"` devuelven `no_pagado`/`no_encontrado` y no llaman a `presentarExpediente`.
- AC-9 (idempotencia): si el expediente ya está presentado con `stripe_session_id === session.id` y `pagado_at` no nulo, `confirmarPago` devuelve `ok` con su número existente sin llamar a `presentarExpediente`; si `presentarExpediente` devuelve `no_encontrado` por carrera, se relee y se aplica la misma regla. Recargar la ruta de retorno no cambia el número.
- AC-10: `iniciarPagoAction(id, prev, formData)`: `requireRole("cliente")` primero; `id` no uuid -> "No se encontró la solicitud." sin tocar la BD; valida `declaracionSchema`; `incompleto` -> "Aún falta completar: <lista en español>."; `no_encontrado` -> "No se encontró la solicitud."; éxito -> `redirect(url)` (fuera de `try/catch`); error de Stripe o inesperado -> "No se pudo iniciar el pago. Inténtalo de nuevo." sin detalles técnicos. Revalida `/mi-cuenta/expedientes` solo en rutas de éxito.
- AC-11: `GET /mi-cuenta/pago/confirmar`: sin sesión de usuario -> redirige a `/sign-in`; usuario no `cliente` o inactivo -> no confirma y redirige (`/panel` o `/cuenta-desactivada` según corresponda) ; `session_id` ausente o inválido -> redirige a `/mi-cuenta/expedientes` sin llamar a Stripe; `ok` -> redirige a `/mi-cuenta/expedientes`; cualquier otro resultado -> redirige a `/mi-cuenta/expedientes`. No usa `requireRole` (no sirve en un Route Handler) y no expone mensajes técnicos. `proxy.ts` no cambia (sigue solo autenticando).
- AC-12: `StepResumen` muestra la tasa (`montoTasa` formateada como moneda `es-PE`, con la leyenda "monto ficticio, modo de prueba"), ya no muestra «Número de boleta», conserva documentos y declaración jurada, y el botón dice «Aceptar y pagar» (deshabilitado y «Redirigiendo a Stripe…» mientras envía). El paso 4 ya no tiene campo de boleta y su botón «Siguiente» solo avanza.
- AC-13: `listOwnExpedientes` devuelve `pagoPendiente: true` solo para `BORRADOR` con `faltantesBorrador` vacía, usando una sola consulta adicional de documentos para todos los borradores (sin N+1). `ExpedientesView` muestra para ellos una `Badge` «Falta el pago» (en lugar de «Borrador») y un botón «Pagar» (nombre accesible con el establecimiento) a `?borrador=<id>`; el resto de borradores conserva «Borrador» y «Continuar»; los demás estados no cambian.
- AC-14: `SolicitudWizard` abre en el paso 5 cuando el borrador recibido está completo (`faltantesBorrador` vacía con los `documentos` recibidos) y en el paso 1 en los demás casos.
- AC-15 (seguridad): `STRIPE_SECRET_KEY` solo se lee en `lib/stripe.ts` (grep: ningún `NEXT_PUBLIC_STRIPE` ni import de `lib/stripe` en archivos `"use client"`); `.env.example` incluye `STRIPE_SECRET_KEY=` sin valor; ningún archivo `.env*` real está en git. `lib/stripe.ts` no falla en el build si la variable falta: lanza un error claro solo al usarse.
- AC-16: `docs/reglas-negocio-itse.md` ya no dice "sin pago en línea" ni "solo se registra el número de boleta": la sección 4 describe el pago de la tasa con Stripe en modo prueba y la 12 lo quita de "Fuera del alcance" (queda: firma digital, integración con trámite documentario, etc.). La transición `BORRADOR -> PRESENTADO` se documenta como condicionada al pago confirmado.
- AC-17: Los tests no hacen llamadas reales a Stripe (`vi.mock("@/lib/stripe")`). Sin `any`/`@ts-ignore`, textos en español sin términos técnicos, sin desborde horizontal a 360 px, foco visible y botones de 44 px de alto. `npm run build`, `npm run lint` y `npx vitest run` pasan.

## Tareas
### T1 — Dependencia, cliente de Stripe y documentación de reglas
- Archivos: `package.json` (modificar), `package-lock.json` (modificar), `lib/stripe.ts` (crear: `getStripe()` perezoso con `STRIPE_SECRET_KEY`, solo servidor), `.env.example` (modificar: agregar `STRIPE_SECRET_KEY=` y `NEXT_PUBLIC_APP_URL=http://localhost:3000` si falta), `docs/reglas-negocio-itse.md` (modificar secciones 4, 6.1 nota y 12)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-15, AC-16
- Tests: no aplica (inicialización de cliente, instalación y documentación; el cliente se mockea en los tests de T5)
- [ ] Completada

### T2 — Migración de pago y constante de tasa
- Archivos: `db/schema.ts` (modificar: `stripeSessionId` único, `pagadoAt`, comentario de obsoleta en `numeroBoleta`), `drizzle/0009_*.sql` (crear con `npm run db:generate`), `drizzle/meta/_journal.json` (modificar, generado), `drizzle/meta/0009_snapshot.json` (crear, generado), `modules/expedientes/constants/tasa.ts` (crear: `MONEDA`, montos y `montoTasa(nivel)`)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-1, AC-4
- Tests: `modules/expedientes/constants/tasa.test.ts` queda cubierto dentro de T5 (`pago.service.test.ts` verifica `montoTasa` por nivel) para no superar 5 archivos
- [ ] Completada

### T3 — Reglas puras de completitud, schema sin paso 4 y tipos
- Archivos: `modules/expedientes/utils/completitud.ts` (crear: `faltantesBorrador`), `modules/expedientes/utils/completitud.test.ts` (crear), `modules/expedientes/schemas/solicitud.schema.ts` (modificar: quitar `paso4Schema`/`Paso4Input`), `modules/expedientes/schemas/solicitud.schema.test.ts` (modificar), `modules/expedientes/types/expediente.types.ts` (modificar: `ExpedienteListItem` con `pagoPendiente: boolean`)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-2 (parte pura y schema), AC-13 (tipo)
- Tests: `completitud.test.ts` — borrador vacío (`paso1`..`paso3` + documentos), completo, nivel nulo, documento extra no requerido no bloquea; `solicitud.schema.test.ts` — se eliminan los casos de `paso4Schema`
- [ ] Completada

### T4 — Servicio de expedientes, acciones sin paso 4 y listado con «Falta el pago»
- Archivos: `modules/expedientes/services/expediente.service.ts` (modificar: quitar `enviarExpediente`; agregar `prepararPago`, `presentarExpediente`, `guardarSesionPago`; `listOwnExpedientes` con `pagoPendiente`; reutiliza `faltantesBorrador`), `modules/expedientes/services/expediente.service.test.ts` (modificar), `modules/expedientes/actions/expediente.actions.ts` (modificar: quitar paso 4, `NOMBRES_FALTANTE.paso4` y `enviarSolicitudAction`; exportar `NOMBRES_FALTANTE` o moverlo a un util solo si T5 lo necesita, preferir exportarlo), `modules/expedientes/actions/expediente.actions.test.ts` (modificar), `modules/expedientes/components/ExpedientesView.tsx` (modificar: insignia «Falta el pago» y botón «Pagar»)
- Depende de: T2, T3
- Grupo paralelo: G2
- Cubre: AC-2 (acciones), AC-3, AC-5, AC-6, AC-13
- Tests: `expediente.service.test.ts` — `prepararPago` (completo, incompleto, ajeno, no BORRADOR, rol no cliente, no cambia estado), `presentarExpediente` (transición, historial, reintento `23505`, ya presentado/ajeno -> `no_encontrado`), `listOwnExpedientes` (`pagoPendiente` solo en borradores completos); `expediente.actions.test.ts` — paso 4 rechazado, se eliminan los casos de `enviarSolicitudAction`. `ExpedientesView` es presentacional con una condicional (cubierto por `app/mi-cuenta/expedientes/page.test.tsx` existente; el developer lo ajusta solo si rompe y avisa, porque no está en la lista)
- [ ] Completada

### T5 — Servicio y acción de pago con Stripe
- Archivos: `modules/expedientes/services/pago.service.ts` (crear: `crearSesionPago`, `confirmarPago`), `modules/expedientes/services/pago.service.test.ts` (crear), `modules/expedientes/actions/pago.actions.ts` (crear: `iniciarPagoAction`), `modules/expedientes/actions/pago.actions.test.ts` (crear), `app/mi-cuenta/pago/confirmar/route.ts` (crear)
- Depende de: T1, T2, T4
- Grupo paralelo: G3
- Cubre: AC-1 (monto en servidor), AC-7, AC-8, AC-9, AC-10, AC-11
- Tests: `pago.service.test.ts` — `montoTasa` por nivel, parámetros de la sesión, reutilización/expiración, IDOR y idempotencia de `confirmarPago` (Stripe mockeado); `pago.actions.test.ts` — rol, uuid, declaración, `incompleto`, redirect, error de Stripe. `route.ts`: no aplica test propio por el tope de 5 archivos; es un adaptador delgado (auth + redirecciones) sobre `confirmarPago`, y el reviewer lo valida por lectura contra AC-11
- [ ] Completada

### T6 — Paso Documentos sin boleta, paso «Resumen y pago» y apertura en el paso 5
- Archivos: `modules/expedientes/components/SolicitudWizard.tsx` (modificar: `PasoDocumentos` sin boleta y sin `saveBorradorAction`; paso inicial 5 si completo), `modules/expedientes/components/SolicitudWizard.test.tsx` (modificar), `modules/expedientes/components/StepResumen.tsx` (modificar: tasa, sin boleta, «Aceptar y pagar» con `iniciarPagoAction`)
- Depende de: T3, T5
- Grupo paralelo: G4
- Cubre: AC-12, AC-14, AC-17
- Tests: `SolicitudWizard.test.tsx` — el paso 4 no muestra boleta y avanza sin llamar a `saveBorradorAction`; el paso 5 muestra la tasa y «Aceptar y pagar» llama a `iniciarPagoAction`; un borrador completo abre en el paso 5 y uno incompleto en el paso 1. `StepResumen` se prueba a través del wizard
- [ ] Completada

## Riesgos y notas para el reviewer
- **Subida de documentos aún no implementada** (el paso 4 muestra "La subida de documentos estará disponible pronto" y no existe `app/api/uploadthing`): sin esa Fase B ningún borrador queda "completo" desde la UI, así que el flujo de pago solo se puede probar de punta a punta tras implementarla. Los tests unitarios no dependen de ello.
- Mutación en un GET (la ruta de retorno): aceptable aquí por ser idempotente y protegida por dueño + sesión guardada; un webhook sería el camino en producción.
- Entre T4 y T6 el árbol no compila de punta a punta (el wizard aún importa `enviarSolicitudAction`); validar `npm run build` solo al terminar T6.

## Fases siguientes
- Fase 2 (producción): webhook `checkout.session.completed` que reutilice `confirmarPago`, y `monto_pagado`/recibo si el certificado lo requiere.
