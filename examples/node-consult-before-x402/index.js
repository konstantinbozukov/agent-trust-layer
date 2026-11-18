/**
 * Minimal ATL v0.1 flow without real chain payment.
 * Shows consult → (pretend x402) → recordSettlement.
 *
 * Run from repo root after `npm install && npm run build`:
 *   node examples/node-consult-before-x402/index.js
 */
import {
  createAtlClient,
  createMemoryLedger,
} from "@konstantinbozukov/agent-trust-layer";

const AGENT = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const SELLER = "https://signals.edge.report";
const PAY_TO = "0xe2520f1497ee47645072a6214304807bc3340d58";

const atl = createAtlClient({ ledger: createMemoryLedger() });

const consult = await atl.consult({
  agentId: AGENT,
  seller: SELLER,
  sku: "/v1/gas",
  amountUsd: 0.001,
});
console.log("consult", consult);

// In production: wrapFetchWithPayment(fetch) → GET seller/v1/gas
// 64 hex chars (scoreable shape); still fake / not verified on-chain in this demo.
const fakeTx =
  "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";

const settled = await atl.recordSettlement({
  consultId: consult.consultId,
  agentId: AGENT,
  payer: AGENT,
  payTo: PAY_TO,
  amountUsd: 0.001,
  txHash: fakeTx,
  sku: "/v1/gas",
  seller: SELLER,
});
console.log("settlement", settled);

const again = await atl.consult({
  agentId: AGENT,
  seller: SELLER,
  sku: "/v1/gas",
  amountUsd: 0.001,
});
console.log("consult_after", again);
