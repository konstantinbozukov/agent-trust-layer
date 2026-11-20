# Agent Trust Layer — agent guide

This file is for Cursor agents working in `konstantinbozukov/agent-trust-layer`. It describes the tree as it was on 2026-11-20. Commands below were run on Node v22.23.4 and npm 10.9.9 unless noted. Guesses are marked `TODO: confirm with Konstantin`.

## What this is

Agent Trust Layer (ATL) v0.1 is a small open protocol and reference library. An agent calls `consult` before an x402-style payment, then `recordSettlement` appends the payment to a local ledger. The ledger count drives a stub score (`50 + 10 * settlementCount`, capped at 100).

The normative text is [`spec/v0.1.md`](spec/v0.1.md) (status: draft). The npm package version (`0.1.1`) and the protocol `version` field (`0.1.0` in `packages/core/src/types.ts`) are different on purpose. [`tests/compat`](tests/compat) is the conformance suite the spec points at.

This repository is a library plus a reference Express middleware. It does not host a website, database, or cloud app.

## Stack

- Node.js `>=20` (`package.json` `engines`). ESM only (`"type": "module"`).
- TypeScript 5.9.x, compiled with `tsc`. Shared compiler options in `tsconfig.base.json`: `strict`, `NodeNext`, `noUncheckedIndexedAccess`, target ES2022.
- npm workspaces. Root package name: `agent-trust-layer-monorepo` (private). Publishable package: `@konstantinbozukov/agent-trust-layer` in `packages/core`.
- Express 5 is a devDependency and peerDependency of `packages/reference-express` only. The core package has no runtime dependencies.
- Tests use the built-in `node:test` runner. There is no ESLint, Prettier, Jest, or coverage dependency.

## Folder layout

```
package.json              private workspace root (build, test, example scripts)
tsconfig.base.json
spec/v0.1.md              protocol
packages/core/            npm name @konstantinbozukov/agent-trust-layer (src + committed dist)
packages/reference-express/   @agent-trust-layer/reference-express (src only; dist is gitignored)
tests/compat/             node:test files + vectors.v0.1.json
examples/with-atl/        fake paid fetch through withAtl()
examples/node-consult-before-x402/   consult then recordSettlement, no network
docs/PUBLISH.md           manual npm publish notes
```

`packages/core/src` exports factories, not classes: `createAtlClient`, `createMemoryLedger`, `createJsonlLedger`, `withAtl`, `evaluateStubPolicy`.

## Install, run, test, lint, build

From the repo root:

```bash
npm ci
npm test
```

Verified 2026-11-20 (re-run after doc refresh):

- `npm ci --ignore-scripts` exited 0. The repo has no `install` or `postinstall` scripts. `prepublishOnly` on `packages/core` runs `tsc` only when publishing.
- `npm test` exited 0. It runs `npm run build`, then `node --test tests/compat/*.test.js`. Result: 8 passed, 0 failed, 0 skipped (3 suites).
- `npm run build` exited 0. It runs `tsc -p tsconfig.json` in `@konstantinbozukov/agent-trust-layer` and in `@agent-trust-layer/reference-express`.
- `npm run example:with-atl` exited 0. It rebuilds, then runs `examples/with-atl/index.js` (in-process fake `fetch`, no network).
- `node examples/node-consult-before-x402/index.js` exited 0 after that build. Run it from the repo root so Node can resolve `@konstantinbozukov/agent-trust-layer` from the workspace `node_modules`.
- `npm run lint` fails: `Missing script: "lint"`. There is no linter config in the tree.

`npm test` always rebuilds first. The compat tests import `@konstantinbozukov/agent-trust-layer`, which resolves to `packages/core` and loads `dist/`, so a stale `dist/` would be what the tests execute if you skip the build.

There is no watch script and no dev server in this repo.

## Deploy

Nothing in this repo deploys automatically.

- CI: `.github/workflows/ci.yml` runs `npm ci --ignore-scripts` and `npm test` on push/PR to `master`/`main` (Node 22 on ubuntu-latest).
- `@konstantinbozukov/agent-trust-layer@0.1.1` is published on the public npm registry. The unscoped name `agent-trust-layer` remains a different project (see `docs/AUDIT.md`). Do not publish from an agent session.
- Further releases: [`docs/PUBLISH.md`](docs/PUBLISH.md) — `npm login`, then `npm publish --access public` inside `packages/core`. `prepublishOnly` runs the TypeScript build. `publishConfig.access` is `public`.
- `packages/core/dist` is committed (see `.gitignore`) so a git install can resolve `exports` without a local compile.
- `@agent-trust-layer/reference-express` is not on the npm registry (`npm view` returned 404). Its `dist/` is gitignored.
- No releases workflow. No Dockerfile, `vercel.json`, or other hosting config.

## External services

Checked from this repo and from public endpoints on 2026-11-19. This code does not call them itself. `withAtl` calls whatever `fetch` the integrator passes in.

| Service | Role |
|---|---|
| npm registry | `@konstantinbozukov/agent-trust-layer@0.1.1` is on the public registry. The unscoped name `agent-trust-layer` resolves to `github.com/kauf3r/agent-trust-layer` @ `0.1.0` (published 2026-01-04), a different codebase. |
| `https://signals.edge.report` | Documented reference seller (Edge Signals). `GET /v1/atl/health` → 200 (`protocol: atl`, `version: 0.1.0`). `GET /v1/gas` without ATL header → 402 + `payment-required`, no `X-ATL-*`. With `X-ATL-Agent-Id` → 402 plus `X-ATL-Verdict` / `X-ATL-Score` / `X-ATL-Consult-Id`. `POST /v1/atl/consult` → 200 JSON. Soft headers also on `/v1/token-risk`. No-wallet demo: [atl-x402-starter](https://github.com/konstantinbozukov/atl-x402-starter). |
| Base (`eip155:8453`) | Default `network` in the spec and in `DEFAULT_NETWORK`. No chain SDK, RPC URL, or wallet code is in this repo. |

No Supabase, Vercel, or AWS client or config is in the tree.

`TODO: confirm with Konstantin` that he still operates `signals.edge.report` and that Base mainnet is still the only default network.

## Environment variables

None. The source does not read `process.env`. `.gitignore` ignores `.env` and `.env.*`. There is no `.env.example`. Do not invent env vars for this library.

## Coding conventions

Inferred from `packages/core/src` and `packages/reference-express/src`:

- ESM TypeScript. Relative imports use a `.js` suffix (`./policy.js`) so NodeNext resolution matches the emitted files.
- Named exports and factory functions. No classes and no default exports.
- Protocol constants live in `types.ts`: `ATL_PROTOCOL` (`"atl"`), `ATL_VERSION` (`"0.1.0"`), `DEFAULT_NETWORK` (`"eip155:8453"`).
- Failures are `throw new Error("short message")`. There is no error class.
- Ledger methods are `async` even for the in-memory implementation.
- The Express middleware is observational unless `soft: false`. A missing `X-ATL-Agent-Id` calls `next()` immediately.
- Tests are plain JavaScript (`node:test` + `node:assert/strict`), not TypeScript. They hit the public package entry, not `src/` via a path alias.
- Indentation in the sources is 2 spaces.

Keep protocol shape changes in `spec/v0.1.md` and the compat tests together. Shipping a new request or response field is a protocol change (spec §7).

## Never touch

- Do not run `npm publish`, `npm login`, or anything that writes to the registry.
- Do not read, print, or commit secrets. None are in the tree today. Leave `.env` and `.env.*` untracked. Do not add npm tokens, GitHub tokens, or private keys.
- Do not hand-edit `packages/core/dist`. Rebuild with `npm run build` when `src/` changes and commit the result only as part of a deliberate core change. Consumers install that `dist/`.
- Do not commit local ledger files such as `atl-ledger.jsonl`. They are payment history. `.gitignore` does not currently ignore `*.jsonl`.
- There is no database, migration, store config, or production dataset in this repo. Do not add one as a drive-by.
- Do not retarget `packages/core/package.json` `publishConfig`, the package name, or dependency ranges unless the task is specifically a release. The reference package depends on `@konstantinbozukov/agent-trust-layer@0.1.1`, and inside this workspace npm links that to `packages/core`.
- `signals.edge.report` is a live host outside this repository. Changing this library does not deploy it.
