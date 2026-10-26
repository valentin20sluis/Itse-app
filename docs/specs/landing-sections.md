# Landing: secciones (fase 2 de 2)

Estado: approved

## Objetivo
Construir las secciones de contenido de la landing pública de SIGITSE (Qué es la ITSE, Cómo funciona, Niveles de riesgo, Beneficios, Verificar certificado, Preguntas frecuentes, CTA final) y armar `app/page.tsx` con header, hero y footer de la fase 1. Todo el contenido normativo proviene de `docs/reglas-negocio-itse.md`.

## Fuera de alcance
- Header, footer, hero, tokens, logo, `Reveal` e imágenes: ya definidos en `docs/specs/landing-structure.md` (esta spec **depende de que esa esté `done`**).
- La página `/verificar/[codigo]` (solo se navega hacia ella). No se consulta ningún certificado desde la landing.
- `/sign-in` y `/sign-up` (Clerk, otra spec).
- Plazos de finalización del procedimiento (7/9 días hábiles): el documento de reglas los marca como pendientes de verificar; no se mencionan.

## Hallazgos de la investigación
- Los componentes shadcn `accordion`, `card`, `badge`, `input` se instalan en la preparación de la fase 1 (comando en `landing-structure.md`). El developer debe leer los archivos generados para confirmar las props de `base-nova` (Accordion sobre Base UI: `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent`; verificar si usa `value`/`multiple` en lugar de `type="single"`/`collapsible` de Radix).
- `docs/reglas-negocio-itse.md` NO da ejemplos de giros para riesgo Bajo ni Muy alto. Solo hay: Medio = bodegas, librerías, boticas, minimarkets (hasta 3 pisos y/o 750 m²); Alto = más de 3 pisos y/o más de 750 m². Regla de esta spec: no inventar; Bajo y Muy alto muestran un texto genérico sin giros específicos (ver T1). Pregunta abierta para el humano.
- La matriz citada en el documento es la de función "Comercio".

## Reutilización
- Existente que se reutiliza (de fase 1): `components/shared/Reveal.tsx`, `components/shared/Logo.tsx`, `modules/landing/components/SiteHeader.tsx`, `SiteFooter.tsx`, `HeroCarousel.tsx`, `modules/landing/data/hero-slides.ts`; `components/ui/button.tsx` (`buttonVariants` sobre `Link`); `lib/utils.ts` (`cn`); `lucide-react`; imagen `public/images/landing/que-es-itse.jpg` (o su placeholder).
- Existente que se extiende: `app/page.tsx` (hoy es la plantilla de create-next-app; se reemplaza por la composición de la landing).
- Nuevo (y por qué): `components/shared/SectionHeader.tsx` (título + subtítulo reutilizado por 6 secciones; DRY); resto en `modules/landing/`.
- Dependencias / componentes shadcn a instalar antes de implementar: ninguno adicional (todo lo instala la preparación de `landing-structure.md`: `accordion card badge input`). Sin librerías nuevas.

## Criterios de aceptación
- AC-1: Las 10 secciones aparecen en este orden en `/`: header, hero, Qué es la ITSE, Cómo funciona, Niveles de riesgo, Beneficios, Verificar certificado, Preguntas frecuentes, CTA final, footer. Los `id` de ancla son `que-es-la-itse`, `como-funciona`, `niveles-de-riesgo`, `preguntas-frecuentes`, y los enlaces del header hacen scroll a cada una (sin quedar tapadas por el header fijo).
- AC-2: "Qué es la ITSE" explica en lenguaje simple que es una inspección de seguridad requerida para la licencia de funcionamiento y que el certificado tiene vigencia de 2 años; tiene 4 tarjetas con ícono: seguridad de tu negocio, requisito para la licencia, vigencia de 2 años, prevención de riesgos; muestra la imagen `que-es-itse` (alt en español) o su placeholder.
- AC-3: "Cómo funciona" muestra exactamente 5 pasos numerados con ícono y estos títulos: "Crea tu cuenta", "Registra tu establecimiento y sube tus documentos", "Revisamos tu expediente", "Inspección en tu local", "Descarga tu certificado". Es horizontal desde `lg` y vertical por debajo, con un conector visual entre pasos, usando una lista ordenada semántica (`<ol>`).
- AC-4: "Niveles de riesgo" muestra 4 tarjetas con estos datos exactos del documento de reglas: Bajo, inspección posterior (después de la licencia), 1 inspector; Medio, posterior, 1 inspector, ejemplos: bodegas, librerías, boticas, minimarkets; Alto, previa (antes de la licencia), 2 inspectores; Muy alto, previa, 3 inspectores. Alto menciona "más de 3 pisos y/o más de 750 m²" y Medio "hasta 3 pisos y/o 750 m²". Bajo y Muy alto no inventan giros. La sección incluye la nota: "La clasificación final la confirma la municipalidad." Usa `Badge`; verde no se usa en estas tarjetas.
- AC-5: Existe un test que comprueba que los datos de `risk-levels.ts` coinciden con la tabla de la sección 2 del documento de reglas (tipo e inspectores por nivel).
- AC-6: "Beneficios" lista 5: menos papel (ya no se piden 2 juegos de copias), seguimiento del estado de tu trámite, plazos claros, alertas de renovación (60 días antes del vencimiento), certificado verificable con QR. No promete ningún plazo no existente en el documento.
- AC-7: "Verificar certificado" es un bloque destacado con `Input` (label visible o `aria-label` "Código del certificado") y botón "Verificar". Al enviar con código no vacío navega a `/verificar/<codigo>` (código con `trim` y `encodeURIComponent`). Con código vacío o solo espacios no navega y muestra el mensaje "Ingresa el código de tu certificado." accesible (`role="alert"` o `aria-describedby`). Funciona con Enter.
- AC-8: "Preguntas frecuentes" usa el `Accordion` de shadcn con 6 preguntas: "¿Mi negocio necesita ITSE?", "¿Cuánto dura el certificado?", "¿Qué pasa si me observan algo?", "¿Qué documentos necesito?", "¿Cómo sé mi nivel de riesgo?", "¿Cómo renuevo mi certificado?". Es operable por teclado (Enter/Espacio abre, Tab navega).
- AC-9: Las respuestas del FAQ solo usan hechos de `docs/reglas-negocio-itse.md`: vigencia de 2 años y alerta 60 días antes; observaciones subsanables en ITSE posterior (3 días hábiles, con declaración jurada y fotos) y en ITSE previa (hasta 20 días hábiles, se reanuda la diligencia), y que las relevantes en términos de riesgo llevan a informe desfavorable; documentos de la sección 4 (solicitud/FUT, reporte de nivel de riesgo, declaración jurada de condiciones de seguridad solo en riesgo bajo y medio, plano de ubicación con cuadro de áreas, plano de distribución, plan de seguridad, comprobante de pago); el nivel se declara con preguntas orientativas y lo confirma la municipalidad; renovación de riesgo alto/muy alto: solicitud + pago + declaración jurada de que se mantienen las condiciones (si cambiaron, ITSE nueva). Los textos no afirman requisitos o plazos que no estén en el documento.
- AC-10: CTA final: banda con degradado azul, título "Empieza tu trámite hoy" y botón "Crear cuenta" (acento ámbar) a `/sign-up`.
- AC-11: `app/page.tsx` exporta `metadata` en español (`title` y `description` propios de la landing), compone todas las secciones, y no contiene lógica propia ni `"use client"`. Las secciones envuelven su contenido con `Reveal`.
- AC-12: Server Components por defecto; solo `VerifyCertificateSection` (formulario con estado de error) lleva `"use client"`.
- AC-13: Sin desborde horizontal ni solapamientos en 360px, 768px y 1280px; botones y campos con área táctil cómoda en móvil; contraste legible (texto sobre degradado azul en blanco; texto ámbar nunca sobre fondo blanco, ámbar solo como fondo con texto oscuro).
- AC-14: Sin colores sueltos en las clases (solo tokens de la fase 1), todo el texto visible en español, imágenes con `next/image` y alt descriptivo.
- AC-15: `npm run build`, `npm run lint` y `npx vitest run` pasan.

## Tareas
### T1 — Datos de niveles de riesgo y FAQ
- Archivos: `modules/landing/data/risk-levels.ts` (crear), `modules/landing/data/risk-levels.test.ts` (crear), `modules/landing/data/faq.ts` (crear)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-4, AC-5, AC-8, AC-9
- Detalle: `risk-levels.ts` exporta array tipado (`id`, `label`, `itseType: "POSTERIOR" | "PREVIA"`, `timing` texto, `inspectors: 1|2|3`, `description`, `examples?: string[]`). `faq.ts` exporta array `{ id, question, answer }` con las 6 preguntas de AC-8.
- Tests: `risk-levels.test.ts` — cuatro niveles en orden; Bajo/Medio posterior con 1 inspector; Alto previa con 2; Muy alto previa con 3; solo Medio tiene `examples` y contiene bodegas, librerías, boticas, minimarkets.
- [x] Completada

### T2 — Secciones informativas y encabezado reutilizable
- Archivos: `components/shared/SectionHeader.tsx` (crear), `modules/landing/components/WhatIsItseSection.tsx` (crear), `modules/landing/components/HowItWorksSection.tsx` (crear), `modules/landing/components/BenefitsSection.tsx` (crear)
- Depende de: fase 1 completa (`Reveal`, tokens, imagen `que-es-itse`)
- Grupo paralelo: G1
- Cubre: AC-2, AC-3, AC-6, AC-12, AC-13, AC-14
- Tests: no aplica (componentes presentacionales sin lógica, SETUP.md 3.2)
- [x] Completada

### T3 — Niveles de riesgo y FAQ
- Archivos: `modules/landing/components/RiskLevelsSection.tsx` (crear), `modules/landing/components/FaqSection.tsx` (crear)
- Depende de: T1 (datos), T2 (`SectionHeader`)
- Grupo paralelo: G2
- Cubre: AC-4, AC-8, AC-9, AC-12, AC-13, AC-14
- Tests: no aplica (presentacionales; los datos se prueban en T1)
- [x] Completada

### T4 — Verificar certificado
- Archivos: `modules/landing/utils/build-verify-path.ts` (crear), `modules/landing/utils/build-verify-path.test.ts` (crear), `modules/landing/components/VerifyCertificateSection.tsx` (crear)
- Depende de: fase 1 completa (tokens y `Input` instalado)
- Grupo paralelo: G1
- Cubre: AC-7, AC-12, AC-13, AC-14
- Detalle: `buildVerifyPath(code: string): string | null` devuelve `/verificar/<encodeURIComponent(code.trim())>` o `null` si queda vacío. El componente usa `useRouter().push` de `next/navigation` y no importa lógica adicional.
- Tests: `build-verify-path.test.ts` — código normal; espacios alrededor se recortan; vacío y solo espacios devuelven `null`; caracteres especiales (`/`, `?`, espacio interno) quedan codificados.
- [x] Completada

### T5 — CTA final y armado de la página
- Archivos: `modules/landing/components/CtaSection.tsx` (crear), `app/page.tsx` (modificar)
- Depende de: T2, T3, T4 y fase 1 completa
- Grupo paralelo: G3
- Cubre: AC-1, AC-10, AC-11, AC-13, AC-14, AC-15
- Tests: no aplica (composición; la verificación de build/lint/tests es global)
- [x] Completada

## Fases siguientes
- Spec aparte: página pública `/verificar/[codigo]`.
- Spec aparte: autenticación con Clerk (`/sign-in`, `/sign-up`).
