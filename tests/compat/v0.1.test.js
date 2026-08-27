/**
 * ATL v0.1 compatibility vectors — fixed expectations for any conforming impl.
 * Run with: npm test (from repo root, after build).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createAtlClient,
  createMemoryLedger,
  ATL_PROTOCOL,
  ATL_VERSION,
} from "@agent-trust-layer/core";

const AGENT_A = "0x1111111111111111111111111111111111111111";
const AGENT_B = "0x2222222222222222222222222222222222222222";
const SELLER = "https://signals.edge.report";

describe("ATL v0.1 compat — consult shape", () => {
  it("unknown agent gets score 50, allow, unknown_agent", async () => {
    const client = createAtlClient({ ledger: createMemoryLedger() });
    const r = await client.consult({
      agentId: AGENT_A,
      seller: SELLER,
      sku: "/v1/gas",
      amountUsd: 0.001,
    });
    assert.equal(r.protocol, ATL_PROTOCOL);
    assert.equal(r.version, ATL_VERSION);
    assert.equal(r.verdict, "allow");
    assert.equal(r.score, 50);
    assert.ok(r.reasons.includes("unknown_agent"));
    assert.ok(r.consultId.length > 0);
  });

  it("normalizes EVM agentId to lowercase", async () => {
    const client = createAtlClient({ ledger: createMemoryLedger() });
    const r = await client.consult({
      agentId: "0xAbCdEf0123456789AbCdEf0123456789AbCdEf01",
      seller: SELLER + "/",
      sku: "/v1/gas",
      amountUsd: 0,
    });
    assert.equal(r.verdict, "allow");
    const snap = await client.agentSnapshot(
      "0xabcdef0123456789abcdef0123456789abcdef01"
    );
    assert.equal(snap.settlementCount, 0);
    assert.equal(snap.score, 50);
  });

  it("rejects invalid sku", async () => {
    const client = createAtlClient({ ledger: createMemoryLedger() });
    await assert.rejects(
      () =>
        client.consult({
          agentId: AGENT_A,
          seller: SELLER,
          sku: "gas",
          amountUsd: 1,
        }),
      /sku/
    );
  });
});

describe("ATL v0.1 compat — ledger raises score", () => {
  it("two settlements → score 70 and history_positive", async () => {
    const ledger = createMemoryLedger();
    const client = createAtlClient({ ledger });

    const c1 = await client.consult({
      agentId: AGENT_A,
      seller: SELLER,
      sku: "/v1/gas",
      amountUsd: 0.001,
    });
    await client.recordSettlement({
      consultId: c1.consultId,
      agentId: AGENT_A,
      payer: AGENT_A,
      payTo: "0xe2520f1497ee47645072a6214304807bc3340d58",
      amountUsd: 0.001,
      txHash: "0xaaa",
      sku: "/v1/gas",
      seller: SELLER,
    });

    const c2 = await client.consult({
      agentId: AGENT_A,
      seller: SELLER,
      sku: "/v1/gas",
      amountUsd: 0.001,
    });
    assert.equal(c2.score, 60);
    assert.ok(c2.reasons.includes("history_positive"));

    await client.recordSettlement({
      consultId: c2.consultId,
      agentId: AGENT_A,
      payer: AGENT_A,
      payTo: "0xe2520f1497ee47645072a6214304807bc3340d58",
      amountUsd: 0.001,
      txHash: "0xbbb",
      sku: "/v1/gas",
      seller: SELLER,
    });

    const c3 = await client.consult({
      agentId: AGENT_A,
      seller: SELLER,
      sku: "/v1/gas",
      amountUsd: 0.001,
    });
    assert.equal(c3.score, 70);
    assert.equal(c3.verdict, "allow");

    const other = await client.consult({
      agentId: AGENT_B,
      seller: SELLER,
      sku: "/v1/gas",
      amountUsd: 0.001,
    });
    assert.equal(other.score, 50);
  });

  it("high amount + low score → caution", async () => {
    const client = createAtlClient({ ledger: createMemoryLedger() });
    const r = await client.consult({
      agentId: AGENT_A,
      seller: SELLER,
      sku: "/v1/wallet/full",
      amountUsd: 11,
    });
    assert.equal(r.verdict, "caution");
    assert.ok(r.reasons.includes("high_amount_low_score"));
  });

  it("deny list → deny", async () => {
    const client = createAtlClient({
      ledger: createMemoryLedger(),
      denyList: [AGENT_A],
    });
    const r = await client.consult({
      agentId: AGENT_A,
      seller: SELLER,
      sku: "/v1/gas",
      amountUsd: 0.001,
    });
    assert.equal(r.verdict, "deny");
    assert.equal(r.score, 0);
    assert.ok(r.reasons.includes("deny_listed"));
  });
});
