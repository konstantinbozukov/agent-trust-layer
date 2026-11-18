import { randomUUID } from "node:crypto";
import type { AtlVerdict, ConsultRequest } from "./types.js";
import { DEFAULT_NETWORK } from "./types.js";

export type PolicyInput = {
  agentId: string;
  settlementCount: number;
  amountUsd: number;
  denyListed?: boolean;
};

export type PolicyResult = {
  verdict: AtlVerdict;
  score: number;
  reasons: string[];
};

/** Stub policy from ATL v0.1 spec §3.3 */
export function evaluateStubPolicy(input: PolicyInput): PolicyResult {
  const reasons: string[] = [];
  let score: number;

  if (input.denyListed) {
    return {
      verdict: "deny",
      score: 0,
      reasons: ["deny_listed"],
    };
  }

  if (input.settlementCount <= 0) {
    score = 50;
    reasons.push("unknown_agent");
  } else {
    score = Math.min(50 + 10 * input.settlementCount, 100);
    reasons.push("history_positive");
  }

  let verdict: AtlVerdict = "allow";
  if (input.amountUsd > 10 && score < 60) {
    verdict = "caution";
    reasons.push("high_amount_low_score");
  }

  return { verdict, score, reasons };
}

export function normalizeAgentId(agentId: string): string {
  const t = agentId.trim();
  if (t.startsWith("0x") && t.length === 42) return t.toLowerCase();
  return t;
}

export function normalizeSeller(seller: string): string {
  return seller.trim().replace(/\/$/, "");
}

/** On-chain settlement id (x402 payment-response); only these raise stub score. */
export function isScoreableTxHash(txHash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(txHash.trim());
}

export function assertConsultRequest(req: ConsultRequest): void {
  const agentId = req.agentId?.trim();
  if (!agentId) throw new Error("agentId required");
  if (agentId.length > 128) throw new Error("agentId must be at most 128 characters");
  const seller = req.seller?.trim();
  if (!seller) throw new Error("seller required");
  try {
    const u = new URL(seller);
    if (!u.protocol.startsWith("http")) {
      throw new Error("seller must be an absolute http(s) URL");
    }
  } catch {
    throw new Error("seller must be an absolute http(s) URL");
  }
  if (!req.sku?.trim() || !req.sku.startsWith("/")) {
    throw new Error("sku must be a path starting with /");
  }
  if (!Number.isFinite(req.amountUsd) || req.amountUsd < 0) {
    throw new Error("amountUsd must be a finite number >= 0");
  }
}

export function newConsultId(): string {
  return randomUUID();
}

export function newEventId(): string {
  return randomUUID();
}

export function resolveNetwork(network?: string): string {
  return network?.trim() || DEFAULT_NETWORK;
}
