# Landing: estructura (fase 1 de 2)

Estado: approved

## Objetivo
Dejar lista la base visual y estructural de la landing pública de SIGITSE (ruta `/`): tokens de marca, tipografía, metadata, logo, header fijo con menú móvil, footer, animación al scroll, imágenes con créditos y el carrusel del hero. Las secciones de contenido y el armado de `app/page.tsx` están en `docs/specs/landing-sections.md` (fase 2, depende de esta).

## Fuera de alcance
- Secciones 3 a 9 (Qué es la ITSE, Cómo funciona, Niveles de riesgo, Beneficios, Verificar, FAQ, CTA) y el armado de `app/page.tsx`: fase 2.
- Instalar Clerk. Los botones solo enlazan a `/sign-in` y `/sign-up` (esas páginas no existen aún; 404 es esperado hasta su spec).
- La página `/verificar/[codigo]`.
- Modo oscuro de la landing (los tokens `.dark` existentes no se tocan).
- Modificar `components/ui/*` generado por shadcn.

## Hallazgos de la investigación (estado actual del repo)
- `components/ui/` solo tiene `button.tsx` (Base UI `@base-ui/react/button`, importa `cn` desde el paquete `cn`). Variantes: default, outline, secondary, ghost, destructive, link; tamaños: default (h-8), xs, sm, lg (h-9), icon, icon-xs, icon-sm, icon-lg. No hay variante "acento". Para enlaces usar `<Link className={buttonVariants({...})}>` (Server Component, sin `render`).
- No existen `Sheet`, `Carousel`, `Accordion`, `Card`, `Badge`, `Input`. Todos existen en el catálogo shadcn. El de `carousel` depende de `embla-carousel-react`. Al instalarlos con el estilo `base-nova`, el developer debe leer el archivo generado para confirmar las props reales (Sheet sobre Base UI Dialog: `SheetTrigger`, `SheetContent side=...`, `SheetClose`; Carousel: `Carousel`, `CarouselContent`, `CarouselItem`, `CarouselPrevious`, `CarouselNext`, prop `setApi`, `opts`, `plugins`).
- `lucide-react` ya está instalado (ShieldCheck disponible).
- Bug existente en `app/globals.css`: `--font-sans: var(--font-sans);` es una referencia circular, por lo que Geist nunca se aplica. Se corrige en T1.
- `app/layout.tsx` tiene `lang="en"` y metadata de plantilla. Se corrige en T1.
- `app/globals.css` define el primario en gris (oklch sin croma). Se reemplaza por azul de marca en T1.

## Reutilización
- Existente que se reutiliza: `components/ui/button.tsx` (`Button`, `buttonVariants`) para todos los botones; `lib/utils.ts` (`cn`); `lucide-react`; `next/font` (Geist ya cargado en `app/layout.tsx`).
- Existente que se extiende: `app/globals.css` (tokens de marca, scroll suave, `scroll-margin`), `app/layout.tsx` (`lang`, metadata base).
- Nuevo (y por qué): `components/shared/Logo.tsx` (se usará también en el panel; no existe); `components/shared/Reveal.tsx` (animación de entrada reutilizable; no existe); resto en `modules/landing/` (dominio propio de la landing).
- Dependencias nuevas: `embla-carousel-react` (la trae `shadcn add carousel`, no hay carrusel táctil/teclado sin librería en Base UI) y `embla-carousel-autoplay` (autoplay con pausa al pasar el mouse en una opción nativa del plugin: `stopOnMouseEnter`; evita escribir temporizadores propios). No se agrega ninguna otra.
- Preparación del orquestador antes de implementar (comandos, los ejecuta una sola vez para no pisar `package.json`/lockfile):
  - `npx shadcn@latest add sheet carousel accordion card badge input`
  - `npm install embla-carousel-autoplay`
  - (accordion, card, badge e input se usan en la fase 2; se instalan juntos para tocar `package.json` y `components/ui/` una sola vez.)

## Criterios de aceptación
- AC-1: `app/globals.css` define con `@theme` los tokens `--color-brand` (azul profundo), `--color-brand-foreground`, `--color-safety` (ámbar), `--color-safety-foreground`, `--color-success` (verde); `--primary` apunta al azul de marca. Ninguna clase de la landing usa colores hex/oklch sueltos (grep de `#[0-9a-f]{3,6}` y `oklch(` en `modules/landing/` y `components/shared/` no arroja resultados).
- AC-2: La fuente aplicada es Geist Sans vía `next/font` (`--font-sans` resuelve a `--font-geist-sans`); `<html lang="es">`; `metadata` base en español.
- AC-3: `html` tiene scroll suave solo bajo `prefers-reduced-motion: no-preference`, y toda `section[id]` tiene `scroll-margin-top` suficiente para no quedar tapada por el header fijo.
- AC-4: `Logo` muestra el ícono `ShieldCheck`, el texto "SIGITSE" en negrita y el subtítulo pequeño "Sistema de Gestión de ITSE"; acepta `className` y se renderiza sin lógica de landing.
- AC-5: El header es fijo (`sticky`/`fixed` arriba), muestra logo a la izquierda, las 4 anclas (`#que-es-la-itse`, `#como-funciona`, `#niveles-de-riesgo`, `#preguntas-frecuentes`) y a la derecha "Iniciar sesión" (outline/secundario, `href="/sign-in"`) y "Crear cuenta" (acento ámbar, `href="/sign-up"`).
- AC-6: Bajo `md` (768px) el nav de escritorio se oculta y aparece un botón hamburguesa con `aria-label="Abrir menú"` que abre un `Sheet`; el Sheet contiene las 4 anclas y los 2 botones, y se cierra al elegir una ancla.
- AC-7: El footer muestra `Logo`, enlaces (las mismas anclas), datos de contacto ficticios de la oficina de GRDyDC (dirección, teléfono, correo, horario inventados, claramente ficticios) y el aviso visible exacto: "Proyecto académico. No es un sistema oficial de ninguna municipalidad." Sin logos ni escudos reales.
- AC-8: `Reveal` aplica fade/slide al entrar en viewport solo cuando `prefers-reduced-motion` no es "reduce"; con "reduce" el contenido se ve de inmediato y sin transición. El contenido nunca queda oculto si JS falla en hidratar más allá del estado inicial razonable (se documenta el comportamiento).
- AC-9: Existen `public/images/landing/hero-1.jpg`, `hero-2.jpg`, `hero-3.jpg` (ancho máx 1920px, ideal < 300 KB) y `que-es-itse.jpg` (ancho máx 800px, ideal < 300 KB), cada una verificada visualmente contra su tema, proveniente solo de Unsplash, Pexels o Pixabay, sin marcas ni logos reconocibles. URLs reales verificadas (HTTP 200) antes de descargar; no inventadas.
- AC-10: Si alguna imagen no se pudo descargar desde terminal, el archivo no se crea, y `docs/creditos-imagenes.md` lista en una sección "Pendientes de descarga manual" el enlace elegido y el nombre de archivo destino. Esas imágenes se renderizan como placeholder (degradado con ícono grande).
- AC-11: `docs/creditos-imagenes.md` contiene una tabla con columnas: archivo, descripción, fuente, autor, enlace original; una fila por imagen.
- AC-12: El carrusel del hero tiene 3 slides con estos títulos exactos: "Tramita tu Certificado ITSE sin hacer colas", "Sigue tu expediente en tiempo real", "Recibe alertas antes de que venza tu certificado". Cada slide tiene título, texto breve, imagen (`next/image`, alt descriptivo en español; la primera con `priority`), botón "Crear cuenta" (`/sign-up`) y botón "Cómo funciona" (`#como-funciona`).
- AC-13: El carrusel avanza solo con autoplay suave, se pausa al pasar el mouse, tiene flechas con `aria-label` "Diapositiva anterior" y "Diapositiva siguiente", e indicadores clicables con `aria-label` "Ir a la diapositiva N" y estado `aria-current` en el activo. Se opera con mouse, gesto táctil (arrastre) y teclado (flechas izquierda/derecha con el carrusel enfocado). Con `prefers-reduced-motion: reduce` no hay autoplay.
- AC-14: Hero legible y sin desborde horizontal en 360px, 768px y 1280px; degradado sutil azul de fondo.
- AC-15: Solo `Reveal`, `MobileNav` y `HeroCarousel` llevan `"use client"`; `Logo`, `SiteHeader`, `SiteFooter` son Server Components (si `SiteHeader` importa `MobileNav`, lo compone sin ser cliente).
- AC-16: `npm run build`, `npm run lint` y `npx vitest run` pasan.

## Tareas
### T1 — Tokens de marca, fuente, metadata y scroll
- Archivos: `app/globals.css` (modificar), `app/layout.tsx` (modificar)
- Depende de: ninguna (requiere la preparación del orquestador solo para T2 y T5)
- Grupo paralelo: G1
- Cubre: AC-1, AC-2, AC-3
- Tests: no aplica (configuración de estilos/metadata; verificado con build y lectura, SETUP.md 3.2)
- [x] Completada

### T2 — Logo, header con menú móvil y footer
- Archivos: `components/shared/Logo.tsx` (crear), `modules/landing/constants/nav-links.ts` (crear), `modules/landing/components/SiteHeader.tsx` (crear), `modules/landing/components/MobileNav.tsx` (crear), `modules/landing/components/SiteFooter.tsx` (crear)
- Depende de: T1 (tokens), preparación del orquestador (`sheet`)
- Grupo paralelo: G2
- Cubre: AC-4, AC-5, AC-6, AC-7, AC-15
- Tests: `modules/landing/components/MobileNav.test.tsx` — componente con estado (abre/cierra): el botón con aria-label "Abrir menú" abre el Sheet, aparecen las 4 anclas y los botones a `/sign-in` y `/sign-up`, y al hacer clic en una ancla el Sheet se cierra. (Archivo adicional de test, co-localizado; permitido como parte de T2.)
- [x] Completada

### T3 — Componente de animación al scroll
- Archivos: `components/shared/Reveal.tsx` (crear), `components/shared/Reveal.test.tsx` (crear)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-8, AC-15
- Tests: `components/shared/Reveal.test.tsx` — con `matchMedia` mockeado a reduce, el contenido aparece sin clase de estado oculto; con no-reduce y `IntersectionObserver` mockeado, el estado pasa de oculto a visible al intersectar; el observer se desconecta al desmontar.
- [x] Completada

### T4 — Imágenes con créditos
- Archivos: `public/images/landing/hero-1.jpg` (crear), `public/images/landing/hero-2.jpg` (crear), `public/images/landing/hero-3.jpg` (crear), `public/images/landing/que-es-itse.jpg` (crear), `docs/creditos-imagenes.md` (crear)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-9, AC-10, AC-11
- Detalle de temas sugeridos (orientativo, el developer elige por búsqueda real): hero-1 emprendedor/a atendiendo su bodega o librería; hero-2 persona usando laptop o celular para un trámite; hero-3 inspector de seguridad con tablilla/casco o señalización de salida/extintor; que-es-itse extintor y señalización de zona segura, o tablero eléctrico. Optimizar a jpg/webp con ancho máx indicado. Si no hay herramienta de redimensionado en terminal y el archivo supera 300 KB, registrarlo en el créditos como observación, no bloquear.
- Tests: no aplica (assets y documentación)
- [x] Completada (imágenes pendientes de descarga manual, ver docs/creditos-imagenes.md)

### T5 — Hero con carrusel
- Archivos: `modules/landing/data/hero-slides.ts` (crear), `modules/landing/components/HeroCarousel.tsx` (crear), `modules/landing/components/HeroCarousel.test.tsx` (crear)
- Depende de: T1 (tokens), T4 (para saber qué imágenes existen y cuáles usan placeholder), preparación del orquestador (`carousel`, `embla-carousel-autoplay`)
- Grupo paralelo: G2
- Cubre: AC-12, AC-13, AC-14, AC-15
- Detalle: `HeroCarousel` envuelve el `Carousel` de shadcn con `Autoplay({ delay, stopOnMouseEnter: true, stopOnInteraction: false })`; no se agrega autoplay si `matchMedia('(prefers-reduced-motion: reduce)')` coincide. Indicadores con `setApi` + `scrollTo`. Las slides vienen de `hero-slides.ts` (`id`, `title`, `text`, `image: { src, alt } | null`); `null` renderiza el placeholder degradado con ícono lucide grande.
- Tests: `HeroCarousel.test.tsx` — con `matchMedia`, `ResizeObserver` e `IntersectionObserver` mockeados: se renderizan los 3 títulos exactos, cada slide tiene enlaces a `/sign-up` y `#como-funciona`, existen botones con los aria-label de AC-13, y hay 3 indicadores.
- [x] Completada (slides con image: null, ver hero-slides.ts)

## Fases siguientes
- Fase 2: `docs/specs/landing-sections.md` (secciones 3 a 9 y armado de `app/page.tsx`).
