import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createAtlClient,
  createMemoryLedger,
  withAtl,
} from "agent-trust-layer";

describe("ATL v0.1 withAtl helper", () => {
  it("consults locally, pays, settles async", async () => {
    const client = createAtlClient({ ledger: createMemoryLedger() });
    const agentId = "0xcccccccccccccccccccccccccccccccccccccccc";
    const fetchPaid = async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "x-payment-response":
            "0x1111111111111111111111111111111111111111111111111111111111111111",
        },
      });

    const r = await withAtl(fetchPaid, "https://signals.edge.report/v1/gas", {
      client,
      agentId,
      seller: "https://signals.edge.report",
      sku: "/v1/gas",
      amountUsd: 0.001,
      payTo: "0xe2520f1497ee47645072a6214304807bc3340d58",
    });

    assert.equal(r.consult?.score, 50);
    assert.equal(r.response.status, 200);
    const settled = await r.settlementPromise;
    assert.ok(settled);
    assert.equal(settled.agent.settlementCount, 1);
    assert.equal(settled.agent.score, 60);
  });

  it("consult:false skips pre-pay consult", async () => {
    const client = createAtlClient({ ledger: createMemoryLedger() });
    const fetchPaid = async () =>
      new Response("{}", { status: 200, headers: { "content-type": "application/json" } });

    const r = await withAtl(fetchPaid, "https://example.com/v1/gas", {
      client,
      agentId: "0xdddddddddddddddddddddddddddddddddddddddd",
      seller: "https://example.com",
      sku: "/v1/gas",
      amountUsd: 0.001,
      payTo: "0xe2520f1497ee47645072a6214304807bc3340d58",
      consult: false,
      settleAsync: false,
    });

    assert.equal(r.consult, null);
    assert.ok(r.settlement);
  });
});
