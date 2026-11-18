import {
  assertConsultRequest,
  evaluateStubPolicy,
  isScoreableTxHash,
  newConsultId,
  newEventId,
  normalizeAgentId,
  normalizeSeller,
  resolveNetwork,
} from "./policy.js";
import type {
  AgentSnapshot,
  AtlLedger,
  ConsultRequest,
  ConsultResponse,
  SettlementRequest,
  SettlementResponse,
} from "./types.js";
import { ATL_PROTOCOL, ATL_VERSION } from "./types.js";

export type AtlClientOptions = {
  ledger: AtlLedger;
  /** Optional deny list of agentIds */
  denyList?: Set<string> | string[];
};

function denySet(opts: AtlClientOptions): Set<string> {
  if (!opts.denyList) return new Set();
  if (opts.denyList instanceof Set) {
    return new Set([...opts.denyList].map(normalizeAgentId));
  }
  return new Set(opts.denyList.map(normalizeAgentId));
}

export function scoreFromCount(settlementCount: number): number {
  if (settlementCount <= 0) return 50;
  return Math.min(50 + 10 * settlementCount, 100);
}

export async function agentSnapshot(
  ledger: AtlLedger,
  agentId: string
): Promise<AgentSnapshot> {
  const id = normalizeAgentId(agentId);
  const settlementCount = await ledger.countSettlements(id);
  return {
    agentId: id,
    settlementCount,
    score: scoreFromCount(settlementCount),
  };
}

export function createAtlClient(opts: AtlClientOptions) {
  const denied = denySet(opts);

  async function consult(req: ConsultRequest): Promise<ConsultResponse> {
    assertConsultRequest(req);
    const agentId = normalizeAgentId(req.agentId);
    const settlementCount = await opts.ledger.countSettlements(agentId);
    const policy = evaluateStubPolicy({
      agentId,
      settlementCount,
      amountUsd: req.amountUsd,
      denyListed: denied.has(agentId),
    });

    // Touch seller normalize for future policy hooks
    normalizeSeller(req.seller);
    resolveNetwork(req.network);

    return {
      verdict: policy.verdict,
      score: policy.score,
      reasons: policy.reasons,
      consultId: newConsultId(),
      protocol: ATL_PROTOCOL,
      version: ATL_VERSION,
    };
  }

  async function recordSettlement(
    req: SettlementRequest
  ): Promise<SettlementResponse> {
    if (!req.consultId?.trim()) throw new Error("consultId required");
    if (!req.agentId?.trim()) throw new Error("agentId required");
    if (!req.payer?.trim()) throw new Error("payer required");
    if (!req.payTo?.trim()) throw new Error("payTo required");
    if (!req.sku?.trim() || !req.sku.startsWith("/")) {
      throw new Error("sku must be a path starting with /");
    }
    if (typeof req.txHash !== "string") throw new Error("txHash required");
    if (!Number.isFinite(req.amountUsd) || req.amountUsd < 0) {
      throw new Error("amountUsd must be a finite number >= 0");
    }
    if (req.seller?.trim()) {
      try {
        const u = new URL(normalizeSeller(req.seller));
        if (!u.protocol.startsWith("http")) {
          throw new Error("seller must be an absolute http(s) URL");
        }
      } catch {
        throw new Error("seller must be an absolute http(s) URL");
      }
    }

    const agentId = normalizeAgentId(req.agentId);
    if (req.txHash.trim() && isScoreableTxHash(req.txHash)) {
      const existing = await opts.ledger.listSettlements();
      if (existing.some((e) => e.txHash === req.txHash.trim())) {
        throw new Error("duplicate txHash");
      }
    }
    const eventId = newEventId();
    await opts.ledger.appendSettlement({
      type: "settlement",
      eventId,
      consultId: req.consultId,
      agentId,
      payer: normalizeAgentId(req.payer),
      payTo: normalizeAgentId(req.payTo),
      amountUsd: req.amountUsd,
      txHash: req.txHash,
      sku: req.sku,
      seller: req.seller ? normalizeSeller(req.seller) : undefined,
      network: resolveNetwork(req.network),
      at: new Date().toISOString(),
    });

    const agent = await agentSnapshot(opts.ledger, agentId);
    return {
      eventId,
      agent,
      protocol: ATL_PROTOCOL,
      version: ATL_VERSION,
    };
  }

  return { consult, recordSettlement, agentSnapshot: (id: string) => agentSnapshot(opts.ledger, id) };
}

export type AtlClient = ReturnType<typeof createAtlClient>;
