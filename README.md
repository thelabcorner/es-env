<div align="center">

# ESENV: Environment and capability detection for Adobe ExtendScript (ES3)

## ExtendScript Environment = E.S.ENV

### Cached host facts, explicit capability probes, evidence provenance, and persistence detection for Adobe Illustrator and other ExtendScript hosts

[![API: capability surface](https://img.shields.io/badge/capabilities-6%20declared-success)](#api)
[![Tests: Node](https://img.shields.io/badge/tests-11%2F11-purple)](#validation)
[![Engine parity: live](https://img.shields.io/badge/engine%20parity-Illustrator%2030.6%20%2F%20ES%204.5.6-green)](#validation)
[![Adobe: Creative Suite](https://img.shields.io/badge/Adobe%20-Creative%20Suite-red?logo=adobe&logoColor=white)](https://extendscript.docsforadobe.dev/)
[![Engine](https://img.shields.io/badge/ExtendScript-ES3-green)](#compatibility)
[![Runtime size](https://img.shields.io/badge/runtime-12.5%20KiB-orange)](#installation)
[![License: GPL-3.0-or-later](https://img.shields.io/badge/license-GPL%203.0--or--later-blue)](https://www.gnu.org/licenses/gpl-3.0.html)

</div>

---

## Part Of The Same Toolkit

> Production-grade infrastructure for Adobe ExtendScript.

<table>
<tr>
<td width="50%" valign="top">

### Runtime Primitives

**[ESON](https://github.com/thelabcorner/eson)**  
Strict RFC 8259 JSON for ExtendScript.

**[ESB64](https://github.com/thelabcorner/es-b64)**  
Base64 and UTF-8 utilities.

**[ESARR](https://github.com/thelabcorner/es-arr)**  
ES5+ Array compatibility methods.

**[ESSTR](https://github.com/thelabcorner/es-str)**  
String whitespace and trim methods.

**[ESCHARS](https://github.com/thelabcorner/es-chars)**  
Native bulk byte operations.

**[ESHTTP](https://github.com/thelabcorner/es-http)**  
HTTP transport for ExtendScript automation.

**[ESTIMER](https://github.com/thelabcorner/es-timer)**  
Microsecond timing for ExtendScript automation.

**[ESRAND](https://github.com/thelabcorner/es-rand)**  
Deterministic random streams and sampling for ExtendScript.

**[ESUUID](https://github.com/thelabcorner/es-uuid)**  
RFC 9562 UUID generation, parsing, and conversion for ExtendScript.

**[ESENV](https://github.com/thelabcorner/es-env)**  
Environment and capability detection for ExtendScript.

**[ESPATH](https://github.com/thelabcorner/es-path)**  
Deterministic Windows/POSIX path and RFC 8089 file-URI transformations.

**[ESFS](https://github.com/thelabcorner/es-fs)**  
Synchronous ExtendScript File/Folder I/O with explicit text, BINARY, and replacement semantics.

**[ESHASH](https://github.com/thelabcorner/es-hash)**  
CRC-32/ISO-HDLC and SHA-256 for byte strings and UTF-8 text.

**[ESLOG](https://github.com/thelabcorner/es-log)**  
Structured logging with bounded text and JSONL sinks.

</td>
<td width="50%" valign="top">

### Build & Integration Tools

**[ESPACK](https://github.com/thelabcorner/espack)**  
Self-extracting ExternalObject bundles.

**[ESMIN](https://github.com/thelabcorner/es-min)**  
Minification for shipped JSX bundles.

**[ESABI](https://github.com/thelabcorner/esabi)**  
Modern ExternalObject ABI declarations for native integrations.

**[VectorIPC](https://github.com/thelabcorner/vector-ipc)**  
Bounded local IPC for scripting hosts and native plug-ins.

**[ESTC](https://github.com/thelabcorner/estc)**  
TypeScript-to-ExtendScript build, compatibility, and live-parse tooling.

**[ESDB](https://github.com/thelabcorner/esdb)**  
Native state and durable storage for Adobe tooling.

**[COMTool](https://github.com/thelabcorner/COMTool)**  
Guarded COM, ExtendScript, plug-in, and debugger automation for Adobe desktop apps.

**ESsemble** <sub>coming soon</sub>  
Typed framework, resolver, and composition layer for the ExtendScript toolkit.

**ESOBF** <sub>coming soon</sub>  
Obfuscation for hardened JSX distribution.

</td>
</tr>
</table>

Also from the same team: **[ArcFit.dev](https://arcfit.dev)**, deterministic arc warp for Illustrator.

---

## Table of Contents

- [Why ESENV?](#why-esenv)
- [Features](#features)
- [Get the Release](#get-the-release)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API](#api)
  - [Stable facts](#stable-facts)
  - [Capability probes](#capability-probes)
  - [Persistence probe lifecycle](#persistence-probe-lifecycle)
- [Validation](#validation)
- [Performance](#performance)
- [Security Model](#security-model)
- [Compatibility](#compatibility)
- [Engine quirks that shaped the design](#engine-quirks-that-shaped-the-design)
- [Development](#development)
- [Repository layout](#repository-layout)
- [Credits](#credits)
- [License](#license)

---

## Why ESENV?

ExtendScript code frequently needs to answer questions about the current host without turning those questions into hidden mutations or optimistic guesses. ESENV separates **observed** host/runtime strings from **inferred** classifications, **documented** language lineage, and **unknown** evidence so callers can preserve the distinction instead of collapsing missing information into false.

The final release candidate was parsed and executed on Adobe Illustrator 30.6.0 / ExtendScript 4.5.6 through COMTool V2. The live verifier observed the application and engine versions, Windows/64 platform, schema version 1, same-artifact facade replacement, and a persistent engine through the explicit two-facade sentinel protocol.

---

## Features

- Four evidence states are explicit: `observed`, `inferred`, `documented`, and `unknown`.
- Six declared mutable capability probes are supported: `externalObject`, `socket`, `bridgeTalk`, `scriptUI`, `filesystem`, and `persistentEngine`.
- `read(name)` caches stable primitive facts; `refresh()` explicitly invalidates them.
- `snapshot()` returns a detached schema-version-1 record and never probes mutable capabilities.
- `probe(name)` checks one declared capability at a time; unknown capability names fail closed.
- The persistence test requires a second facade evaluation before it can report observed persistence, so a facade never certifies its own sentinel write.
- The emitted `dist/ESENV.jsx` is 12,839 bytes and passes ESTC's Acorn ES3 compatibility gate.
- Node validation passes 11/11 behavioral tests; live validation is separately scoped to Illustrator 30.6.0 / ExtendScript 4.5.6.

---

## Get the Release

<div align="center">

**All production bundles ship as GitHub release assets — this repo holds
sources. Grab the runnable builds from the
[Releases page](https://github.com/thelabcorner/es-env/releases).**

[![Latest release](https://img.shields.io/github/v/release/thelabcorner/es-env?display_name=tag)](https://github.com/thelabcorner/es-env/releases/latest)
[![Release date](https://img.shields.io/github/release-date/thelabcorner/es-env)](https://github.com/thelabcorner/es-env/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/thelabcorner/es-env/total)](https://github.com/thelabcorner/es-env/releases)

</div>

**How it works, in three steps:**

1. Open the [Releases page](https://github.com/thelabcorner/es-env/releases).
2. Pick the **latest stable** tag.
3. Download the asset that matches your use case:

| You are... | Take this release | And this asset |
|---|---|---|
| Loading ESENV in an Adobe ExtendScript host | Latest stable | `ESENV.jsx` |

---

## Installation

Install development dependencies and build the ExtendScript artifact:

```bash
npm install
npm run build:jsx
```

Load `dist/ESENV.jsx` using the host's normal script-loading mechanism. Each evaluation installs a fresh facade at `$.global.ESENV`; stable facts are cached inside that facade rather than patched onto host built-ins.

For development and portable tests, `npm run build:node` emits the Node/V8 test build. Node results are not treated as ExtendScript performance evidence.

---

## Quick Start

```jsx
var env = $.global.ESENV;

var hostName = env.read("host.name");
var firstSnapshot = env.snapshot();
var socketSurface = env.probe("socket");

env.refresh();

var freshHostName = env.read("host.name");
var freshSocketSurface = env.probe("socket");
```

Facts carry `value`, `evidence`, `source`, and `detail`. Missing or unreadable values remain unknown rather than becoming false.

---

## API

### Stable facts

- `read(name)` returns a cached primitive string or `null` for one declared stable fact. It does not return host objects or accept arbitrary property paths.
- `snapshot()` returns a detached schema-version-1 record. It reads/caches stable facts, copies the most recently explicitly probed capability observations, and leaves unprobed capabilities unknown.
- `refresh()` invalidates stable facts and capability observations. The next `read()` or `snapshot()` recollects stable facts; capabilities remain unknown until explicitly probed again.

Application family and platform family are inferred from retained raw strings. The `ECMAScript 3-based ExtendScript` language lineage is labeled documented, not runtime-probed.

### Capability probes

`probe(name)` explicitly checks one declared mutable capability and caches that observation. Presence checks report API surface only; they do not promise that the capability can perform a particular operation.

The filesystem probe checks the `File`/`Folder` API surface and reads `Folder.temp.exists`; it does not open, create, or write a file. Host/runtime facts come from a fixed set of documented properties. ESENV does not enumerate arbitrary host objects.

### Persistence probe lifecycle

`persistentEngine` is strictly opt-in. Calling `probe("persistentEngine")` on facade A writes an ESENV-owned sentinel to `$.global` and returns unknown. Repeating the probe through facade A remains unknown because that facade cannot certify its own write.

Re-evaluate the ESENV bundle to create facade B over the same `$.global`. Facade B can observe the exact pre-existing sentinel, return `true` with observed evidence, and delete it. An occupied sentinel name is never overwritten. If the sentinel does not survive to a new facade, persistence remains unknown.

Neither `read()` nor `snapshot()` invokes this probe.

---

## Validation

| Check | Command | Result |
|---|---|---|
| Node behavior | `npm test` | 11/11 tests pass |
| TypeScript | `npm run typecheck` | clean |
| JSX build + static ES3 gate | `npm run estc:check` | 12,839-byte `ESENV.jsx` passes Acorn ES3 |
| Live parse | `npm run estc:live` | passes on Illustrator 30.6.0 / ExtendScript 4.5.6 |
| Live behavior | `npm run live-verify` | host/runtime facts, schema v1, persistent-engine protocol, and reload policy verified |

The live lane attaches to an already-running Illustrator target through COMTool V2; a Node or static ESTC result is never relabeled as live-host evidence.

---

## Performance

Node.js v22.23.2 / Windows x64 measurements use `node:perf_hooks performance.now()`, five warmup batches, and nine measured samples. These figures characterize the Node/V8 reference implementation only:

| Lane | Median µs/call | p95 µs/call |
|---|---:|---:|
| Refreshed snapshot | 15.0000 | 58.2000 |
| Cached scalar read | 0.004535 | 0.005575 |
| Detached snapshot | 1.0080 | 3.4840 |
| Explicit capability probe | 0.1570 | 0.3196 |

Live measurements on Adobe Illustrator 30.6.0 / ExtendScript 4.5.6 use `$.hiresTimer` as a delta timer with seven repetitions:

| Lane | Work per sample | Median µs/call |
|---|---:|---:|
| Cold snapshot after refresh | 1 | 77 |
| Cached `host.family` read | 5,000 | 0.7548 |
| Detached evidence snapshot | 100 | 34.14 |
| Socket surface probe | 1,000 | 9.349 |

The cached scalar path is intentionally small and passive. Capability work remains explicit so an ordinary read does not silently turn into host reflection or state mutation.

---

## Security Model

ESENV performs no `eval`, document mutation, network request, native loading, or arbitrary property traversal. It does not patch built-ins or prototypes. The only intentional state mutation is the namespaced persistence sentinel used by the explicit `persistentEngine` probe; that sentinel is never written by `read()` or `snapshot()`, never overwrites an occupied name, and is removed when a later facade successfully observes it.

The filesystem capability probe checks API presence and `Folder.temp.exists` only. It does not open, create, read, write, copy, rename, or delete files.

---

## Compatibility

| Target | Status |
|---|---|
| ExtendScript ES3 | ESTC-built JSX; Acorn ES3 static gate passes |
| Adobe Illustrator 30.6.0 / ExtendScript 4.5.6 | live parse and capability/identity verification pass |
| Persistent Illustrator engine | observed through the two-facade sentinel protocol |
| Other ExtendScript hosts | ES3-oriented implementation; not live-measured here |
| Node.js 20+ | portable development/test build; Node 22.23.2 measured |

---

## Engine quirks that shaped the design

These inherited findings are evidence from sibling libraries, not new ESENV measurements. Unless a linked source states otherwise, the live observations are scoped to Illustrator 30.6.0 / ExtendScript 4.5.6.

| Source | Relevant measured finding | ESENV consequence |
|---|---|---|
| [ESARR](https://github.com/thelabcorner/es-arr/blob/main/README.md) | ES5 array methods and later additions were absent; variable-index array reads became superlinear in long traversals. | Stable reads stay scalar and cached; runtime code does not rely on ES5 array methods. |
| [ESB64](https://github.com/thelabcorner/es-b64/blob/main/README.md) | `charAt()` returned an empty string for U+0000 while `charCodeAt()` preserved the code unit; NUL-bearing property keys collided. | Host strings are values, not ad-hoc property keys, and are not scanned through `charAt()`. |
| [ESON](https://github.com/thelabcorner/eson/blob/main/README.md) | The measured engine lacked dependable native `JSON`, `Object.defineProperty`, `Function.prototype.bind`, and `Array.prototype.indexOf` surfaces. | ESENV avoids those APIs and has no JSON or descriptor dependency. |
| [ESSTR](https://github.com/thelabcorner/es-str/blob/main/README.md) | Regex `\s` differed from modern trim semantics for U+180E/U+FEFF; non-strict `.call(null)` bound `this` to the global object. | ESENV does not normalize host text with regex whitespace rules or use `.call()` for capability access. |
| [ESCHARS](https://github.com/thelabcorner/es-chars/blob/main/README.md) | A per-unit `charCodeAt`/array-write transform wedged at inputs of 128 KiB or larger; the ExternalObject string channel truncated at NUL and could not carry lone surrogates. | ESENV stays on short environment fields and has no bulk transform or native/ESABI lane. |
| [ESTIMER](https://github.com/thelabcorner/es-timer/blob/main/README.md) | `$.hiresTimer` is a delta clock rather than an absolute timestamp. | Live timing uses primed, bounded delta samples; Node timing is reported separately. |

ESENV-specific live evidence confirmed the same artifact can be re-evaluated to replace the global facade while the engine itself persists, which is why cache ownership belongs to the facade and persistence certification requires a new facade instance.

---

## Development

```bash
npm run build:node
npm run typecheck
npm test
npm run benchmark:node
npm run build:jsx
npm run estc:check
npm run estc:live
npm run live-verify
npm run benchmark:live
npm run verify
npm run verify:engine
```

`npm run verify` is the portable/static gate. `npm run verify:engine` is the separate local real-engine gate.

---

## Repository layout

```text
esenv/
├── src/                         TypeScript core, facade entry, and types
├── tests/                       Node tests plus COMTool live verifier/benchmark
├── extendscript.estc.config.mjs ESTC project configuration
├── BUILD.md                     build and evidence-lane notes
├── package.json
└── README.md
```

Generated `build/` and `dist/` artifacts are intentionally ignored by Git.

---

## Credits

- [docsforadobe / ExtendScript documentation](https://extendscript.docsforadobe.dev/) for host runtime and file-system reference material.
- [ESTC](https://github.com/thelabcorner/estc) for TypeScript-to-ExtendScript emission and compatibility validation.
- The sibling ES-family repositories cited above for the measured engine constraints that informed the implementation.

---

## License

GPL-3.0-or-later. See [LICENSE](LICENSE).

---

<p align="center"><small>ESENV: ExtendScript Environment. Evidence-oriented host and capability facts without hidden probing.</small></p>
