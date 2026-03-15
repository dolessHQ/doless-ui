# AGENTS.md

This repository is the centralized custom shadcn registry for the organization.

## Purpose

- Treat this repo as an independent registry, not as a mirror of any single app.
- Existing overlapping components in `~/consulting/animo/animo-web` are reference material for upgrades, not canonical source-of-truth.
- Prefer the strictly better generic implementation when reconciling differences between this repo and Animo.

## Source Of Truth

- Authored registry metadata lives in `registry.json`.
- Authored installable source lives primarily under `registry/new-york/**`.
- Shared generic installable helpers may also live outside `registry/` when explicitly listed in `registry.json`. The current example is `lib/date-utils.ts`.
- Generated registry payloads live under `public/r/**` and must not be hand-edited.

## Registry Rules

- Keep custom registry code generic. Do not import business logic, domain types, app routes, or repo-specific helpers from another product repo.
- If multiple custom components need a shared helper, make it generic and include it explicitly in each affected registry item's `files` list so consumers receive it on install.
- Use `registryDependencies` for shadcn registry items and `dependencies`/`devDependencies` for npm packages.
- Keep registry item file manifests accurate. If a component imports an installable helper, that helper must appear in the item's `files` array.
- Preserve component names and install URLs unless a deliberate breaking rename is required.

## Imports

- Within this repo's authored registry source, keep registry-authored UI imports consistent with the existing registry structure.
- Shared generic helpers that should install into consumer apps can use standard `@/lib/*` imports, but only if the helper file is included in the registry item manifest.
- Do not import from Animo or any other application repo.

## Workflow

- After changing `registry.json`, `registry/new-york/**`, or shared installable helper files, run `npm run registry:build`.
- After registry changes, run `npm run build`.
- Verify the generated files in `public/r/registry.json` and the item JSON files match the authored source.
- When feasible, smoke-test a generated item from `/r/<item>.json` in a scratch consumer app.

## Custom Component Guidance

- The current custom surface area is:
  - `registry/new-york/doless/DatePicker.tsx`
  - `registry/new-york/doless/DateRangePicker.tsx`
  - `registry/new-york/doless/MultiDatePicker.tsx`
  - `registry/new-york/doless/ColorPickerPopover.tsx`
- For date components, `lib/date-utils.ts` is the shared generic formatting helper. Keep it domain-agnostic.
- Breaking internal rewrites are acceptable when improving these components, but avoid gratuitous API churn once downstream consumers exist.
