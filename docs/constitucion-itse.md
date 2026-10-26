# Constitución del proyecto ITSE App

Reglas específicas de este proyecto. **Complementan** a `docs/SETUP.md` y al `CLAUDE.md`; no los reemplazan.

**Orden de prioridad ante un conflicto:**
1. `docs/SETUP.md` → estructura de carpetas, convenciones de nombres, buenas prácticas y metodología.
2. `CLAUDE.md` → stack base del template, comandos, flujo de agentes.
3. Este documento → integraciones nuevas (Clerk, Neon, Drizzle, UploadThing, PDF), seguridad por rol y reglas propias del proyecto.
4. `docs/reglas-negocio-itse.md` → reglas del dominio ITSE (gana en todo lo que sea lógica de negocio).

Si algo de este documento contradice a `docs/SETUP.md`, gana `SETUP.md` y se debe avisar para corregir este archivo.

## 1. Stack adicional al template

El template ya trae Next.js 16, React 19, TypeScript, Tailwind v4, shadcn/ui (`base-nova` sobre Base UI), Zod v4, Vitest y otras librerías (ver `CLAUDE.md`). Se agregan:

| Necesidad | Tecnología | Notas |
|---|---|---|
| Autenticación y roles | **Clerk** (`@clerk/nextjs`) | Instancia de desarrollo en local |
| Base de datos | **Neon** (PostgreSQL serverless) | Branch `dev` para desarrollo |
| ORM | **Drizzle ORM** + `drizzle-kit` | Driver `@neondatabase/serverless` |
| Archivos | **UploadThing** | PDFs e imágenes |
| PDF | **@react-pdf/renderer** | Certificado ITSE y Constancia de Designación |
| QR | **qrcode** | En el certificado, apunta a la verificación pública |
| Fechas | **date-fns** con locale `es` | Zona horaria `America/Lima` |
| Iconos | **lucide-react** | Si no viene ya con shadcn |
| Deploy | **Vercel** | Al final o para demos |

**Instalar cada librería solo cuando una spec aprobada la necesite** (YAGNI).

### 1.1 Notas sobre librerías del template

- **Next.js 16:** antes de usar cualquier API (proxy/middleware, Server Actions, caché, rutas), consultar `node_modules/next/dist/docs/`. Para la protección de rutas con Clerk, revisar cómo se llama hoy el archivo de middleware en esta versión y la guía de Clerk para Next.js 16.
- **Zod v4:** su API difiere de la v3 de muchos tutoriales. Verificar antes de usar.
- **shadcn/ui sobre Base UI:** las props difieren de los ejemplos con Radix. Revisar qué componentes de formulario existen en `base-nova` antes de usarlos. Agregar `react-hook-form` solo si los formularios lo justifican.
- **React Query, Zustand y axios:** están instalados, pero **no usarlos por defecto**. Las lecturas se hacen en Server Components y las mutaciones con Server Actions. Solo usarlos si una spec justifica estado de cliente complejo.
- **`cn`:** usar el helper de `lib/utils.ts`. No instalar `clsx` ni `tailwind-merge`.

## 2. Estructura de carpetas

La estructura la define **`docs/SETUP.md`** (módulos de dominio en `modules/`). Este proyecto tendrá, como mínimo, estos módulos de dominio:

| Módulo | Contenido |
|---|---|
| `usuarios` | sincronización con Clerk, roles, helpers de autorización |
| `establecimientos` | locales del administrado |
| `expedientes` | solicitud, estados, historial, documentos |
| `inspecciones` | inspectores, designación, diligencia, observaciones, subsanación |
| `certificados` | emisión, aprobación, PDF, QR, verificación |
| `reportes` | métricas del dashboard |

Elementos transversales (ubicarlos según `docs/SETUP.md`; si no los define, usar esta propuesta en la raíz):
- `db/schema.ts`, `db/index.ts`, `db/seed.ts` → esquema y cliente de Drizzle
- Reglas de negocio puras del dominio ITSE (`tipoItsePorRiesgo`, `inspectoresRequeridos`, `plazoSubsanacion`, `accionComercializacion`, cálculo de días hábiles, vigencia) → en el módulo que corresponda o en un módulo `itse-core`, siempre como **funciones puras y testeables**, nunca dentro de componentes.

Imports con el alias `@/*` (raíz del repo).

## 3. Convenciones propias

- **Server Components por defecto.** `"use client"` solo cuando haya interactividad.
- **Mutaciones con Server Actions.** API routes solo para webhooks y UploadThing.
- **Toda Server Action:**
  1. Obtiene el usuario actual.
  2. Verifica el rol en servidor.
  3. Valida la entrada con Zod.
  4. Verifica la propiedad del recurso (un cliente solo accede a lo suyo).
  5. Registra en `historial_estados` si cambia el estado del expediente.
  6. Revalida las rutas afectadas.
  7. Devuelve un resultado tipado: `{ ok: true, data } | { ok: false, error }`.
- **Términos del dominio en español** (`expediente`, `establecimiento`, `subsanacion`, `diligencia`), porque son términos legales peruanos. El resto, según `docs/SETUP.md`.
- **Enums** como `pgEnum` en Drizzle, reutilizados en los esquemas Zod.
- TypeScript estricto: sin `any` ni `@ts-ignore`.

## 4. Seguridad

- **La autorización siempre en servidor.** Ocultar un botón no es seguridad.
- El rol vive en `publicMetadata.role` de Clerk y se replica en la tabla `usuarios`. Valor por defecto: `cliente`.
- Solo el `superadmin` puede cambiar roles, aprobar certificados y anular expedientes.
- Rutas `/panel/*`: `admin` o `superadmin`. Rutas `/mi-cuenta/*`: `cliente`. Rutas públicas: landing y `/verificar/[codigo]`.
- Validar tipo y tamaño de archivos: PDF hasta 8 MB, imágenes hasta 4 MB.
- Nunca exponer `DATABASE_URL` ni claves secretas al cliente.

## 5. Sincronización de usuarios en local

Clerk no puede enviar webhooks a `localhost`. Usar **sincronización al primer acceso**: una función `getOrCreateUser()` llamada desde los layouts protegidos, que crea el registro en `usuarios` si no existe.

## 6. Plazos y fechas

- Los estados vencidos se **calculan al leer**, no dependen de un cron.
- Los días hábiles excluyen sábados, domingos y los registros de la tabla `feriados`.
- Formato de fecha `dd/MM/yyyy`, zona horaria `America/Lima`.

## 7. Pruebas

- Vitest + Testing Library, pruebas **colocadas** junto al archivo (`*.test.ts` / `*.test.tsx`), como indica `CLAUDE.md`.
- **Obligatorio** probar las reglas de negocio puras: tipo de ITSE por riesgo, inspectores requeridos, plazo de subsanación, acción de Comercialización, transiciones de estado permitidas, días hábiles con fines de semana y feriados, y vigencia del certificado.

## 8. UI y UX

- **100% responsive**, mobile first. Muchos administrados usarán el celular.
- Interfaz en **español**.
- Estados del expediente con `Badge` de color consistente en toda la app.
- Cada expediente muestra una **línea de tiempo** del historial.
- Mostrar siempre los **días restantes** cuando hay un plazo activo.
- Mensajes de error claros, sin términos técnicos.
- Accesibilidad básica: labels, contraste, navegación por teclado.

## 9. Variables de entorno

`.env.local` (nunca subir a git) y un `.env.example` sin valores reales:

```
DATABASE_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
UPLOADTHING_TOKEN=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 10. Datos y privacidad

- Proyecto académico: **solo datos ficticios** en seeds y demos (DNI, RUC, nombres, direcciones inventados).
- No usar logos ni escudos reales de municipalidades.
- La landing indica que es un proyecto académico.

## 11. Definición de "terminado"

Además de lo que exija el reviewer según `docs/SETUP.md`:
- [ ] Cumple los criterios de aceptación de la spec.
- [ ] `npm run build`, `npm run lint` y las pruebas pasan.
- [ ] Autorización por rol verificada en servidor.
- [ ] Entradas validadas con Zod.
- [ ] Funciona en móvil y escritorio.
- [ ] Cumple `docs/reglas-negocio-itse.md`.
