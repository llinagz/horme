# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es Hormé

PWA privada, 100 % en el navegador (sin cuenta, sin API, sin Server Actions, sin variables de entorno), para registrar entrenamientos de **fuerza por libre** en el box (Openbox), medidas corporales y progreso. El CrossFit ya se registra en la app oficial del gimnasio, así que las decisiones de producto priorizan fuerza (mancuernas, kettlebell, barra, trineo, polea) sobre WOD/gimnasia/monoestructural. Los WOD y ejercicios de CrossFit se mantienen, con menos protagonismo. La interfaz y los textos están en español. El README aún habla de «CrossFit»; la orientación vigente es la de fuerza.

Los ejercicios se clasifican por **grupo muscular principal** (más secundarios opcionales) y **material**. El tren inferior se separa en Cuádriceps, Isquios, Glúteos y Gemelos. El usuario debe poder crear y clasificar un ejercicio al momento, incluso desde el buscador de la sesión.

## Comandos

Requiere Node ≥ 24. Ejecutar `npm ci` antes de formatear o comprobar tipos (`npx prettier` sin dependencias descarga otra versión y reformatea código ajeno).

```bash
npm run dev              # next dev --webpack (Webpack es obligatorio por Serwist)
npm run check            # format:check + lint + typecheck + test + build (lo que exige CI)
npm run test             # vitest run (proyectos "unit" y "components")
npx vitest run src/domain/calculations.test.ts        # un fichero
npx vitest run -t "nombre del test"                   # un test por nombre
npx vitest run --project components                   # solo tests .tsx (happy-dom)
npm run test:coverage    # cobertura solo de domain/application/infrastructure
npm run test:e2e         # Playwright (hace build + serve out/ en :3000; proyectos mobile-chrome y desktop-chrome)
npx playwright test e2e/horme.spec.ts --project=desktop-chrome
npm run build            # tsc --noEmit && next build → exportación estática en out/
```

Notas:
- `lint` precarga `scripts/use-typescript6.cjs`: el compilador es TypeScript 7 (sin API programática) y ESLint usa `@typescript/typescript6` como sustituto. No lo quites. `--max-warnings=0`.
- `next.config.ts` tiene `ignoreBuildErrors: true`; los tipos se comprueban con `tsc` en `npm run build`/`typecheck`, no con Next.
- `npm run format:check` falla en ficheros de la raíz y `e2e` por CRLF (Windows, `core.autocrlf=true`), no por estilo. Para comprobar de verdad: `npx prettier --check src`. `git diff` es la fuente fiable de cambios.
- Los E2E de accesibilidad (`e2e/ergonomics.spec.ts`) superan los 30 s con varios workers: usar `--workers=1 --timeout=120000`.
- Git Bash a veces falla al arrancar (`fatal error - add_item ... failed`); repetir con PowerShell.
- `vitest -u` sobre `src/infrastructure/__snapshots__/exercise-catalog.test.ts.snap` solo tras verificar que ningún ID `built-in-NNN` se ha desplazado.

## Arquitectura

Next.js 16 (App Router) con `output: "export"` y `trailingSlash`: todo es estático y cliente. Alias `@/*` → `src/*`. TypeScript estricto con `noUncheckedIndexedAccess` y `exactOptionalPropertyTypes`.

Capas (dependencia de arriba abajo; `domain` no importa de las demás):

- `src/domain/` — entidades (`entities.ts`), esquemas Zod (`schemas.ts`), cálculos, validación, formato, fechas, etiquetas. Puro y sin I/O.
- `src/infrastructure/` — Dexie/IndexedDB.
  - `database.ts`: clase `HormeDatabase` con **versiones de esquema incrementales** (`this.version(n)`; la v5 añade `muscleGroup`/`equipment` y migra con `applyCatalogMetadata`). Un cambio de esquema = nueva versión + `upgrade`, nunca editar una anterior. `initializeDatabase()` abre la base una vez y siembra el catálogo integrado (`seedBuiltInExercises`, solo añade los que faltan).
  - `exercise-catalog.ts`: catálogo integrado con IDs estables `built-in-NNN`; hay snapshot. No reordenar ni renumerar.
  - `repositories/`: un repositorio por agregado. `training-session-repository.ts` solo compone las operaciones de `training-session/{sessions,blocks,movements,sets,history}.ts`.
  - `backup.ts`: exportación/importación JSON versionada (`format: "horme-backup"`, `schemaVersion` 1|2) validada con Zod estricto; importar debe seguir aceptando versiones antiguas.
- `src/application/` — casos de uso que orquestan repositorios (p. ej. `addExerciseToBlock` copia las series de la última vez; `progress.ts`; `complete-onboarding.ts`).
- `src/components/` + `src/features/<área>/` — UI. `src/app/*/page.tsx` son envoltorios finos (`AppShell` + `Suspense` + pantalla de `features/`). `DatabaseProvider` bloquea el render hasta que la base está abierta; los datos se leen con `useLiveQuery` (`data-hooks.ts`) para que la UI reaccione a IndexedDB. Estilos con CSS Modules y tokens en `src/styles/tokens.css` (diseño «Mármol y olivo»); componentes base en `components/ui/`.
- PWA: `src/app/sw.ts` (Serwist) → `public/sw.js` generado. `next.config.ts` precachea las rutas listadas en `appRoutes` con un `revision` aleatorio por build; **una ruta nueva debe añadirse a `appRoutes`** para funcionar sin conexión.

## Tests

- `src/**/*.test.ts` corren en Node con `fake-indexeddb`; `*.test.tsx` en happy-dom. `src/test/setup.ts` y `src/test/database-helpers.ts` (`clearDatabase`, `addTestExercise`) preparan la base; hay tests de propiedades con `fast-check`.
- E2E en `e2e/` (incluye axe para accesibilidad y `pwa.spec.ts`).
- CI (`.github/workflows/ci.yml`): `npm run check`, cobertura y E2E en Chromium.
