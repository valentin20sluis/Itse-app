# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev     # dev server (Turbopack) at http://localhost:3000
npm run build   # production build; also runs the TypeScript check
npm run start   # serve the production build
npm run lint    # eslint (flat config in eslint.config.mjs, extends eslint-config-next)
npm run test    # vitest in watch mode
npx vitest run path/to/file.test.ts   # single test file, one pass
```

Tests use Vitest + Testing Library (`vitest.config.mts`, jsdom, jest-dom matchers from `vitest.setup.ts`), colocated as `*.test.ts(x)`. `npm run build` is the type-check gate.

## Project rules and workflow

`docs/SETUP.md` is the source of truth for folder structure (domain modules under `modules/`, naming conventions), best practices (SOLID, DRY, KISS, YAGNI, check for an existing shadcn/shared/module component, hook or function before creating one) and methodology. Read it before writing code.

Work follows Spec Driven Development with four subagents in `.claude/agents/`:

- `orchestrator`: entry point. Triages each task into build mode (small, unambiguous, ≤3 files) or SDD, dispatches the other agents, runs file-disjoint tasks in parallel, and drives the review loop (max 3 rounds, then escalates). Run it as the main thread with `claude --agent orchestrator`, since subagents cannot spawn subagents.
- `spec`: writes specs to `docs/specs/<feature-slug>.md` (acceptance criteria, tasks with declared files and parallel groups, max 6 tasks per spec).
- `developer`: implements one task, touching only its declared files.
- `reviewer`: read-only; validates against the spec and `docs/SETUP.md`, runs tests/lint/build, returns `APPROVED` or `CHANGES_REQUESTED`.

A spec must be explicitly approved by a human (`Estado: draft` → `approved`) before any development starts. This is blocking: never dispatch `developer` on a draft spec.

## Stack

Next.js 16 (App Router, no `src/` dir) on React 19, TypeScript, Tailwind CSS v4 (configured through `@tailwindcss/postcss` and `app/globals.css`, there is no `tailwind.config`). The `@/*` alias maps to the repo root, so imports look like `@/components/ui/button` and `@/lib/utils`.

Installed libraries that are not yet wired into the app (no `QueryClientProvider`, axios instance, or store exists yet): `axios`, `@tanstack/react-query` v5, `@tanstack/react-table` **v9** (its API differs from the v8 used in most tutorials), `zod` v4, `zustand` v5.

## shadcn/ui

`components.json` uses the `base-nova` style on **Base UI** (`@base-ui/react`), not Radix, so component internals and prop APIs differ from most shadcn examples online. Add components with `npx shadcn@latest add <name>`; they land in `components/ui/`. Class merging uses the `cn` helper re-exported from `lib/utils.ts`; it comes from the official `cn` package (a `clsx` + `tailwind-merge` replacement), so do not add `clsx` or `tailwind-merge`.

## Next.js version caveat

`AGENTS.md` (imported above) says this Next.js has breaking changes versus older versions. The bundled docs live in `node_modules/next/dist/docs/` (`01-app` for App Router); consult them before using an API from memory. `next dev` regenerates the `AGENTS.md` block, so leave it in place.

---

## Proyecto: ITSE App

### Qué es

Sistema web para gestionar el trámite de **Inspección Técnica de Seguridad en Edificaciones (ITSE)** de la oficina de **Gestión del Riesgo de Desastres y Defensa Civil (GRDyDC)** de una municipalidad distrital del Perú.

Hoy el trámite es manual (expedientes en papel por duplicado, derivaciones físicas entre áreas). El sistema lo digitaliza: el administrado presenta su solicitud en línea, sigue su expediente, subsana observaciones y descarga su certificado; la oficina gestiona el flujo con plazos legales controlados.

**Proyecto académico** (trabajo final de Programación Web Fullstack con IA). No es un sistema oficial. Usar siempre datos ficticios.

### Documentos del proyecto (leer antes de escribir una spec o código)

- `docs/constitucion-itse.md` → integraciones (Clerk, Neon, Drizzle, UploadThing, PDF), seguridad por rol y convenciones propias. Complementa a `docs/SETUP.md`, que tiene prioridad en estructura y convenciones.
- `docs/reglas-negocio-itse.md` → reglas del dominio según el DS 002-2018-PCM y el Manual de Ejecución de ITSE del CENEPRED. **Toda lógica de negocio debe respetarlo**, y el `reviewer` debe validarlo.

### Roles

| Rol | Usuario real | Resumen |
|---|---|---|
| `cliente` | Administrado (dueño o representante del establecimiento) | Registra establecimientos, crea solicitudes, sube documentos, subsana, descarga certificado |
| `admin` | 2 trabajadores de GRDyDC | Gestiona la bandeja de expedientes, designa inspectores, registra diligencias y observaciones |
| `superadmin` | Jefe de GRDyDC | Todo lo del admin, más aprobar certificados, gestionar usuarios, catálogos y reportes |

Las áreas externas (Servicios Públicos, Logística, Comercialización) **no son usuarios**: se representan como estados del expediente. Los **inspectores tampoco son usuarios** en el MVP: son registros gestionados por el admin.

### Orden sugerido de specs (`docs/specs/<slug>.md`)

Cada spec tiene máximo 6 tareas; si una funcionalidad no entra, el agente `spec` la divide en dos.

1. `auth-roles` — Clerk, sincronización de usuarios, protección por rol, tabla `usuarios`
2. `establecimientos` — CRUD de establecimientos del cliente
3. `solicitud-itse` — wizard de solicitud y subida de documentos
4. `bandeja-estados` — bandeja del admin, máquina de estados, historial
5. `inspeccion` — inspectores, designación, constancia PDF, diligencia
6. `subsanacion-plazos` — observaciones, catálogo, días hábiles
7. `certificados` — aprobación del superadmin, PDF con QR, vigencia
8. `dashboard-reportes` — métricas y certificados por vencer
9. `verificacion-publica` — página pública para validar certificados
10. `landing` — landing del trámite

MVP mínimo: specs 1 a 5 y 7.
