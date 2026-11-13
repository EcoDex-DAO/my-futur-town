# Repository Guidelines

## Token-efficient agent workflow

- All coding agents use the installed `caveman` skill for concise user-facing responses. Preserve technical facts and keep this mode active until the user disables it.
- Use `rtk` for supported command-line operations. Use the direct command when RTK has no suitable wrapper; never bypass RTK only to avoid its output limits.
- For structural codebase questions, query Codebase Memory and the existing Graphify graph before broad file searches. Use Graphify's code-only mode when semantic document extraction is unnecessary.

<!-- codebase-memory-mcp:start -->
For structural codebase exploration, use the installed `codebase-memory` skill.
<!-- codebase-memory-mcp:end -->

@/home/lammeur-mint/.codex/RTK.md

## Project Structure & Module Organization

- `src/` contains the React/TypeScript interface, MapLibre helpers (`map.ts`), styles, and colocated tests. `src/app/` contains the Next.js App Router layout, page, and API route handlers for `GET /health` and `GET /api/layers`. The map must remain usable without the API.
- `src/server/` contains server-side helpers and API route tests. Next.js generates production assets in `.next/`.
- `supabase/migrations/` contains versioned SQL migrations. `scripts/` contains Compose smoke checks and disposable PostGIS validation.
- `docs/` covers architecture, data licensing, operations, and validation. `.github/workflows/ci.yml` defines CI checks.

## Build, Test, and Development Commands

Use Node.js >=22.12, the pnpm version specified in `package.json`, Python 3.12, and Docker Compose v2 where needed. Enable Corepack with `corepack enable` to use the project’s pnpm version.

From the repository root:

- `pnpm install --frozen-lockfile`: install dependencies from `pnpm-lock.yaml`.
- `pnpm run dev`: start Next.js on port 5173.
- `pnpm test`: run Vitest once, including API route tests.
- `pnpm run build`: check TypeScript and build production assets.
- `pnpm run start`: serve the production build on port 5173.

From the repository root:

- `docker compose up --build -d --wait`, then `python3 scripts/smoke.py`: validate the application and API routes.
- `docker compose down`: stop services.
- `sh scripts/test-database.sh`: validate migrations and access policies in disposable PostGIS.

## Coding Style & Naming Conventions

Follow existing formatting: TypeScript uses two-space indentation, double quotes, and semicolons; Python uses four-space indentation. Use PascalCase for React components, camelCase for TypeScript functions, and snake_case for Python functions. Keep TypeScript strict checks passing. No dedicated formatter or linter is configured.

## Testing Guidelines

Use colocated `*.test.ts` files for Vitest, including tests for API route handlers. Cover changed behavior and relevant failure cases. No numeric coverage threshold is configured. For map UI changes, check desktop/mobile rendering, selection, layer controls, and operation without the API.

## Commit & Pull Request Guidelines

Branch from `main`. History is limited; follow the existing descriptive `feat: ...` style where applicable. PRs should describe changes, checks performed, and limitations; link related issues and include screenshots for visual changes. Preserve data attribution and licenses.

## Security & Configuration

Use `.env.example` as the configuration reference. Never commit secrets: all `NEXT_PUBLIC_*` values are public and embedded at build time. `CORS_ORIGINS` is server-side and read at runtime. Validate migrations locally and obtain authorized review before applying them remotely. Preserve TLS verification and scenario ownership policies.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
