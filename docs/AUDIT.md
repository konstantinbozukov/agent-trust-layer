# Repository audit — 2026-11-13

Auditor notes for Konstantin Bozukov. Documentation only. No application code, config, dependencies, or workflows were changed. Commands ran on Node v22.23.4 and npm 10.9.9. Guesses are marked `TODO: confirm with Konstantin`.

## Summary

Agent Trust Layer is a draft consult-before-spend protocol with a small TypeScript reference: an in-process client, a memory ledger, a JSONL ledger, a `withAtl()` fetch wrapper, an observational Express middleware, two examples, and eight `node:test` cases. The core happy path runs. Maturity is a **prototype**: five commits on 2026-08-27, spec status "draft normative", no CI, no release, the reference server package is unpublished and untested, and the trust properties the spec names (a verified payment, a stable agent id, passing every compat vector) are not enforced by the code. It is a working local library for the stub policy, and it is not a production trust service.

## Stack and hosting

- Language and runtime: TypeScript compiled to ESM, Node `>=20`. Verified with Node v22.23.4.
- Packages: npm workspaces. Root `agent-trust-layer-monorepo@0.1.1` (private). `packages/core` is `agent-trust-layer@0.1.1` and has no runtime dependencies. `packages/reference-express` is `@agent-trust-layer/reference-express@0.1.0`, peer `express >= 4`, devDependency `express@5.2.1` (lockfile) and `typescript@5.9.3`.
- Protocol version constant is `0.1.0` (`packages/core/src/types.ts`). That is the response `version`, separate from the npm package version.
- Persistence is a caller-chosen file (`createJsonlLedger`) or process memory. No database.
- This repo has no web host, container, or cloud project. The README points at a live seller, `https://signals.edge.report`, which is not built from this tree.

Public npm, checked 2026-11-13:

- `npm view agent-trust-layer` returns version `0.1.0`, published 2026-01-04, description "Security and governance framework for AI agent operations…", repository `git+https://github.com/kauf3r/agent-trust-layer.git`, maintainer account `kauf3r`. That is a different codebase (schemas, trust-gates, orchestrator, sandbox). This repo's `0.1.1` is not what `npm i agent-trust-layer` installs.
- `npm view @agent-trust-layer/reference-express` returns 404.

Public seller, checked 2026-11-13:

- `GET https://signals.edge.report/` → 200, HTML title "Edge Signals", `x-powered-by: Express`, `via: 1.1 Caddy`.
- `GET /v1/gas` → 402, body `{}`, header `payment-required` present.
- `GET /v1/gas` with `X-ATL-Agent-Id` and `X-ATL-Amount-Usd` → same 402, and no `X-ATL-*` response headers.
- `GET /v1/atl/health` → 404 `Cannot GET /v1/atl/health`.
- `POST /v1/atl/consult` with `{}` → 404 `Cannot POST /v1/atl/consult`.

`TODO: confirm with Konstantin` whether Edge Signals is still his host and whether the ATL routes were removed on purpose.

## Deploy path

Manual npm publish only, documented in `docs/PUBLISH.md`: `npm login`, then `npm publish --access public` from `packages/core`. `prepublishOnly` runs `tsc`. `packages/core/dist` is committed so git installs resolve `exports` without a local build. A rebuild with the locked TypeScript 5.9.3 during `npm test` left `packages/core/dist` unchanged (`git diff` empty).

There is no GitHub Actions directory (GitHub API 404 for `.github`), no release, and no other deploy config. Publishing `agent-trust-layer` from this tree would target a name that already belongs to another project. The reference Express package has never been published, and its dependency is `agent-trust-layer@0.1.1`, which is not on the registry. Inside this workspace, `npm ls` links that dependency to `packages/core`.

`docs/PUBLISH.md` records that the machine where it was written was not logged into npm (`ENEEDAUTH`) and shows a Windows path `E:\AI\agent-trust-layer`. `TODO: confirm with Konstantin` that this path is still his working copy.

## Environment variables

No application environment variables. A search of tracked files found no `process.env` reads and no committed `.env`. `.gitignore` ignores `.env` and `.env.*`. No `.env.example` exists. Names only, because there are none to list.

## Test coverage

`npm ci --ignore-scripts` (exit 0, lockfile unchanged) then `npm test` (exit 0).

`npm test` is exactly:

```bash
npm run build && node --test tests/compat/*.test.js
```

`npm run build` compiles both workspaces. The test runner reported: 8 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo, 3 suites, `duration_ms` 102.038175.

| File | Cases |
|---|---|
| `tests/compat/v0.1.test.js` | 6: unknown agent, EVM lowercasing, bad sku, score 70 after two settlements, high amount caution, deny list |
| `tests/compat/withAtl.test.js` | 2: async settle after a fake 200, `consult: false` |
| `tests/compat/vectors.v0.1.json` | 3 vectors. No test file imports this JSON. |

A separate coverage run, `node --test --experimental-test-coverage --test-coverage-include='packages/**/dist/**/*.js' 'tests/compat/*.test.js'`, also passed 8 tests. Node reported **83.61% lines, 74.67% branches, 87.50% functions** for the compiled files that loaded. That figure is `packages/core/dist` only. `packages/reference-express/dist` is never imported by tests, so the middleware is at zero coverage. Inside core, `ledger.js` was 38.33% lines: `createJsonlLedger` (source `packages/core/src/ledger.ts` lines 31–62) did not run. `withAtl.js` was 93.18% lines; the uncovered compiled lines are the non-JSON body branch and both `onSettlementError` paths (`packages/core/src/withAtl.ts` around 90–91, 116–118, and 123–125).

Also run, both exit 0, no network: `npm run example:with-atl` and `node examples/node-consult-before-x402/index.js`. `npm run lint` exits 1 with `Missing script: "lint"`.

The spec says an implementation is ATL v0.1 compatible if and only if it passes every vector in `tests/compat/` (`spec/v0.1.md` line 161). The runner never loads `vectors.v0.1.json`, so editing that file does not fail `npm test`.

## Bugs and likely bugs

Confirmed by reading the source and by a local script against the built packages (in-memory ledger, local Express on 127.0.0.1, temp JSONL file). No payments were sent.

1. **Any HTTP 2xx becomes a score-raising settlement, with an invented tx id.** `packages/core/src/withAtl.ts` lines 97–98 record a settlement when `response.ok`, and if no tx hash is found the id is `` `pending-${Date.now()}` ``. A local call with a 200 and body `{}` stored a hash prefixed `pending-` and returned score 60. The same call with a deny-listed agent still performed the fetch (`fetches: 1`), verdict `deny`, and `settlementCount: 1`. Spec §1 asks for a verified payment event. The code never checks a chain. `withAtl` also ignores `verdict` before calling fetch (lines 69–85). Spec §3.3 says blocking on `deny` is an integrator choice, so the missing block matches the spec; the score increase on an unverified 200 does not match "verified".

2. **One unverified settlement clears the high-amount caution.** `packages/core/src/policy.ts` lines 40–42 set `caution` only when `amountUsd > 10` and `score < 60`. One settlement makes the score 60 (`scoreFromCount` in `packages/core/src/client.ts` lines 34–37). After the unverified 200 above, a consult for `amountUsd: 1000` returned `allow` at score 60. `evaluateStubPolicy` agrees: amount `10` with zero history is `allow`, amount `10.01` is `caution`, amount `1000` after one settlement is `allow`. This matches the written inequality. It means a $0.001 event disables the only amount warning. `TODO: confirm with Konstantin` whether that threshold is what he wants.

3. **Settlement accepts a repeated tx hash, a non-path sku, and a non-URL seller.** `packages/core/src/client.ts` lines 83–108 require a non-empty `sku` and a string `txHash`. They do not require `sku` to start with `/` (consult does, `packages/core/src/policy.ts` lines 61–62), do not check seller shape, and do not reject a duplicate `txHash`. Replayed the synthetic hash with `sku: "not-a-path"` and `seller: "not a url"`; the ledger length became 2.

4. **Spec identifier rules are not enforced on consult.** Spec §2 (`spec/v0.1.md` lines 26–29): `agentId` max 128 characters; `seller` is an absolute origin without a trailing slash. `assertConsultRequest` (`packages/core/src/policy.ts` lines 58–67) checks non-empty agent, non-empty seller, sku prefix `/`, and a finite non-negative amount. A 200-character agent id and seller `"not a url"` were accepted with verdict `allow`. `normalizeSeller` (lines 54–56) only trims and strips one trailing slash. `packages/core/src/client.ts` lines 66–68 call `normalizeSeller` and `resolveNetwork` and discard the results.

5. **`tests/compat/vectors.v0.1.json` is unused.** The compat tests import `agent-trust-layer` only (`tests/compat/v0.1.test.js` lines 6–12). The JSON vectors are not executed.

6. **A bad JSONL line makes every read throw.** `packages/core/src/ledger.ts` lines 38–41 `JSON.parse` each line with no skip and no lock. A temp file whose second line was `NOT JSON` made `countSettlements` reject with `SyntaxError`. Writes use synchronous `appendFileSync` (lines 49–54) and every count re-reads the whole file (lines 45–47). There is no uniqueness check and no hash chain. The file is editable by whoever can write it.

7. **Reference middleware consults `req.path`, which drops the mount prefix, and it never records settlements.** `packages/reference-express/src/index.ts` line 34. An Express router mounted at `/v1` with `GET /v1/gas` consulted sku `/gas`, not `/v1/gas`, and returned 200 with `X-ATL-Verdict: caution` and `X-ATL-Score: 50` for amount 11. A request with no agent header returned 200 and no `X-ATL-*` headers (that part matches the "zero cost when the header is absent" note). Nothing in this file calls `recordSettlement`, so a seller using only this middleware keeps every agent at score 50 unless some other process writes the same ledger. The README's soft-seller behavior (attach `X-ATL-Verdict` / `X-ATL-Score` on `/v1/gas`) was not present on `signals.edge.report` on 2026-11-13.

8. **`withAtl` always sends GET, replaces the caller's headers, and consumes the body.** `packages/core/src/withAtl.ts` lines 79–91. The second argument is a URL string, and the `fetch` implementation is called with `{ method: "GET", headers }` containing only `X-ATL-*`. Calling `response.json()` on the returned `Response` threw `TypeError` because `response.text()` had already run. The documented gas URL is a GET (the live 402 is a GET), so this matches that one route. Other methods cannot be expressed. `parseTxHash` (lines 45–47) accepts any body string that starts with `0x`, while the header path requires 64 hex characters (lines 40–41).

9. **Lockfile root metadata does not match `package.json`.** `package.json` lines 2–3: `agent-trust-layer-monorepo` `0.1.1`. `package-lock.json` lines 2–3 and 8–9: `agent-trust-layer` `0.1.0`. `npm ci` on npm 10.9.9 still exited 0 and did not rewrite the lock. `packages/core` inside the lock is `0.1.1` (lines 1084–1086). `packages/reference-express` is `0.1.0` (line 1098).

10. **`examples/node-consult-before-x402/index.js` line 28 records `txHash` `0xdeadbeef_example_not_on_chain`.** That is labeled as a pretend payment. `recordSettlement` accepts it because line 88 of `client.ts` only checks `typeof txHash === "string"`. The example is honest about being fake; the ledger still treats it as history (`consult_after` score 60 when the example was run).

## Security

Committed secrets: none found. Searched tracked files for `process.env`, private-key blocks, and common token prefixes (`AKIA`, `ghp_`, `github_pat_`, `sk_live_`, Slack-style `xox`, JWT-shaped strings). No matches. The payee string hardcoded in `README.md` and both examples is a public address already printed in the README. It is not listed here.

Risks that are in the design of this tree:

- **Wrong package on install.** `README.md` lines 9–11 tell builders to run `npm i agent-trust-layer`. That name on the registry is `kauf3r/agent-trust-layer@0.1.0`, not this repository. Anyone who follows the README installs a different maintainer's code.
- **Unsigned agent identity.** The seller middleware treats `X-ATL-Agent-Id` as the agent (`packages/reference-express/src/index.ts` line 27). There is no signature. Spec §1 puts identity KYC out of scope. A caller can present any id.
- **Client-side score inflation.** The README's ledger is a local JSONL file the caller owns. `withAtl` increments that score on any 2xx, including a deny verdict, including a missing tx hash (bug 1). Five events cap the score at 100. Replaying one tx hash counts again (bug 3). If a seller ever trusted a client-supplied score or a client-supplied ledger, the score would not be evidence of payment.
- **JSONL integrity.** One corrupt line fails subsequent reads (bug 6). The file is not tamper-evident. `*.jsonl` is not in `.gitignore`, so a ledger created at `./atl-ledger.jsonl` (the path in `README.md` line 24) can be committed by accident. That file would be payment history.
- **Unbounded `agentId`.** A 200-character id was accepted (bug 4) and `withAtl` copies `agentId` into a request header (`withAtl.ts` line 80). A huge id is a storage and header-size problem for any process that persists it.
- **Dependency advisories, dev tree only.** `npm audit` exited 1: 1 critical, 1 high, 1 moderate, all transitive from the Express devDependency of `reference-express`. `npm audit` reported `fixAvailable: true`. Core's published surface has zero runtime dependencies, so these do not ship inside `agent-trust-layer`.

| Package | Severity | Advisory | Locked via |
|---|---|---|---|
| `proxy-addr` `1.1.0 – 2.0.7` | critical | [GHSA-jqcg-44mw-7w3h](https://github.com/advisories/GHSA-jqcg-44mw-7w3h) | `express@5.2.1` depends on `proxy-addr@^2.0.7` |
| `body-parser` `2.0.0 – 2.3.0` | high | [GHSA-27r3-jxmh-p828](https://github.com/advisories/GHSA-27r3-jxmh-p828) | lock has `body-parser@2.3.0` |
| `qs` `2.2.5 – 6.16.0` | moderate | [GHSA-x5fp-wj9c-mxmx](https://github.com/advisories/GHSA-x5fp-wj9c-mxmx), [GHSA-4mjr-xmp4-gh2g](https://github.com/advisories/GHSA-4mjr-xmp4-gh2g), [GHSA-6pq8-jhm2-2vcw](https://github.com/advisories/GHSA-6pq8-jhm2-2vcw) | `express@5.2.1` depends on `qs@^6.14.0`; lock has `qs@6.15.3` |

`express@5.3.0` (still inside this repo's `^5.2.1` range) depends on `proxy-addr@^2.0.8`, `qs@^6.16.0`, and `body-parser@^2.3.0`. Latest registry versions the same day: `proxy-addr` 2.0.8, `qs` 6.17.1, `body-parser` 2.4.0. This audit did not run `npm audit fix` and did not change the lockfile.

## Dependencies and staleness

Direct pins, from `npm ls` after `npm ci` and from `npm outdated` / `npm view` on 2026-11-13:

| Package | Locked | Wanted by the caret | Latest on npm |
|---|---|---|---|
| `typescript` | 5.9.3 | 5.9.3 (`^5.9.2`) | 7.0.2 |
| `@types/node` | 22.20.1 | 22.20.5 (`^22.17.0`) | 26.6.6 |
| `@types/express` | 5.0.6 | 5.0.6 | 5.0.6 |
| `express` (dev) | 5.2.1 | 5.3.0 (`^5.2.1`) | 5.3.0 |

The TypeScript range is current for the 5.9 line and two majors behind 7.0.2. Moving to TypeScript 7 is a deliberate upgrade, not a lockfile refresh. `@types/node` is one patch behind the 22.x wanted version; latest 26.x matches current Node majors and is outside `^22.17.0`. Express is one minor behind the range that would also move the advisory tree (see above).

The git history is five commits, all on 2026-08-27, from the initial spec through `withAtl` and the publish note. Last push recorded by GitHub: 2026-08-27T12:58:16Z. No open issues and no releases on that date's repo metadata, rechecked 2026-11-13.

`package-lock.json` root name and version are stale (bug 9) even though `npm ci` succeeded.

## Top 5 improvements

Ranked by value for someone about to share or depend on this repo, then by how small the change is.

1. **Point install docs at a package name you own, and publish that.** Value: anyone following `README.md` today installs `kauf3r/agent-trust-layer`, not this code. Effort: small — a scoped name, `packages/core/package.json`, the reference package's dependency, `README.md`, and `docs/PUBLISH.md`. Do this before any `npm publish`. `TODO: confirm with Konstantin` the exact name.
2. **Count a settlement only when the tx hash is real, and add a test that a bare 200 does not raise the score.** Value: this is the trust bug (`withAtl.ts` lines 97–98 and `client.ts` lines 88–108). Effort: small in code, and it needs a one-line spec decision because §2 allows an empty `txHash` for offline vectors. Empty should stay empty and should not use a `pending-` id. `TODO: confirm with Konstantin` whether `deny` should skip the fetch or only skip the ledger write.
3. **Make `npm test` load `vectors.v0.1.json`, and add tests for JSONL, the Express middleware, non-2xx, and deny.** Value: the spec's compatibility claim is currently false, and the JSONL ledger plus the only server code have no tests. Effort: small to medium, still inside `tests/compat` and `node:test`.
4. **Add CI (`npm ci` and `npm test`) and refresh the Express lock to clear the three advisories.** Value: medium. The advisories are dev-only, and there is no workflow to catch a red test. Effort: small. Keep the core package dependency-free.
5. **Close the seller loop in docs or in code.** The reference middleware never writes settlements and reports `req.path` (`packages/reference-express/src/index.ts` line 34), so a mounted app stores sku `/gas` for a request to `/v1/gas` and stays at score 50. The live host's `/v1/atl/health` and `/v1/atl/consult` returned 404, and `/v1/gas` did not echo ATL headers. Value: medium, because the README's "Live" section is what a reader will try. Effort: small if the README is corrected to match production; medium if the middleware should record settlements and use the full path. `TODO: confirm with Konstantin` which of those he wants.

## Open questions

- Which npm name should this publish under, given `agent-trust-layer` is already `github.com/kauf3r/agent-trust-layer`?
- Is `https://signals.edge.report` still the reference seller, and were `/v1/atl/health` and `POST /v1/atl/consult` removed on purpose? Where does that service's source live? It is not in this repo.
- Should one settlement (score 60) permanently disable `high_amount_low_score`, as spec §3.3 and `policy.ts` lines 40–42 do now?
- Should `withAtl` refuse to pay on `deny`, or is always calling fetch the v0.1 behavior you want to keep?
- Is the ledger strictly local to the buying agent (so a self-owned file is fine), or should a seller's ledger be the only score that matters?
- Should `packages/core/dist` stay committed, or should publish be the only place binaries exist?
- Is the Windows checkout in `docs/PUBLISH.md` (`E:\AI\agent-trust-layer`) still the tree you edit?
