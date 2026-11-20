# Agent Trust Layer (ATL)

[![CI](https://github.com/konstantinbozukov/agent-trust-layer/actions/workflows/ci.yml/badge.svg)](https://github.com/konstantinbozukov/agent-trust-layer/actions)
[![npm](https://img.shields.io/npm/v/@konstantinbozukov/agent-trust-layer)](https://www.npmjs.com/package/@konstantinbozukov/agent-trust-layer)
[![License: MIT](https://img.shields.io/github/license/konstantinbozukov/agent-trust-layer)](./LICENSE)

**Open protocol** for AI agents: consult trust before an x402 payment, record settlements on an append-only ledger. Fail-open — if an agent sends no ATL headers, sellers do no ATL work.

Spec + TypeScript reference + compat tests. MIT. Anyone can implement ATL v0.1 — pass [`tests/compat`](./tests/compat/) and you are compatible.

> **npm name:** Install **`@konstantinbozukov/agent-trust-layer`** (currently **0.1.1** on the public registry). The unscoped name [`agent-trust-layer`](https://www.npmjs.com/package/agent-trust-layer) on the public registry is a **different** project (maintainer `kauf3r`), not this repository.

## Why this exists

x402 lets an agent pay a seller in the same HTTP request that fetches the data. That is useful, and it is also a way to spend money with no paper trail. ATL adds an optional, fail-open consult before that payment and a local ledger after it. Agents that have never heard of ATL keep working exactly as they do today.

## Install

```bash
npm i @konstantinbozukov/agent-trust-layer
```

Requires Node 20+. The package has no runtime dependencies. Fallback, if you prefer git (dist is committed):

```bash
npm i "github:konstantinbozukov/agent-trust-layer#path:packages/core"
```

## 30-second live check (no wallet, no library)

A reference seller is running on [`signals.edge.report`](https://signals.edge.report) (built from a different repo, not this tree):

```bash
curl -s https://signals.edge.report/v1/atl/health
```

You should get JSON with `"ok": true`, `"protocol": "atl"`, `"version": "0.1.0"`.

For the header comparison (no header ⇒ plain 402; header present ⇒ 402 plus `X-ATL-Verdict` / `X-ATL-Score`) plus a free `POST /v1/atl/consult`:

```bash
git clone https://github.com/konstantinbozukov/atl-x402-starter
cd atl-x402-starter
npm install
npm run demo:headers
```

Expected last line: `PASS: zero-cost without header; soft ATL with header; consult OK.`

## Five lines (library path)

Consult is **in-process** against a local ledger. You do not have to call the hosted `/v1/atl/consult` before every payment.

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

- **Settlement is async by default** — it does not block after pay. Score increases only when a verified on-chain `txHash` is present (`x-payment-response` or equivalent).
- Skip the pre-pay consult: `withAtl(fetchPaid, url, { …, consult: false })`.
- `fetchPaid` is whatever paid fetch you already use (for example an x402 wrapper). This repo does not take a wallet key.

## Zero-cost path

| Who | What happens |
|-----|----------------|
| Agent with no ATL | Calls the seller as usual — **no ATL work, no added latency** |
| Agent using `withAtl` | Local consult (µs–ms) + optional `X-ATL-*` request headers; settlement async |
| Seller with ATL middleware | If a header is present, attach a score; if absent, identical to pre-ATL |

Hosted consult (`POST /v1/atl/consult`) is optional, for shared reputation later or for demos. v0.1 does not require a remote hop before pay.

## Edge Signals (external reference seller)

Checked **2026-11-19** (America/Phoenix):

| Endpoint | Status |
|----------|--------|
| `GET /v1/atl/health` | 200 — `protocol: atl`, `version: 0.1.0` |
| `GET /v1/gas` (no ATL header) | 402 + `payment-required` (x402 v2), **no** `X-ATL-*` response headers |
| `GET /v1/gas` + `X-ATL-Agent-Id` | 402 + `X-ATL-Verdict` / `X-ATL-Score` / `X-ATL-Consult-Id` |
| `POST /v1/atl/consult` | 200 — consult JSON (`verdict`, `score`, `consultId`, `protocol`, `version`) |

Soft ATL headers are also wired for `/v1/token-risk`. This host is a demo seller, not an ATL authority and not part of this repository.

## Scope and non-goals

ATL v0.1 is a draft protocol, a core library, and a reference Express middleware (`packages/reference-express`, not published on npm). The default score is a stub (`50 + 10 * settlementCount`, capped at 100). This repo does not host a website, does not custody keys, does not block an x402 payment by itself, and is not a general "agent trust platform."

## Related

- Demo starter (no wallet): [konstantinbozukov/atl-x402-starter](https://github.com/konstantinbozukov/atl-x402-starter)
- Local inventory of tools that can act as you: [who-can-act](https://github.com/konstantinbozukov/who-can-act)
- In-repo human accept before irreversible steps: [who-approved](https://github.com/konstantinbozukov/who-approved)

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