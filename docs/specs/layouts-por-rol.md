# Layouts por rol (área del cliente y panel de gestión)

Estado: approved

## Objetivo
Dar a cada rol su interfaz base: un área simple y amigable para el cliente (`/mi-cuenta`) y un panel denso tipo dashboard para admin y superadmin (`/panel`), con navegación, header con usuario, páginas de inicio con tarjetas vacías y estados "Próximamente". La navegación se define una sola vez, filtrada por rol. Depende de `docs/specs/auth-roles.md` (debe estar aprobada e implementada: provee `requireRole`, `getOrCreateUser`, `getHomeForRole` y los placeholders de `/mi-cuenta` y `/panel` que esta spec reemplaza).

## Fuera de alcance
- Contenido real de cada sección (establecimientos, solicitudes, expedientes, certificados, perfil, inspectores, reportes, usuarios, configuración): specs posteriores. Aquí solo estado vacío "Próximamente".
- Métricas reales del dashboard (las tarjetas muestran estado vacío, sin consultar BD).
- Modo oscuro, notificaciones, buscador global.
- Persistir el estado colapsado del sidebar (el componente shadcn guarda una cookie, no se lee en servidor).

## Hallazgos (estado actual del repo)
- `components/ui/` tiene `button, card, badge, input, sheet, accordion, carousel`. El registro `base-nova` SÍ incluye `sidebar` (verificado con `npx shadcn@latest view sidebar`): usa `Sheet` en móvil (< 768 px, vía hook `use-mobile`), `collapsible="icon"` en escritorio y depende de `separator`, `skeleton`, `tooltip` y `use-mobile`. No hace falta construir uno propio para el panel.
- `components.json`: aliases `@/components/ui`, `@/hooks`; iconos `lucide`. Los botones de enlace usan `buttonVariants` con `Link` (ver `docs/specs/landing-structure.md`).
- Tokens `brand`/`safety`/`success` ya en `app/globals.css`. `shadcn add sidebar` añadirá variables `--sidebar*` al CSS: se mapean a los tokens de marca (T5).
- Next 16: `params` de páginas es una `Promise` (usar `PageProps<'/ruta/[param]'>` y `await params`); consultar `node_modules/next/dist/docs/01-app/` antes de usar APIs.
- `modules/landing/components/SiteHeader.tsx` usa `UserButton`; se reutiliza el mismo componente de Clerk en los nuevos headers.

## Decisiones de diseño
- **Navegación en un solo lugar:** `modules/navigation/constants/nav-items.ts` define cada ítem (etiqueta, ruta, ícono lucide, roles permitidos, sección). Un util puro `getNavSections(area, rol)` devuelve las secciones visibles; los layouts y el sidebar solo la consumen. La misma config alimenta el chequeo de servidor de las páginas placeholder.
- **Cliente:** barra lateral fija en escritorio (`md+`) y barra inferior fija en móvil, ambas con `ClientNav` (un componente, dos presentaciones por clases responsive). No usa el `Sidebar` de shadcn (el cliente no necesita colapsar ni Sheet; evita peso extra).
- **Panel:** `Sidebar` de shadcn con `collapsible="icon"` (colapsable en escritorio, Sheet en móvil, que el propio componente maneja). El `SidebarTrigger` está en el header.
- **Placeholders con una página dinámica por área:** en lugar de 12 páginas idénticas, `app/mi-cuenta/[section]/page.tsx` y `app/panel/[section]/page.tsx` buscan el ítem en la config por ruta (`notFound()` si no existe) y llaman `requireRole(...item.roles)` en SERVIDOR. Así las páginas de Jefatura exigen `superadmin` por construcción (el admin que escribe la URL es redirigido a `/panel`). Cuando una spec cree la página real (p. ej. `app/panel/usuarios/page.tsx`), Next prioriza la ruta estática; esa página real debe llamar `requireRole("superadmin")` por sí misma.
- **Etiquetas de rol:** `admin` → "Admin", `superadmin` → "Jefe GRDyDC", `cliente` → "Cliente", en `modules/navigation/constants/role-labels.ts`.
- **URLs:** cliente `/mi-cuenta`, `/mi-cuenta/establecimientos`, `/mi-cuenta/nueva-solicitud`, `/mi-cuenta/expedientes`, `/mi-cuenta/certificados`, `/mi-cuenta/perfil`. Panel `/panel`, `/panel/expedientes`, `/panel/inspectores`, `/panel/certificados`, `/panel/reportes`; Jefatura (solo superadmin) `/panel/por-aprobar`, `/panel/usuarios`, `/panel/configuracion`.

## Reutilización
- Existente que se reutiliza: `components/shared/Logo.tsx`; `components/ui/` `button`, `card`, `badge`, `sheet`; `UserButton` de `@clerk/nextjs`; `requireRole`, `getOrCreateUser`, `getHomeForRole` de `modules/usuarios/`; tokens de `app/globals.css`; `lucide-react`; `lib/utils.ts` (`cn`).
- Existente que se extiende: `app/mi-cuenta/layout.tsx`, `app/mi-cuenta/page.tsx`, `app/panel/layout.tsx`, `app/panel/page.tsx` (creados como placeholders en auth-roles; aquí se modifican), `app/globals.css` (tokens `--sidebar*`).
- Nuevo (y por qué): `modules/navigation/` (config y lógica de menú compartida por dos áreas, no pertenece a una sola); `components/shared/PageHeader.tsx` y `components/shared/EmptyState.tsx` (presentación reutilizable entre áreas, ejemplos de SETUP.md 1.1); `modules/client-area/` y `modules/panel/` (shells propios de cada interfaz).
- Dependencias / componentes shadcn a instalar antes de implementar (preparación del orquestador, una sola vez): `npx shadcn@latest add sidebar separator skeleton tooltip` (instala también `hooks/use-mobile.ts`). Responder NO a sobrescribir `button`, `sheet` o `input` existentes. El developer debe leer `components/ui/sidebar.tsx` generado antes de usarlo (props Base UI: `SidebarMenuButton` usa `render={<Link ... />}`, `isActive`, `tooltip`). Sin dependencias npm nuevas.

## Criterios de aceptación
- AC-1: Existe una única definición del menú en `modules/navigation/constants/nav-items.ts` con etiqueta, `href`, ícono lucide, roles permitidos y sección de cada ítem, para las dos áreas. Ningún layout ni componente repite etiquetas ni rutas del menú (grep de "Mis establecimientos" y "Por aprobar" aparece solo en la config).
- AC-2: `getNavSections("cliente", "cliente")` devuelve, en orden, Inicio, Mis establecimientos, Nueva solicitud, Mis expedientes, Mis certificados, Mi perfil. `getNavSections("panel", "admin")` devuelve Dashboard, Expedientes, Inspectores, Certificados, Reportes y ninguna sección de Jefatura. `getNavSections("panel", "superadmin")` devuelve esas cinco más la sección titulada "Jefatura" con Por aprobar, Usuarios y Configuración.
- AC-3: La detección del ítem activo es pura y testeada: `/mi-cuenta` y `/panel` (Inicio/Dashboard) solo activos con coincidencia exacta; el resto activo también en subrutas.
- AC-4 (cliente, escritorio ≥ 768 px): `/mi-cuenta` muestra header con `Logo`, nombre del usuario y `UserButton`; menú lateral con las 6 opciones, la activa con `aria-current="page"`.
- AC-5 (cliente, móvil < 768 px): el menú lateral no se muestra y aparece una barra de navegación inferior fija con las 6 opciones (ícono + etiqueta, objetivos táctiles de al menos 44 px de alto) y `aria-current` en la activa; el contenido no queda tapado por la barra (padding inferior).
- AC-6: `/mi-cuenta` muestra el saludo "Hola, {nombres}" y tarjetas vacías de ejemplo, entre ellas "Aún no tienes expedientes" con un botón "Iniciar mi primera solicitud" que enlaza a `/mi-cuenta/nueva-solicitud`.
- AC-7: Cada ruta del menú del cliente distinta de Inicio carga una página con su título (`PageHeader`) y un estado vacío "Próximamente" (`EmptyState`). Una ruta inexistente bajo `/mi-cuenta/` devuelve 404.
- AC-8 (panel, escritorio): `/panel` usa el `Sidebar` de shadcn colapsable a íconos (con tooltip al colapsar), con el `Logo`; el header tiene `SidebarTrigger`, nombre del usuario, `Badge` con el rol ("Admin" o "Jefe GRDyDC") y `UserButton`.
- AC-9 (panel, móvil < 768 px): el sidebar no ocupa espacio; un botón con `aria-label` accesible abre el menú como `Sheet`; elegir una opción navega y puede cerrarse sin dejar overlay atascado.
- AC-10: El admin ve solo el menú principal; el superadmin ve además la sección separada "Jefatura" con Por aprobar, Usuarios y Configuración.
- AC-11: `/panel` (Dashboard) muestra 4 tarjetas vacías: "Expedientes en revisión", "Plazos por vencer", "Inspecciones programadas", "Certificados por vencer". Las demás rutas del menú del panel cargan título + "Próximamente".
- AC-12 (seguridad, explícito): las páginas de Jefatura verifican `superadmin` en el SERVIDOR con `requireRole("superadmin")` (derivado de los roles del ítem en la config). Un admin que escribe `/panel/por-aprobar`, `/panel/usuarios` o `/panel/configuracion` es redirigido a `/panel` y no ve el contenido; no basta con ocultar el enlace. El superadmin ve y abre todas las opciones.
- AC-13: Un cliente que escribe `/panel` va a `/mi-cuenta` y un admin que escribe `/mi-cuenta` va a `/panel` (comportamiento de auth-roles; se verifica de nuevo con los layouts finales).
- AC-14: Colores y estilo coherentes con la landing: se usan tokens (`brand`, `safety`, `primary`, `--sidebar*` mapeados a los tokens de marca); grep de `#[0-9a-f]{3,6}` y `oklch(` en `modules/navigation/`, `modules/client-area/`, `modules/panel/` y `components/shared/` sin resultados (los valores `oklch` solo en `app/globals.css`).
- AC-15: Ambas interfaces se ven y funcionan sin desborde horizontal a 360, 768 y 1280 px (verificación manual en esos tres anchos, el reviewer deja constancia). Menús navegables por teclado, `aria-label` en la navegación (`nav`), contraste legible.
- AC-16: Todo texto visible está en español. `npm run build`, `npm run lint` y `npx vitest run` pasan.

## Tareas
### T1 — Configuración de navegación y utilidades
- Archivos: `modules/navigation/types/nav.types.ts` (crear), `modules/navigation/constants/nav-items.ts` (crear), `modules/navigation/constants/role-labels.ts` (crear), `modules/navigation/utils/nav-utils.ts` (crear), `modules/navigation/utils/nav-utils.test.ts` (crear)
- Depende de: auth-roles implementada (tipo `Role`)
- Grupo paralelo: G1
- Cubre: AC-1, AC-2, AC-3
- Detalle: `nav.types.ts` define `NavItem` (`label`, `href`, `icon: LucideIcon`, `roles: Role[]`, `section: "main" | "jefatura"`, `area: "cliente" | "panel"`) y `NavSection` (`title?`, `items`). `nav-utils.ts` exporta `getNavSections(area, role)`, `findNavItem(area, href)` e `isActivePath(pathname, href)` (exacta para las raíces `/mi-cuenta` y `/panel`).
- Tests: `nav-utils.test.ts` — los tres escenarios de AC-2 (orden, ausencia de Jefatura para admin, presencia para superadmin), `cliente` no recibe ítems del panel, `findNavItem` desconocido → `undefined`, `isActivePath` exacta en raíces y por prefijo en subrutas (sin falso positivo `/panel-x`).
- [x] Completada

### T2 — Componentes compartidos de presentación
- Archivos: `components/shared/PageHeader.tsx` (crear), `components/shared/EmptyState.tsx` (crear), `modules/navigation/components/UserSummary.tsx` (crear)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-4, AC-7, AC-8, AC-11 (piezas reutilizadas)
- Detalle: `PageHeader({ title, description? })`; `EmptyState({ icon, title, description?, action? })` (si no hay `action`, texto "Próximamente" se pasa como `title` desde el llamador); `UserSummary({ name, roleLabel? })` muestra nombre (oculto bajo `sm` si falta espacio), `Badge` opcional con el rol y `UserButton` de Clerk. Server Components sin lógica.
- Tests: no aplica (presentacionales, SETUP.md 3.2)
- [x] Completada

### T3 — Área del cliente: layout, navegación e inicio
- Archivos: `modules/client-area/components/ClientShell.tsx` (crear), `modules/client-area/components/ClientNav.tsx` (crear), `modules/client-area/components/ClientNav.test.tsx` (crear), `app/mi-cuenta/layout.tsx` (modificar), `app/mi-cuenta/page.tsx` (modificar)
- Depende de: T1, T2
- Grupo paralelo: G2
- Cubre: AC-4, AC-5, AC-6, AC-13, AC-14, AC-15
- Detalle: `layout.tsx` conserva `requireRole("cliente")` y compone `ClientShell` con nombre del usuario. `ClientShell` (Server) arma el header y el `<main>`; `ClientNav` (`"use client"`, `usePathname`) renderiza el menú lateral (`hidden md:flex`) y la barra inferior (`md:hidden`, `fixed bottom-0`) desde `getNavSections("cliente", "cliente")`. `page.tsx` muestra saludo y tarjetas con `Card`, `EmptyState` y `buttonVariants`.
- Tests: `ClientNav.test.tsx` — con `usePathname` mockeado: se renderizan las 6 etiquetas, solo la ruta actual lleva `aria-current="page"`, y `/mi-cuenta/expedientes` no marca Inicio.
- [x] Completada

### T4 — Páginas placeholder protegidas por la config
- Archivos: `app/mi-cuenta/[section]/page.tsx` (crear), `app/panel/[section]/page.tsx` (crear), `app/panel/[section]/page.test.tsx` (crear)
- Depende de: T1, T2
- Grupo paralelo: G2
- Cubre: AC-7, AC-11, AC-12
- Detalle: cada página hace `await params`, `findNavItem(area, \`/<base>/${section}\`)`; si no existe, `notFound()`; luego `await requireRole(...item.roles)` y renderiza `PageHeader` + `EmptyState` "Próximamente". El de `mi-cuenta` usa el área `cliente`; el de `panel` usa el área `panel` (incluye los ítems de Jefatura, con `roles: ["superadmin"]`).
- Tests: `app/panel/[section]/page.test.tsx` — con `requireRole` y `notFound` mockeados: `/panel/usuarios` llama `requireRole("superadmin")`; `/panel/expedientes` llama `requireRole("admin", "superadmin")`; sección desconocida llama `notFound` y no `requireRole`.
- [x] Completada

### T5 — Panel de gestión: layout con sidebar y dashboard
- Archivos: `modules/panel/components/PanelSidebar.tsx` (crear), `modules/panel/components/PanelShell.tsx` (crear), `app/panel/layout.tsx` (modificar), `app/panel/page.tsx` (modificar), `app/globals.css` (modificar: solo mapear `--sidebar*` a los tokens de marca, claro)
- Depende de: T1, T2, preparación del orquestador (`sidebar`)
- Grupo paralelo: G2
- Cubre: AC-8, AC-9, AC-10, AC-11, AC-13, AC-14, AC-15
- Detalle: `layout.tsx` conserva `requireRole("admin", "superadmin")` y pasa nombre y rol a `PanelShell` (`SidebarProvider` + `PanelSidebar` + `SidebarInset` con header: `SidebarTrigger`, `UserSummary` con `ROLE_LABELS`). `PanelSidebar` (`"use client"`, `usePathname`) usa `SidebarGroup` por cada `NavSection` de `getNavSections("panel", rol)`; la sección "Jefatura" lleva `SidebarGroupLabel` y `SidebarSeparator`. `page.tsx`: cuadrícula responsive (1 col móvil, 2 en `md`, 4 en `xl`) de 4 `Card` con `EmptyState`. Densidad: tipografía y espaciados compactos (`text-sm`, `gap-3/4`).
- Tests: no aplica (composición de componentes shadcn con lógica ya testeada en T1; SETUP.md 3.2). El reviewer verifica visualmente AC-8 a AC-10 y AC-15.
- [x] Completada

## Grupos paralelos
G1: T1, T2 (archivos disjuntos). G2: T3, T4, T5 (archivos disjuntos entre sí; `app/mi-cuenta/layout.tsx` y `page.tsx` solo en T3, `app/panel/layout.tsx` y `page.tsx` solo en T5, `[section]` solo en T4).

## Fases siguientes
- Specs de dominio (`establecimientos`, `solicitud-itse`, `bandeja-estados`, etc.) reemplazan los placeholders `[section]` con páginas reales, cada una llamando `requireRole(...)` por sí misma; los ítems del menú ya existen en la config.
- Gestión de usuarios y roles (superadmin) en `/panel/usuarios`.
