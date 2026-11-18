/**
 * Runs JSON vectors from vectors.v0.1.json (spec §6).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  createAtlClient,
  createMemoryLedger,
} from "@konstantinbozukov/agent-trust-layer";

const TX_A =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const TX_B =
  "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

const vectors = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "vectors.v0.1.json"), "utf8")
);

describe("ATL v0.1 compat — vectors.v0.1.json", () => {
  for (const vector of vectors) {
    it(vector.id, async () => {
      const ledger = createMemoryLedger();
      const client = createAtlClient({ ledger });

      if (vector.op === "consult") {
        const r = await client.consult(vector.input);
        assert.equal(r.verdict, vector.expect.verdict);
        assert.equal(r.score, vector.expect.score);
        for (const reason of vector.expect.reasonsIncludes ?? []) {
          assert.ok(r.reasons.includes(reason), `missing reason ${reason}`);
        }
        return;
      }

      if (vector.op === "consult_after_n_settlements") {
        for (let i = 0; i < vector.n; i++) {
          const c = await client.consult({
            agentId: vector.agentId,
            seller: "https://signals.edge.report",
            sku: "/v1/gas",
            amountUsd: 0.001,
          });
          await client.recordSettlement({
            consultId: c.consultId,
            agentId: vector.agentId,
            payer: vector.agentId,
            payTo: "0xe2520f1497ee47645072a6214304807bc3340d58",
            amountUsd: 0.001,
            txHash: i === 0 ? TX_A : TX_B,
            sku: "/v1/gas",
            seller: "https://signals.edge.report",
          });
        }
        const r = await client.consult({
          agentId: vector.agentId,
          seller: "https://signals.edge.report",
          sku: "/v1/gas",
          amountUsd: 0.001,
        });
        assert.equal(r.verdict, vector.expect.verdict);
        assert.equal(r.score, vector.expect.score);
        for (const reason of vector.expect.reasonsIncludes ?? []) {
          assert.ok(r.reasons.includes(reason), `missing reason ${reason}`);
        }
        return;
      }

      assert.fail(`unknown vector op ${vector.op}`);
    });
  }
});