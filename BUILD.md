# ESENV build and verification

## Requirements

- Node.js 20 or newer.
- Install ESENV's pinned TypeScript development dependency with `npm install` when setting up a fresh checkout.
- The sibling `../extendscript-toolchain` checkout and its dependencies for emitted JSX builds and ESTC checks.
- For live checks only: COMTool V2 and an already-running Illustrator instance. ESENV does not launch Illustrator.

## Static workflow

Run from the `esenv/` directory:

```powershell
npm test
npm run typecheck
npm run build:jsx
npm run estc:check
npm run benchmark:node
```

- `npm test` builds the Node-compatible TypeScript core and runs the Node test suite.
- `npm run typecheck` runs TypeScript without emitting files.
- `npm run build:jsx` invokes ESTC with `extendscript.estc.config.mjs`. The config enables Illustrator/2022 host typings, source linting, type checking, normalization, and ESTC's bundle-local esbuild compatibility transform. It disables compatibility shims, missing-builtin allowances, and global-patch allowances.
- `npm run estc:check` builds `dist/ESENV.jsx` and checks the exact emitted file as a bannerless ExtendScript bundle.
- `npm run benchmark:node` performs warmed repeated Node/V8 measurements for refreshed snapshots, cached primitive reads, detached snapshots, and explicit capability probes. Its output is not an Adobe engine benchmark.
- `npm run verify` composes the Node tests and the static ESTC check. `npm run ci:static` is the portable static gate.

Generated output is confined to ignored `build/` and `dist/` directories. The production ExtendScript artifact is `dist/ESENV.jsx`; the Node test build is under `build/node/`.

## Live Illustrator workflow

With Illustrator already running and available through COMTool V2:

```powershell
npm run estc:live
npm run live-verify
npm run benchmark:live
npm run verify:engine
npm run ci:local
```

`estc:live` asks ESTC to compile-parse the final JSX through the configured live backend; it does not execute project behavior. `live-verify` executes the behavioral vectors through COMTool V2, including a bundle reload between the two persistence-probe facades. `benchmark:live` measures the ExtendScript lanes separately. `verify:engine` and `ci:local` compose the live checks with the relevant static gates.

Live commands use `launch: false`. If no active COMTool/Illustrator runtime is available, report the live lane as pending/unavailable; do not substitute Node results or an ESTC static pass for live evidence. The live verifier owns a COMTool V2 session lease and removes only its ESENV test key and exact ESENV persistence-token value during cleanup.

## Build compatibility boundary

ESTC is the canonical TypeScript-to-ExtendScript pipeline. Preserve the sequence of source compatibility/type checks, ES5 bundling, bundle-local helper compatibility, ExtendScript-safe normalization, and static ES3 validation. Live compile-only parsing and project-specific live behavior are separate gates. Do not add project-local global shims or native/ESABI code without a measured requirement and the corresponding separate rollout.

See the shared [`extendscript-toolchain` guidance](../agent-skills/extendscript-toolchain/SKILL.md) and [ESTC README](../extendscript-toolchain/README.md) for the full compatibility contract.
