# Reglas de negocio — ITSE

Fuente de verdad del dominio. Basado en:
- **TUO de la Ley N.° 28976**, Ley Marco de Licencia de Funcionamiento (DS 163-2020-PCM)
- **DS 002-2018-PCM**, Nuevo Reglamento de Inspecciones Técnicas de Seguridad en Edificaciones
- **Manual de Ejecución de ITSE** del CENEPRED (RJ 016-2018-CENEPRED/J) y sus anexos
- **Ley N.° 30619** (vigencia de 2 años del certificado)
- El flujo real de la oficina de GRDyDC de la municipalidad

> El Ministerio de Vivienda anunció en 2026 la actualización del reglamento de ITSE. Mientras no se publique uno nuevo, rige el DS 002-2018-PCM. Si cambia, actualizar este documento primero.

---

## 1. Conceptos

| Término | Significado |
|---|---|
| **ITSE** | Inspección Técnica de Seguridad en Edificaciones |
| **Administrado** | Persona natural o jurídica que solicita la ITSE (rol `cliente`) |
| **Establecimiento objeto de inspección** | El local que se inspecciona |
| **Órgano ejecutante** | La oficina de GRDyDC de la municipalidad |
| **Diligencia** | La visita de inspección al local |
| **Acta de Diligencia** | Anexo 9 del Manual; documento que se llena en la visita |
| **Informe de ITSE** | Resultado final del inspector: favorable (cumple) o desfavorable (no cumple) |
| **Certificado de ITSE** | Documento que acredita que el local cumple; vigencia de 2 años |
| **Constancia de Designación** | Documento firmado por el jefe de GRDyDC que designa al inspector |
| **Matriz de Riesgos** | Tabla oficial que clasifica el nivel de riesgo del establecimiento |
| **VISE** | Visita de Inspección de Seguridad en Edificaciones, a locales que ya tienen certificado |

---

## 2. Niveles de riesgo y tipo de ITSE

| Nivel de riesgo | Tipo de ITSE | Momento | N.° de inspectores |
|---|---|---|---|
| `BAJO` | Posterior | Después de otorgada la licencia | 1 |
| `MEDIO` | Posterior | Después de otorgada la licencia | 1 |
| `ALTO` | Previa | Antes de otorgar la licencia | 2 |
| `MUY_ALTO` | Previa | Antes de otorgar la licencia | 3 |

```ts
tipoItsePorRiesgo(riesgo) → riesgo in [BAJO, MEDIO] ? "POSTERIOR" : "PREVIA"
inspectoresRequeridos(riesgo) → { BAJO: 1, MEDIO: 1, ALTO: 2, MUY_ALTO: 3 }[riesgo]
```

### 2.1 Referencia de la Matriz de Riesgos (función Comercio)

- **Decisión del proyecto:** la Matriz para Comercio usa 3 pisos / 750 m²; este sistema usa umbrales más estrictos.
- Edificación de hasta 2 pisos y/o área techada total de hasta 500 m² → riesgo **MEDIO**.
- Edificación de más de 2 pisos y/o área techada total mayor a 500 m² → riesgo **ALTO**.
- **Grifos / estaciones de servicio:** siempre riesgo **MEDIO**. La municipalidad solo realiza la ITSE a sus oficinas administrativas; el combustible (tanques, área de despacho) lo regula Osinergmin, cuya licencia se pide como documento.
- Factores que incrementan el riesgo: sótano, almacenamiento de inflamables, ubicación en edificación de uso mixto sin certificado de ITSE en áreas comunes, entre otros.
- Ejemplos típicos de riesgo medio: bodegas, librerías, boticas, minimarkets.

**Hospedaje (Matriz CENEPRED):** cuando la función es Hospedaje se aplica esta tabla en lugar de la lógica general. El nivel es el **más alto** entre los criterios y nunca es BAJO. El grifo conserva prioridad (MEDIO).

| Criterio | MEDIO | ALTO | MUY_ALTO |
|---|---|---|---|
| Pisos | hasta 2 | 3 a 4 | 5 o más |
| Camas o habitaciones | hasta 20 | 21 a 100 | más de 100 |
| Área techada (m²) | hasta 500 | más de 500 hasta 3000 | más de 3000 |
| Sótano | | al menos ALTO | |
| Uso mixto o patrimonio cultural | | al menos ALTO | |
| Gran escala (restaurante de alta capacidad, discoteca o salas de eventos integradas) | | | MUY_ALTO |

Los sumandos de sótano e inflamables de la lógica general no se aplican a Hospedaje. Límites aceptados: no se distingue un sótano comercial o estacionamiento amplio de otro sótano (se resuelve con la casilla de gran escala); si un Hospedaje existente tiene el número de camas sin registrar (null), ese criterio se ignora hasta que se edite el establecimiento.

**En el sistema:** el cliente **declara** el nivel de riesgo en el wizard con ayuda de preguntas orientativas (función, área, pisos, sótano, inflamables). La clasificación final la confirma el `admin`. El sistema solo sugiere, no decide.

---

## 3. Tipos de trámite

| Tipo | Descripción |
|---|---|
| `NUEVA` | Primera ITSE del establecimiento |
| `RENOVACION` | Vence el certificado anterior (cada 2 años) |

Para la **renovación de riesgo alto y muy alto**: solicitud + pago + declaración jurada de que se mantienen las condiciones de seguridad. Si las condiciones cambiaron, se tramita una ITSE nueva según el nuevo nivel de riesgo.

---

## 4. Documentos de la solicitud

Los documentos que debe subir el cliente dependen del nivel de riesgo declarado y de tres datos del paso 2 (cocina, grifo, inflamables):

- **Todo nivel de riesgo:** Ficha RUC, extintores PQS, capacitación en uso de extintores (un solo documento que cubre PQS, Tipo K o ambos).
- **Si tiene cocina (restaurante), en cualquier nivel:** extintores Tipo K. La casilla solo aparece para la función Comercio.
- **Licencia/certificado de Osinergmin:** solo si es grifo (riesgo MEDIO). La casilla solo aparece para la función Oficinas administrativas.
- **Plan de seguridad:** ALTO/MUY_ALTO, y MEDIO con 2 o más pisos (ver párrafo "Plan de seguridad").
- **Solo riesgo ALTO/MUY_ALTO:** plano de arquitectura con aforo, planos eléctricos, certificado de pozo a tierra, memoria de pruebas de equipos.
- **Opcional en riesgo BAJO y MEDIO:** certificado de pozo a tierra (algunos negocios pequeños no lo tienen). En ALTO/MUY_ALTO es obligatorio.
- El paso Documentos solo lista los obligatorios y los opcionales del caso; no se muestran documentos que no aplican.

**Solicitante (paso 3):** el cliente declara su calidad: propietario, representante legal o administrador (por defecto propietario).
- **DNI:** obligatorio siempre, en un solo PDF con ambas caras.
- **Acreditación de la representación** (poder, designación u otro): obligatoria si es representante legal o administrador; no se pide al propietario.
- Ambos documentos son solo PDF (no se aceptan imágenes), hasta 8 MB, y se exigen al pagar. Se suben en el paso 3, no en el paso Documentos.

**Plan de seguridad:** se sube como archivo (`PLAN_SEGURIDAD`). Es obligatorio en riesgo ALTO/MUY_ALTO (siempre) y en riesgo MEDIO cuando el edificio tiene 2 o más pisos (con más de 2 pisos el local ya es ALTO). No se pide en MEDIO de 1 piso ni en BAJO. Regla anterior (reemplazada): el plan no se subía y solo se mostraba un aviso porque el inspector lo revisaba en físico.

**Pago de la tasa:** no hay comprobante de pago como archivo ni número de boleta. El cliente paga en línea con Stripe (Checkout hospedado, **modo prueba**, dinero ficticio). El monto lo fija el servidor según el tipo de ITSE que corresponde al nivel de riesgo y la solicitud solo se presenta cuando Stripe confirma el pago. La tasa es **editable por el superadmin** en `/panel/configuracion/tasas`, con dos montos: uno para ITSE posterior (riesgo bajo y medio) y otro para ITSE previa (riesgo alto y muy alto), entre S/ 5.00 y S/ 5,000.00. El expediente guarda el monto aplicado al abrir el pago (`expedientes.tasa_monto`) y el pago se valida contra ese monto, de modo que un cambio de tasa no afecta pagos en curso ni expedientes ya pagados.

**Un solo expediente por establecimiento:** un establecimiento no puede tener 2 o más expedientes. Solo vuelve a estar disponible si su expediente se anula (ANULADO); cualquier otro estado, incluidos BORRADOR, ENTREGADO («Finalizado» en pantalla) y NO_CUMPLE, lo mantiene ocupado. En el paso 1 de la solicitud esos establecimientos aparecen deshabilitados y el servidor lo valida al crear o editar el borrador. Al editar un borrador, ese mismo borrador no cuenta. La regla de archivar un establecimiento es distinta y no cambia.

**Pendiente de definir (renovaciones):** hoy no hay forma de renovar un establecimiento con certificado vigente, porque su expediente lo mantiene ocupado. Es una limitación aceptada por decisión del usuario; el flujo de renovación se definirá más adelante.

**Anular un borrador:** el cliente puede anular un borrador no pagado (BORRADOR pasa a ANULADO), libera el establecimiento y se borran de UploadThing los archivos que había subido (mejor esfuerzo).

**En el sistema** ya no se piden "2 juegos": los archivos digitales reemplazan las copias físicas.

---

## 5. Flujo real de la oficina (referencia)

1. Administrado presenta el expediente en mesa de partes.
2. GRDyDC recibe y elabora una solicitud de inspección dirigida a la Gerencia de Servicios Públicos.
3. Servicios Públicos deriva a las áreas que revisan requisitos, hasta Logística.
4. Logística contacta al inspector o inspectores según el nivel de riesgo.
5. El inspector recoge el expediente y la **Constancia de Designación** firmada por el jefe de GRDyDC.
6. El inspector coordina la fecha con el administrado y realiza la diligencia.
7. El inspector entrega el **Informe de ITSE** con anexos y fotos.
8. **Si cumple:** GRDyDC emite el **Certificado de ITSE** firmado por el jefe y solicita a Servicios Públicos la **Resolución Gerencial**. Con ambos documentos, se llama al administrado para la entrega. En el MVP la Resolución es ficticia y la genera el sistema al aprobar el certificado (no se solicita a Servicios Públicos ni se sube como archivo).
9. **Si no cumple:** no se emite certificado. En el sistema el expediente queda en `NO_CUMPLE`, que lo deriva automáticamente a Jefatura: el superadmin genera la **Resolución de no cumple** (`FINALIZADO`) y el admin la envía al cliente (`ENTREGADO`). No se emite certificado. La derivación a Comercialización ya no forma parte del proceso. El administrado, si corresponde, inicia un trámite nuevo.

---

## 6. Estados del expediente

| Estado | Quién lo asigna | Descripción |
|---|---|---|
| `BORRADOR` | cliente | Solicitud en preparación, aún no enviada |
| `PRESENTADO` | cliente | Enviada; espera revisión |
| `EN_REVISION` | admin | GRDyDC revisa documentos y nivel de riesgo |
| `OBSERVADO_REQUISITOS` | admin | Faltan documentos o hay errores; vuelve al cliente |
| `ENVIADO_JEFATURA` | admin | Revisión terminada; espera la aprobación de Jefatura |
| `APROBADO_JEFATURA` | superadmin | Aprobado por Jefatura; espera designación de inspector |
| `EN_TRAMITE_EXTERNO` | admin | **En desuso**: ya no forma parte del flujo (reemplazado por la aprobación de Jefatura) |
| `INSPECTOR_DESIGNADO` | admin | Inspector(es) designado(s); constancia generada |
| `DILIGENCIA_PROGRAMADA` | admin | Fecha de visita acordada |
| `EN_SUBSANACION` | admin | Diligencia suspendida con observaciones subsanables y plazo activo |
| `CUMPLE` | admin | Informe favorable registrado |
| `NO_CUMPLE` | admin | Informe desfavorable registrado; en espera de la Resolución de no cumple de Jefatura; no se emite certificado |
| `CERTIFICADO_PENDIENTE_FIRMA` | admin | Certificado generado y enviado a Jefatura; espera aprobación del superadmin |
| `PENDIENTE_RESOLUCION` | — | **En desuso**: la Resolución Gerencial se genera al aprobar el certificado; nadie entra a este estado |
| `FINALIZADO` | superadmin | Certificado aprobado y Resolución generada (o Resolución de no cumple generada); pendiente de enviar al cliente |
| `ENTREGADO` | admin | Certificado y resolución (o solo la Resolución de no cumple) enviados al cliente |
| `DERIVADO_COMERCIALIZACION` | admin | **En desuso**: ya no forma parte del flujo (el área de Comercialización no interviene; `NO_CUMPLE` lo resuelve Jefatura) |
| `ANULADO` | superadmin | Expediente anulado (con motivo obligatorio) |

### 6.1 Transiciones permitidas

```
BORRADOR → PRESENTADO   (solo con el pago de la tasa confirmado por Stripe)
PRESENTADO → EN_REVISION
EN_REVISION → OBSERVADO_REQUISITOS | ENVIADO_JEFATURA
OBSERVADO_REQUISITOS → PRESENTADO (cuando el cliente corrige)
ENVIADO_JEFATURA → APROBADO_JEFATURA | EN_REVISION   [solo superadmin; la devolución exige motivo]
APROBADO_JEFATURA → INSPECTOR_DESIGNADO
INSPECTOR_DESIGNADO → DILIGENCIA_PROGRAMADA
DILIGENCIA_PROGRAMADA → EN_SUBSANACION | CUMPLE | NO_CUMPLE
EN_SUBSANACION → CUMPLE | NO_CUMPLE
CUMPLE → CERTIFICADO_PENDIENTE_FIRMA
CERTIFICADO_PENDIENTE_FIRMA → FINALIZADO   [solo superadmin; genera la Resolución Gerencial]
FINALIZADO → ENTREGADO
NO_CUMPLE → FINALIZADO   [solo superadmin; genera la Resolución de no cumple]
(cualquier estado no final) → ANULADO   [solo superadmin]
```

Cualquier otra transición debe rechazarse en servidor. **Toda transición se registra** en `historial_estados` con usuario, fecha y comentario.

---

## 7. Diligencia y observaciones

### 7.1 Resultados posibles de la diligencia

1. **Cumple** → informe favorable.
2. **Observaciones subsanables** → se suspende la diligencia y se otorga un plazo.
3. **No cumple** → informe desfavorable.
4. **Nivel de riesgo distinto al declarado** (alto o muy alto en vez de bajo o medio) → se concluye el procedimiento sin certificado; el administrado debe tramitar según el riesgo correcto.
5. **Diligencia no realizada** (local cerrado, administrado ausente) → se reprograma por única vez dentro de los 2 días hábiles siguientes.

### 7.2 Subsanación según tipo de ITSE

| | ITSE posterior (bajo / medio) | ITSE previa (alto / muy alto) |
|---|---|---|
| Base legal | Art. 23 del DS 002-2018-PCM | Art. 28 del DS 002-2018-PCM |
| Ejecución de la diligencia | Máx. 7 días hábiles desde la notificación de la licencia | Ver sección 8 (verificar en el texto oficial) |
| Formato | Anexo 9, sección VI.1 | Anexo 9, sección VI.2 + Anexo 7a |
| Qué se puede subsanar | **Solo** observaciones no relevantes en términos de riesgo (lista cerrada) | Las que el grupo inspector califique como subsanables |
| Plazo máximo | **3 días hábiles** desde la suspensión | **20 días hábiles** desde la suspensión |
| Cómo se levanta | El administrado presenta **declaración jurada + panel fotográfico** con leyenda; el inspector no necesita volver | Se **reprograma y reanuda la diligencia**; los inspectores vuelven |
| Si hay observación relevante | **Informe desfavorable directo, sin plazo** | Puede ser subsanable si se corrige en 20 días |

```ts
plazoSubsanacion(tipoItse) → tipoItse === "POSTERIOR" ? 3 : 20   // días hábiles
```

### 7.3 Observaciones NO relevantes en términos de riesgo (catálogo)

Lista guardada en la tabla `catalogo_observaciones`, editable por el superadmin en `/panel/configuracion/catalogo`. Solo estas permiten subsanación en ITSE posterior. Al crear una observación el usuario escribe solo la descripción; el código lo genera el sistema, es único e inmutable. Una observación **se desactiva, no se borra**: deja de ofrecerse en diligencias nuevas, pero las ya registradas en expedientes conservan su código y descripción copiados. Si no queda ninguna activa, toda observación se considera relevante. Ejemplos tomados del Anexo 9 (semilla inicial):

- Retirar obstáculos de los medios de evacuación (pasadizos, escaleras, accesos, salidas).
- Colocar señalización de seguridad (salida, zona segura en caso de sismo, riesgo eléctrico, extintores).
- Instalar, recargar o reubicar extintores.
- Colocar tapas a las aberturas no usadas en los tableros eléctricos.
- Colocar tapa a las cajas de paso de conductores eléctricos.
- Instalar iluminación general y de emergencia en la zona de los tableros eléctricos.

> **Pendiente:** copiar la lista completa y textual del Anexo 9 oficial del CENEPRED al catálogo (tabla `catalogo_observaciones`).

### 7.4 Observaciones relevantes en términos de riesgo (ejemplos)

Todo lo que **no** está en el catálogo. Ejemplos:
- **Colapso:** estructuras (postes, columnas, vigas, viguetas, techos, tijerales) con rajaduras, pandeos o deflexiones; madera o bambú con apolillamiento o humedad (muy frecuente en la selva); soportes de aire acondicionado, anuncios, antenas o anaqueles mal fijados, oxidados o inclinados.
- **Eléctrico:** falta de protección termomagnética o diferencial, conductores deteriorados o sobrecalentados, falta de aterramiento donde se requiere.
- **Evacuación por diseño:** salidas insuficientes, puertas que abren en sentido contrario, rutas angostas que requieren obra.
- **Incendio:** inflamables o GLP sin condiciones de seguridad.
- **Sótanos:** extracción de monóxido de carbono inoperativa.

### 7.5 Reglas para el sistema

- En ITSE posterior, al registrar observaciones:
  - Si **todas** pertenecen al catálogo → permitir `EN_SUBSANACION` con plazo de 3 días hábiles.
  - Si **alguna** es relevante → solo permitir `NO_CUMPLE`.
- En ITSE previa, las observaciones son de texto libre; al pasar a `EN_SUBSANACION` se registra la **fecha de reprogramación**, que no puede superar 20 días hábiles desde la suspensión.
- Si vence el plazo sin subsanación completa → el admin registra `NO_CUMPLE`.
- Calcular y mostrar siempre la **fecha límite** y los **días restantes**.

---

## 8. Plazos del procedimiento

| Concepto | Plazo |
|---|---|
| Ejecución de la diligencia de ITSE posterior | Máx. 7 días hábiles desde la notificación de la licencia |
| Subsanación en ITSE posterior | Máx. 3 días hábiles (fijo por norma, DS 002-2018-PCM art. 28) |
| Subsanación en ITSE previa | Máx. 20 días hábiles (no se computa en el plazo del procedimiento; fijo por norma, DS 002-2018-PCM art. 23) |
| Reprogramación por diligencia no realizada | Dentro de los 2 días hábiles siguientes |
| Subsanación en VISE | 2 días hábiles |
| Vigencia del certificado | **2 años** desde su expedición (fija por norma, Ley 30619) |
| Alerta de renovación (regla del sistema) | 60 días antes del vencimiento (fija, no configurable) |

**Feriados:** los días hábiles excluyen sábados, domingos y los feriados de la tabla `feriados`, que edita el superadmin en `/panel/configuracion/feriados` (la fecha es la clave; no hay dos feriados en la misma fecha). `subsanacion_limite` guarda la fecha límite calculada al abrir el plazo, pero los «días restantes» y «vencido» se recalculan al leer con los feriados vigentes: agregar o quitar un feriado puede cambiar el conteo de los plazos en curso (límite aceptado).

> **Pendiente de verificar en el texto oficial del DS 002-2018-PCM:** los plazos de ejecución de la diligencia en ITSE previa y los plazos máximos de **finalización del procedimiento** (7 y 9 días hábiles). Las fuentes secundarias consultadas no coinciden en cuál corresponde a cada tipo de ITSE. Importante: esos 7 o 9 días son el plazo **total del procedimiento**, no el plazo para ejecutar la visita, y no incluyen el tiempo de subsanación. No implementar alertas sobre estos plazos hasta confirmarlos.

---

## 9. Certificado de ITSE

- **Solo se genera** si el expediente está en `CUMPLE`.
- Numeración correlativa por año (de Lima): `0001-2026`, `0002-2026`…; el número se asigna **al generar** el certificado (si el expediente se anula antes de aprobar, el número queda sin usar).
- Lo genera el `admin` o el `superadmin` desde `CUMPLE` y queda en `CERTIFICADO_PENDIENTE_FIRMA`.
- **Vista previa:** el personal (admin y superadmin) ve el PDF como BORRADOR (marca «BORRADOR — PENDIENTE DE APROBACIÓN», fechas «Se definen al aprobar», jefe «Pendiente de aprobación») mientras está en `CERTIFICADO_PENDIENTE_FIRMA`, antes de aprobarlo. El cliente no lo ve hasta `ENTREGADO` y la verificación pública no lo reconoce hasta la aprobación.
- Datos: número, administrado, establecimiento, dirección, giro, nivel de riesgo, área, fecha de expedición, **fecha de vencimiento (+2 años)**, nombre del jefe de GRDyDC.
- Incluye un **código de verificación** y un **QR** que apunta a `/verificar/[codigo]`.
- **Solo el `superadmin`** puede aprobarlo (equivale a la firma del jefe). Un superadmin puede generar y aprobar el mismo certificado.
- Al aprobar, en un solo acto: se fija la fecha de expedición, la vigencia empieza (+2 años, hasta el final del día de vencimiento en Lima) y el sistema genera la **Resolución Gerencial** (`RG-AAAA-NNNN`, correlativa por año; ficticia, PDF generado al vuelo, sin subir archivos). El expediente pasa a `FINALIZADO`.
- El `admin` envía entonces el certificado y la resolución al cliente (`ENTREGADO`).
- No hay campo de aforo: el sistema no registra el aforo del establecimiento.
- Estado del certificado: `VIGENTE`, `POR_VENCER` (≤ 60 días), `VENCIDO`, `REVOCADO`. Se calcula al leer; `REVOCADO` equivale a que el expediente esté `ANULADO` (en pantalla se muestra «Anulado»).
- El certificado y la resolución solo son visibles y descargables para el cliente cuando el expediente llega a `ENTREGADO`; el personal los ve desde `FINALIZADO`.
- **El cliente descarga el certificado y la resolución solo desde «Mis certificados»** (`/mi-cuenta/certificados`, que también lista las resoluciones de no cumple entregadas). «Mis expedientes» y «Ver detalle» no tienen botones de descarga: solo enlazan a «Mis certificados» cuando el expediente está `ENTREGADO` (se muestra como «Finalizado»).

### Resolución de no cumple

- Cuando la inspección termina en `NO_CUMPLE` no hay certificado, QR, código de verificación ni vigencia.
- El expediente queda con Jefatura: el superadmin genera la Resolución de no cumple (`NO_CUMPLE → FINALIZADO`), con número `RG-AAAA-NNNN` compartido con la Resolución Gerencial del flujo exitoso (mismo correlativo anual).
- El admin la envía al cliente (`FINALIZADO → ENTREGADO`). El cliente solo la ve y descarga en `ENTREGADO`; el personal desde `FINALIZADO`.

---

## 10. Constancia de Designación

- Se habilita al pasar a `INSPECTOR_DESIGNADO`; el PDF se genera bajo demanda (no se almacena) y solo lo descarga el personal (admin/superadmin), nunca el cliente.
- Número: `CD-AAAA-NNNNN`, derivado del número del expediente (`EXP-2026-00001` → `CD-2026-00001`); un expediente tiene una sola constancia.
- Fecha: la de la designación (la más antigua del expediente), no la de la descarga.
- Datos: número, expediente, establecimiento, nivel de riesgo, inspector(es) designado(s) con su profesión si existe, fecha, nombre del jefe de GRDyDC.
- Jefe: el usuario que aprobó el expediente en Jefatura (`APROBADO_JEFATURA`); si no consta, solo «Jefe de GRDyDC».
- Validar que la cantidad de inspectores coincida con `inspectoresRequeridos(riesgo)`.
- Validar que el inspector esté activo. **Pospuesto:** la validación de que esté «autorizado para ese nivel de riesgo» no se aplica por ahora; cualquier inspector activo puede ir a cualquier nivel (la cantidad sí es exacta: 1/1/2/3). El campo `habilitadoPrevia` y la columna «Habilitado» se conservan sin efecto hasta definir la restricción.

---

## 11. Permisos por rol

| Acción | cliente | admin | superadmin |
|---|:-:|:-:|:-:|
| Registrar sus establecimientos | ✅ | | |
| Crear y enviar solicitud | ✅ | | |
| Ver sus expedientes | ✅ | | |
| Subir subsanación (DJ + fotos) | ✅ | | |
| Descargar su certificado y resolución, o su resolución de no cumple (solo tras el envío, en `ENTREGADO`) | ✅ | | |
| Ver todos los expedientes | | ✅ | ✅ |
| Cambiar estados (según transiciones) | | ✅ | ✅ |
| Gestionar inspectores | | ✅ | ✅ |
| Registrar diligencia y observaciones | | ✅ | ✅ |
| Aprobar / devolver expedientes en Jefatura | | | ✅ |
| Generar certificado y enviarlo a Jefatura | | ✅ | ✅ |
| Aprobar certificados y generar la resolución | | | ✅ |
| Generar la resolución de no cumple | | | ✅ |
| Enviar certificado y resolución (o la resolución de no cumple) al cliente | | ✅ | ✅ |
| Anular expedientes | | | ✅ |
| Gestionar usuarios y roles (listado, detalle con auditoría, cambio de rol, activar/desactivar e invitar personal en `/panel/usuarios`) | | | ✅ |
| Gestionar feriados, catálogo de observaciones y tasa de pago (`/panel/configuracion`, con historial de cambios) | | | ✅ |
| Ver reportes | | ✅ | ✅ |

> Los feriados, el catálogo de observaciones y la tasa viven en la BD (`feriados`, `catalogo_observaciones`, `tasas`) y los edita solo el superadmin; cada cambio queda en `configuracion_auditoria`. Siguen fijos en código por ser norma o regla del sistema: la vigencia de 2 años, los plazos de subsanación de 3 y 20 días hábiles y la alerta de 60 días. `usuarios.activo` y el rol se cambian solo desde `/panel/usuarios` (superadmin), con auditoría en `usuarios_auditoria`; nadie puede modificar su propia cuenta y siempre queda al menos un jefe activo. El cliente ve el nombre del inspector designado, pero no el del personal (admin/superadmin) que actúa en el expediente.

---

## 12. Fuera del alcance del MVP

- Firma digital certificada.
- Integración con el sistema de trámite documentario de la municipalidad.
- Inspectores, Servicios Públicos y Logística como usuarios del sistema.
- ECSE (espectáculos) y VISE completas.
