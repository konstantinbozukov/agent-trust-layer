# Agent Trust Layer (ATL)

**Open protocol** for AI agents: consult trust before spend, record settlements on an append-only ledger.

Spec + reference + compat tests. MIT. Anyone can implement ATL v0.1 — pass [`tests/compat`](./tests/compat/) and you are compatible.

## Install (builders)

```bash
npm i agent-trust-layer
```

Fallback (git):

```bash
npm i "github:konstantinbozukov/agent-trust-layer#path:packages/core"
```

## Five lines (real path)

```js
import { createAtlClient, createJsonlLedger, withAtl } from "agent-trust-layer";

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
- **Settlement is async by default** — does not block after pay.
- **No ATL header ⇒ sellers do nothing** — discovery agents pay as today (zero latency tax).

Skip pre-pay consult entirely: `withAtl(fetchPaid, url, { …, consult: false })` (still records settlement after success).

## Zero-cost path (important)

| Who | What happens |
|-----|----------------|
| Agent with no ATL | Calls seller as usual — **no ATL work, no added latency** |
| Agent using `withAtl` | Local consult (µs–ms) + optional `X-ATL-*` headers; settlement async |
| Soft seller (Edge Signals) | If header present, attach score; if absent, identical to pre-ATL |

Do **not** require a remote `POST /consult` before every payment in v0.1. Hosted consult is optional for shared reputation later.

## Live

Reference soft seller on Edge Signals (`signals.edge.report`):

- Free: `POST https://signals.edge.report/v1/atl/consult`
- Soft: `GET /v1/gas` with header `X-ATL-Agent-Id` → `X-ATL-Verdict` / `X-ATL-Score` (does not block 402)
- Health: `GET https://signals.edge.report/v1/atl/health`

## Spec & packages

| | |
|--|--|
| Spec | [`spec/v0.1.md`](./spec/v0.1.md) |
| Core | [`packages/core`](./packages/core) — `withAtl`, ledger, policy |
| Express | [`packages/reference-express`](./packages/reference-express) |
| Compat | `npm test` |

## Develop

```bash
npm install
npm test
```

## License

MIT
