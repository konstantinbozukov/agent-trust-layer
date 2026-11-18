# Agent Trust Layer (ATL)

**Open protocol** for AI agents: consult trust before spend, record settlements on an append-only ledger.

Spec + reference + compat tests. MIT. Anyone can implement ATL v0.1 — pass [`tests/compat`](./tests/compat/) and you are compatible.

> **npm:** The unscoped name [`agent-trust-layer`](https://www.npmjs.com/package/agent-trust-layer) on the public registry is a **different** project (maintainer `kauf3r`). Install this repository’s package as **`@konstantinbozukov/agent-trust-layer`** (or from GitHub below). Not published yet.

## Install (builders)

```bash
npm i @konstantinbozukov/agent-trust-layer
```

Fallback (git):

```bash
npm i "github:konstantinbozukov/agent-trust-layer#path:packages/core"
```

## Five lines (real path)

```js
import {
  createAtlClient,
  createJsonlLedger,
  withAtl,
} from "@konstantinbozukov/agent-trust-layer";

const client = createAtlClient({ ledger: createJsonlLedger("./atl-ledger.jsonl") });
const { body, consult } = await withAtl(fetchPaid, url, {
  client,
  agentId: buyerAddress,
  seller: "https://signals.edge.report",
  sku: "/v1/gas",
  amountUsd: 0.001,
  payTo: "0xE2520f1497ee47645072a6214304807BC3340D58",
});
```

- **Consult is in-process** (local ledger) — no extra HTTP hop before pay.
- **Settlement is async by default** — does not block after pay. Score increases only when a verified on-chain `txHash` is present (`x-payment-response` or equivalent).
- **No ATL header ⇒ sellers do nothing** — discovery agents pay as today (zero latency tax).

Skip pre-pay consult entirely: `withAtl(fetchPaid, url, { …, consult: false })` (still appends an unverified ledger row after success when there is no payment evidence).

## Zero-cost path (important)

| Who | What happens |
|-----|----------------|
| Agent with no ATL | Calls seller as usual — **no ATL work, no added latency** |
| Agent using `withAtl` | Local consult (µs–ms) + optional `X-ATL-*` headers; settlement async |
| Seller with ATL middleware | If header present, attach score; if absent, identical to pre-ATL |

Do **not** require a remote `POST /consult` before every payment in v0.1. Hosted consult is optional for shared reputation later.

## Edge Signals (external reference seller)

[`signals.edge.report`](https://signals.edge.report) is a live x402 demo host (not built from this repo). Checked **2026-11-18**:

| Endpoint | Status |
|----------|--------|
| `GET /` | 200 — site home |
| `GET /v1/gas` | 402 + `payment-required` (x402 v2) |
| `GET /v1/gas` + `X-ATL-Agent-Id` | 402 — **no** `X-ATL-*` response headers today |
| `GET /v1/atl/health` | 404 — not deployed |
| `POST /v1/atl/consult` | 404 — not deployed |

**Planned (not live):** hosted consult (`POST /v1/atl/consult`), health check, and soft seller headers on paid routes. Use this repo’s in-process `consult` + [`packages/reference-express`](./packages/reference-express/) until those routes exist.

## Spec & packages

| | |
|--|--|
| Spec | [`spec/v0.1.md`](./spec/v0.1.md) |
| Core | [`packages/core`](./packages/core) — `withAtl`, ledger, policy |
| Express | [`packages/reference-express`](./packages/reference-express) |
| Compat | `npm test` (includes `vectors.v0.1.json`) |

## Develop

```bash
npm install
npm test
```

## License

MIT