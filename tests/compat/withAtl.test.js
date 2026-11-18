import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createAtlClient,
  createMemoryLedger,
  withAtl,
} from "@konstantinbozukov/agent-trust-layer";

const PAYMENT_TX =
  "0x1111111111111111111111111111111111111111111111111111111111111111";

describe("ATL v0.1 withAtl helper", () => {
  it("consults locally, pays, settles async when payment header present", async () => {
    const client = createAtlClient({ ledger: createMemoryLedger() });
    const agentId = "0xcccccccccccccccccccccccccccccccccccccccc";
    const fetchPaid = async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "x-payment-response": PAYMENT_TX,
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

  it("bare 200 without payment evidence does not raise score", async () => {
    const client = createAtlClient({ ledger: createMemoryLedger() });
    const agentId = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
    const fetchPaid = async () =>
      new Response("{}", {
        status: 200,
        headers: { "content-type": "application/json" },
      });

    const r = await withAtl(fetchPaid, "https://example.com/v1/gas", {
      client,
      agentId,
      seller: "https://example.com",
      sku: "/v1/gas",
      amountUsd: 0.001,
      payTo: "0xe2520f1497ee47645072a6214304807bc3340d58",
      settleAsync: false,
    });

    assert.ok(r.settlement);
    assert.equal(r.settlement.agent.settlementCount, 0);
    assert.equal(r.settlement.agent.score, 50);
    const after = await client.consult({
      agentId,
      seller: "https://example.com",
      sku: "/v1/wallet/full",
      amountUsd: 11,
    });
    assert.equal(after.verdict, "caution");
    assert.equal(after.score, 50);
  });

  it("consult:false records unverified settlement without raising score", async () => {
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
    assert.equal(r.settlement.agent.settlementCount, 0);
  });
});