# Agent Trust Layer (ATL)

**Open protocol** for AI agents: consult trust **before** spend, then record settlements on an append-only ledger.

This repo is the **spec + reference implementation + compatibility tests** — not a hosted product and not a token. Anyone can implement ATL v0.1; if you pass the compat suite, you are ATL-compatible.

> Analogy: HTTP won as a standard with many libraries. ATL aims for the same — own the protocol, not one SDK.

## Spec

- Normative: [`spec/v0.1.md`](./spec/v0.1.md)
- Compat vectors: [`tests/compat/vectors.v0.1.json`](./tests/compat/vectors.v0.1.json)

## Packages

| Package | Role |
|---------|------|
| [`@agent-trust-layer/core`](./packages/core) | `consult` + `recordSettlement` + JSONL/memory ledger |
| [`@agent-trust-layer/reference-express`](./packages/reference-express) | Observational Express middleware |

## 5-line client (consult → pay → record)

```js
import { createAtlClient, createMemoryLedger } from "@agent-trust-layer/core";

const atl = createAtlClient({ ledger: createMemoryLedger() });
const c = await atl.consult({
  agentId: "0xYourAgent",
  seller: "https://signals.edge.report",
  sku: "/v1/gas",
  amountUsd: 0.001,
});
// … settle x402 to the seller …
await atl.recordSettlement({
  consultId: c.consultId,
  agentId: "0xYourAgent",
  payer: "0xYourAgent",
  payTo: "0xSellerPayTo",
  amountUsd: 0.001,
  txHash: "0x…",
  sku: "/v1/gas",
  seller: "https://signals.edge.report",
});
```

Full example: [`examples/node-consult-before-x402`](./examples/node-consult-before-x402).

## Develop

```bash
npm install
npm test          # build + compat suite
```

## Design rules (v0.1)

- Spec has **zero lock-in** (local ledger is fine).
- Middleware is **observational** — does not block x402 payments yet.
- Hosted reputation / escrow / token = separate product layer (not this repo).

## License

MIT
