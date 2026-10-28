# PDF del certificado con QR y verificación pública

Estado: approved
Nota (cambio posterior): el personal (admin y superadmin) ve el PDF del certificado como BORRADOR mientras el expediente está en `CERTIFICADO_PENDIENTE_FIRMA`, antes de aprobarlo (enlace «Ver certificado (borrador)»); esto revierte la decisión «sin vista previa». El cliente sigue sin verlo hasta `ENTREGADO` y la Resolución no tiene borrador.

Parte 3 de 4 de `certificados`. **Depende de `certificado-emision`** (tabla `certificados`, `certificadoDescargable`, `estadoCertificado`, `normalizarCodigo`, `formatCodigo`, `PanelCertificado`) y se apoya en `constancia-designacion` (patrón de PDF y de ruta de descarga). **Depende también de `certificado-resolucion-entrega`** (estados `FINALIZADO`/`ENTREGADO`, columnas de la Resolución y la ruta `/api/expedientes/<id>/resolucion`, que T6 enlaza). El PDF de la Resolución Gerencial pertenece a esa spec; esta cubre el PDF del certificado y la verificación pública.

## Objetivo
El personal y el dueño del expediente descargan el **Certificado de ITSE en PDF** con un **código QR** que lleva a `/verificar/[codigo]`, y cualquier persona, **sin sesión**, comprueba en esa página que el certificado es auténtico y si está vigente, por vencer, vencido o anulado, viendo solo datos mínimos y no sensibles.

## Fuera de alcance
- Guardar el PDF (se genera al vuelo, como la constancia); firma digital o sello real; logo o escudo de la municipalidad.
- Limitar la tasa de consultas dentro de la aplicación (ver decisión 5) y bloqueo de bots: no se evade ni se implementa un anti-bot propio.
- Descarga del certificado antes de la aprobación del superadmin (no hay vista previa del borrador).
- Listados y «por vencer» (spec 4); correo o SMS.
- Verificar el certificado escaneando con la cámara dentro de la página (el QR se lee con la cámara del teléfono, que abre la URL).

## Decisiones (a confirmar al aprobar)
1. **QR con `qrcode` ^1.5.4** (última publicada; tipos en `@types/qrcode` ^1.5.6, dependencia de desarrollo), ya prevista en `constitucion` 1. Es JavaScript puro sin dependencia de React (compatible con React 19), genera en servidor un PNG como data URL (`toDataURL`) que `@react-pdf/renderer` acepta en `<Image>` sin red ni archivos. Descartadas `react-qr-code` y `qr-code-styling` (generan SVG/canvas para el navegador; el PDF necesita imagen). Se importa solo en servidor (`qr.ts`, nunca desde un `"use client"`); el developer verifica que `npm run build` lo resuelve (si Next lo requiriera, se agrega a `serverExternalPackages`, pero hoy no se espera).
2. **URL del QR:** `${NEXT_PUBLIC_APP_URL}/verificar/<codigo sin guiones>`; si la variable no existe se usa el origen de la petición. El código impreso se muestra agrupado (`ABCD-EFGH-JKMN`) y el verificador acepta ambas formas.
3. **Quién descarga:** personal desde `FINALIZADO` (certificado aprobado) y en `ENTREGADO`; cliente dueño **solo en `ENTREGADO`**, es decir después de que el admin se lo envió (`certificadoDescargable`). Nunca para un expediente `ANULADO` ni antes de la aprobación (`emitido_at` nulo); en `CERTIFICADO_PENDIENTE_FIRMA` no hay descarga ni vista previa (a confirmar: el superadmin no ve borrador antes de aprobar). Mismo 404 para ajeno, inexistente o no descargable (IDOR); 401 sin sesión.
4. **Datos mínimos de la verificación pública:** número del certificado, nombre comercial y distrito del establecimiento, fecha de expedición, fecha de vencimiento y estado (Vigente / Por vencer / Vencido / Anulado). **No** se muestra: solicitante, documento, teléfono, correo, razón social, RUC, dirección exacta, número de expediente ni nivel de riesgo. Solo se consultan esas columnas (no `select *`).
5. **Contra la enumeración (decisión de criterio):** (a) el código es aleatorio de 60 bits, no secuencial ni derivado del número: adivinarlo no es viable; (b) se valida el formato con `normalizarCodigo` **antes** de consultar la base, y un código mal escrito y uno inexistente dan **la misma respuesta** (404 con el mismo texto), sin pistas; (c) la página no lista ni sugiere códigos y no está indexada (`robots: noindex, nofollow`); (d) no se cachea ni se registra el código en logs de la aplicación. **No se implementa un limitador de tasa en la aplicación** (en serverless no hay un almacén compartido sin sumar infraestructura, YAGNI); si se despliega, se recomienda activar el límite de tasa de la plataforma (p. ej. el firewall de Vercel) sobre `/verificar/*`. Límite aceptado y declarado.
6. **Solo certificados aprobados:** la verificación reconoce un código solo si el certificado tiene `emitido_at` (la vigencia empieza al aprobar el superadmin) y el expediente está en `FINALIZADO`, `ENTREGADO` o `ANULADO` (este último se muestra como «Anulado»). Un certificado pendiente de firma responde como inexistente. `FINALIZADO` (aprobado, aún no enviado al cliente) sí se reconoce porque el certificado ya es válido y el personal puede imprimirlo; el código solo lo conoce el personal hasta el envío (a confirmar).
7. **Texto del certificado en lenguaje llano** y pie «Proyecto académico. Documento sin validez oficial.» (`constitucion` 10); fuente integrada Helvetica.

## Reutilización
- Existente que se reutiliza: patrón de ruta de `app/api/expedientes/[id]/constancia/route.ts` y de documento de `ConstanciaDesignacionDocument.tsx`; `@react-pdf/renderer` (ya instalado); `getOrCreateUser`; `tipoItsePorRiesgo`; `RIESGO_LABELS`; `formatFecha`; `jefeNombre` por historial (patrón de `constancia.service.ts`); `estadoCertificado`, `certificadoDescargable`, `normalizarCodigo`, `formatCodigo`, `CertificadoEstadoBadge`, `getResumenCertificado` (spec 1); `SiteHeader` y `SiteFooter` de `modules/landing/components/` (sin props); `PageHeader`, `Card`, `Badge`, `buttonVariants`; el formulario y `buildVerifyPath` de la landing, que ya apuntan a `/verificar/<código>`; `proxy.ts`, que ya declara `/verificar(.*)` como pública (no cambia).
- Existente que se extiende: `package.json` y `package-lock.json` (dependencias); `PanelCertificado.tsx` (enlace de descarga del personal); `ExpedienteDetalleCliente.tsx` y `app/mi-cuenta/expedientes/[id]/page.tsx` (bloque del cliente).
- Nuevo (y por qué): `qr.ts`; `certificado-pdf.service.ts` (datos del PDF con reglas de acceso propias, distinto del resumen); `CertificadoDocument.tsx` y la ruta (no hay otro PDF de certificado); `verificacion.service.ts` (consulta pública sin actor, que no debe compartir función con las que exigen sesión); página `/verificar/[codigo]` y `VerificacionResultado.tsx`; `CertificadoCliente.tsx`.
- Dependencias a instalar antes de implementar (T1): `npm install qrcode@^1.5.4` y `npm install -D @types/qrcode@^1.5.6`. Componentes shadcn: ninguno. Sin migración.

## Specs afectadas
- `certificado-emision` / `certificado-resolucion-entrega`: `PanelCertificado` gana los enlaces «Descargar certificado» y «Descargar resolución» (personal, desde `FINALIZADO`).
- `landing-sections`: sin cambios; el formulario ya navega a `/verificar/<código>` (hoy daba 404). `buildVerifyPath` conserva su comportamiento (la normalización la hace la página).
- `constancia-designacion`: sin cambios; este PDF sigue su patrón.

## Criterios de aceptación
- AC-1 (QR): `urlVerificacion(base, codigo)` quita la barra final de `base` y el guion del código: `("http://localhost:3000/", "ABCD-EFGH-JKMN")` → `"http://localhost:3000/verificar/ABCDEFGHJKMN"`. `generarQrDataUrl(url)` devuelve una cadena que empieza con `data:image/png;base64,` (con `qrcode` real) y rechaza una cadena vacía. `package.json` declara `qrcode` en `dependencies` y `@types/qrcode` en `devDependencies`; `qrcode` solo se importa en `qr.ts` (grep).
- AC-2 (datos del PDF): `getCertificadoPdfData(actor, expedienteId)` devuelve `null` si el expediente no existe, no tiene fila en `certificados`, tiene `emitidoAt` nulo, o `!certificadoDescargable(actor.rol, estado)` (incluye `ANULADO`); para `cliente` además `null` si el expediente no es suyo (mismo `null` que inexistente). Si no, devuelve `numero`, `codigo` (sin guiones), `emitidoAt`, `venceAt`, `expedienteNumero`, `solicitante` (`nombre`, `razonSocial`), `establecimiento` (`nombreComercial`, `direccion`, `distrito`, `giro`, `areaM2`), `nivelRiesgo`, `tipoItse` y `jefeNombre` (usuario que llevó el expediente a `FINALIZADO`, es decir el superadmin que aprobó, o `null`). No incluye documento, teléfono ni correo.
- AC-3 (ruta): `GET /api/expedientes/[id]/certificado` responde 401 sin usuario o con usuario inactivo; 404 para id no uuid y cuando `getCertificadoPdfData` devuelve `null` (cliente ajeno, inexistente, no descargable, anulado: idéntico cuerpo y estado); y 200 con `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="certificado-0001-2026.pdf"` y `Cache-Control: private, no-store`. El cuerpo empieza con `%PDF`. La ruta no acepta parámetros más allá del id.
- AC-4 (documento): el PDF (A4) contiene: título «Certificado de Inspección Técnica de Seguridad en Edificaciones», número, tipo de ITSE (previa o posterior) y nivel de riesgo, solicitante (y razón social si existe), establecimiento con dirección, distrito, giro y área en m², fecha de expedición y fecha de vencimiento (`dd/MM/yyyy`, hora de Lima), el código agrupado, el QR con la URL de verificación impresa debajo, línea de firma con «Jefe de GRDyDC» y el nombre si existe, y el pie académico. Tildes correctas, sin fuentes externas, sin imágenes con marcas ni escudos.
- AC-5 (aislamiento de la importación): `@react-pdf/renderer` solo se importa en `CertificadoDocument.tsx`, `ResolucionDocument.tsx`, `ConstanciaDesignacionDocument.tsx`, y en los tres `route.ts` de PDF (grep); ningún componente `"use client"` lo importa.
- AC-6 (verificación, servicio): `verificarCertificado(codigoCrudo, ahora?)` no recibe actor ni consulta sesión. Si `normalizarCodigo` devuelve `null`, responde `{ status: "no_encontrado" }` **sin consultar la base**. Si no hay fila, o `emitidoAt` es nulo, o el expediente no está en `FINALIZADO`, `ENTREGADO` o `ANULADO`, responde `{ status: "no_encontrado" }`. En otro caso `{ status: "ok", data }` con **exactamente** las claves `numero`, `nombreComercial`, `distrito`, `emitidoAt`, `venceAt`, `estado` (de `estadoCertificado`, con `revocado` cuando el expediente está `ANULADO`); un test falla si aparece cualquier otra clave.
- AC-7 (página pública): `/verificar/[codigo]` no llama a `getOrCreateUser`, `requireRole` ni a Clerk (grep) y funciona sin sesión; en `no_encontrado` invoca `notFound()`. `app/verificar/[codigo]/not-found.tsx` muestra, con estado 404, «No encontramos un certificado con ese código. Revisa que lo hayas escrito bien.» y un enlace «Volver a verificar» a `/#verificar-certificado`; el mensaje es el mismo para un código mal escrito y para uno inexistente. La página exporta `metadata` con `robots: { index: false, follow: false }`. Con `ok` muestra número, nombre comercial y distrito, fechas `dd/MM/yyyy` y el estado con `CertificadoEstadoBadge` y texto (p. ej. «Este certificado está vigente hasta el 15/03/2028»; en `POR_VENCER` «vence en N días»; en `VENCIDO` «venció el …»; en `REVOCADO` «Este certificado fue anulado»). Acepta el código con minúsculas, espacios o guiones. No muestra solicitante, documento, correo, teléfono, RUC, dirección exacta ni número de expediente (test del componente por texto). Usa `SiteHeader` y `SiteFooter`.
- AC-8 (UI de descarga): `PanelCertificado` muestra a admin/superadmin, cuando `certificadoDescargable(rol, estado)` (`FINALIZADO` o `ENTREGADO`), los enlaces «Descargar certificado» a `/api/expedientes/<id>/certificado` y «Descargar resolución» a `/api/expedientes/<id>/resolucion` (`inline-flex min-h-11`, foco visible, nombre accesible con el número del certificado y de la resolución respectivamente). `CertificadoCliente` (nuevo) en el detalle del cliente muestra, solo si `getResumenCertificado` devuelve datos (es decir solo en `ENTREGADO`, tras el envío del admin; en `FINALIZADO` el cliente no ve nada), el número, vigencia, `CertificadoEstadoBadge` y los enlaces «Descargar certificado» y «Descargar resolución»; en `POR_VENCER` agrega «Tu certificado vence en N días. Cuando falte poco, inicia una nueva solicitud para renovarlo.». El cliente no ve el código ni controles del personal.
- AC-9 (privacidad): ningún dato del certificado llega a un `app/mi-cuenta/*` salvo vía `getResumenCertificado` (sin `codigo`) y la ruta de descarga; el historial del cliente sigue sin nombres del personal.
- AC-10 (responsive y accesibilidad): la página de verificación y el bloque del cliente sin desborde horizontal a 360, 768 y 1280 px; estado siempre con texto (no solo color); contraste y foco visible; solo tokens del tema.
- AC-11: `npm run build` (confirma que el PDF y `qrcode` se resuelven en servidor), `npm run lint` y `npx vitest run` pasan; sin `any`/`@ts-ignore`.

## Tareas
### T1 — Dependencia y utilidad de QR
- Archivos: `package.json` (modificar), `package-lock.json` (modificar), `modules/certificados/utils/qr.ts` (crear), `modules/certificados/utils/qr.test.ts` (crear)
- Depende de: `certificado-emision` completa
- Grupo paralelo: G1
- Cubre: AC-1
- Detalle: instalar solo `qrcode` y `@types/qrcode`; no tocar otras dependencias. `qr.ts` exporta `urlVerificacion` y `generarQrDataUrl`.
- Tests: `qr.test.ts` — URL con y sin barra final, código con guiones, data URL real, cadena vacía.
- [x] Completada

### T2 — Servicio de datos del PDF
- Archivos: `modules/certificados/services/certificado-pdf.service.ts` (crear), `modules/certificados/services/certificado-pdf.service.test.ts` (crear)
- Depende de: `certificado-emision` completa
- Grupo paralelo: G1
- Cubre: AC-2, AC-9 (datos)
- Tests: `null` por cada causa de AC-2; cliente propio vs ajeno; estado `FINALIZADO` visible para admin y no para cliente (el cliente solo en `ENTREGADO`), `CERTIFICADO_PENDIENTE_FIRMA` `null` para todos; ausencia de documento, teléfono y correo; `jefeNombre` nulo sin fila en el historial. `db` mockeado.
- [x] Completada

### T3 — Documento PDF y ruta de descarga
- Archivos: `modules/certificados/components/CertificadoDocument.tsx` (crear), `app/api/expedientes/[id]/certificado/route.ts` (crear), `app/api/expedientes/[id]/certificado/route.test.ts` (crear)
- Depende de: T1, T2
- Grupo paralelo: G2
- Cubre: AC-3, AC-4, AC-5
- Detalle: sigue `constancia/route.ts`; la ruta arma la URL con `process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin`, genera el QR y llama a `renderToBuffer`.
- Tests: `route.test.ts` — 401, 404 (id no uuid y datos `null`), 200 con las tres cabeceras y `%PDF` (con `getOrCreateUser`, `getCertificadoPdfData`, `generarQrDataUrl` y `renderToBuffer` mockeados). El documento es presentacional (SETUP.md 3.2).
- [x] Completada

### T4 — Servicio de verificación pública
- Archivos: `modules/certificados/services/verificacion.service.ts` (crear), `modules/certificados/services/verificacion.service.test.ts` (crear)
- Depende de: `certificado-emision` completa
- Grupo paralelo: G1
- Cubre: AC-6
- Tests: código inválido sin consulta a la base; sin fila; `emitidoAt` nulo; expediente en cada estado (aceptados `FINALIZADO`, `ENTREGADO`, `ANULADO`; rechazados los demás); las 4 combinaciones de estado; claves exactas del resultado; entrada con minúsculas y guiones. `db` mockeado.
- [x] Completada

### T5 — Página pública de verificación
- Archivos: `app/verificar/[codigo]/page.tsx` (crear), `app/verificar/[codigo]/not-found.tsx` (crear), `modules/certificados/components/VerificacionResultado.tsx` (crear), `app/verificar/[codigo]/page.test.tsx` (crear)
- Depende de: T4
- Grupo paralelo: G2
- Cubre: AC-7, AC-10 (página)
- Tests: `page.test.tsx` — `notFound()` en `no_encontrado`; resultado `ok` renderiza solo los campos permitidos y el texto por estado; no se importan `getOrCreateUser` ni `requireRole`; el patrón existente de `page.test.tsx` de otras rutas.
- [x] Completada

### T6 — Enlaces de descarga (personal y cliente)
- Archivos: `modules/certificados/components/PanelCertificado.tsx` (modificar), `modules/certificados/components/CertificadoCliente.tsx` (crear), `modules/expedientes/components/ExpedienteDetalleCliente.tsx` (modificar), `app/mi-cuenta/expedientes/[id]/page.tsx` (modificar), `app/mi-cuenta/expedientes/[id]/page.test.tsx` (modificar)
- Depende de: T3 y `certificado-resolucion-entrega` completa (ruta de la Resolución)
- Grupo paralelo: G3
- Cubre: AC-8, AC-9, AC-10 (bloque del cliente)
- Detalle: la página del cliente suma `getResumenCertificado` al `Promise.all` y pasa el resultado a `ExpedienteDetalleCliente` como prop opcional; el bloque se ubica antes del historial.
- Tests: `page.test.tsx` existente — ajustar los mocks y verificar que se pasa el resumen. `CertificadoCliente` y el enlace son presentacionales (SETUP.md 3.2).
- [x] Completada

## Grupos paralelos
- G1: T1, T2, T4 (archivos disjuntos). G2: T3, T5 (disjuntos; T3 consume T1+T2, T5 consume T4). G3: T6.

## Fases siguientes
- Spec 4 `certificados-listados`.
