/**
 * Real 5-line-style ATL + pretend pay (no chain).
 * Run: npm run build && node examples/with-atl/index.js
 */
import {
  createAtlClient,
  createMemoryLedger,
  withAtl,
} from "agent-trust-layer";

const agentId = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const seller = "https://signals.edge.report";
const payTo = "0xe2520f1497ee47645072a6214304807bc3340d58";
const client = createAtlClient({ ledger: createMemoryLedger() });

// Fake paid fetch — real apps pass wrapFetchWithPayment(fetch, x402Client)
const fetchPaid = async (url, init) =>
  new Response(JSON.stringify({ ok: true, url, atlHeaders: init?.headers }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

const { body, consult, settlementPromise } = await withAtl(
  fetchPaid,
  `${seller}/v1/gas`,
  {
    client,
    agentId,
    seller,
    sku: "/v1/gas",
    amountUsd: 0.001,
    payTo,
  }
);

console.log({ consult, body, settlement: await settlementPromise });
