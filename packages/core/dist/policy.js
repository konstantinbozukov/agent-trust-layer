import { randomUUID } from "node:crypto";
import { DEFAULT_NETWORK } from "./types.js";
/** Stub policy from ATL v0.1 spec §3.3 */
export function evaluateStubPolicy(input) {
    const reasons = [];
    let score;
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
    }
    else {
        score = Math.min(50 + 10 * input.settlementCount, 100);
        reasons.push("history_positive");
    }
    let verdict = "allow";
    if (input.amountUsd > 10 && score < 60) {
        verdict = "caution";
        reasons.push("high_amount_low_score");
    }
    return { verdict, score, reasons };
}
export function normalizeAgentId(agentId) {
    const t = agentId.trim();
    if (t.startsWith("0x") && t.length === 42)
        return t.toLowerCase();
    return t;
}
export function normalizeSeller(seller) {
    return seller.trim().replace(/\/$/, "");
}
/** On-chain settlement id (x402 payment-response); only these raise stub score. */
export function isScoreableTxHash(txHash) {
    return /^0x[a-fA-F0-9]{64}$/.test(txHash.trim());
}
export function assertConsultRequest(req) {
    const agentId = req.agentId?.trim();
    if (!agentId)
        throw new Error("agentId required");
    if (agentId.length > 128)
        throw new Error("agentId must be at most 128 characters");
    const seller = req.seller?.trim();
    if (!seller)
        throw new Error("seller required");
    try {
        const u = new URL(seller);
        if (!u.protocol.startsWith("http")) {
            throw new Error("seller must be an absolute http(s) URL");
        }
    }
    catch {
        throw new Error("seller must be an absolute http(s) URL");
    }
    if (!req.sku?.trim() || !req.sku.startsWith("/")) {
        throw new Error("sku must be a path starting with /");
    }
    if (!Number.isFinite(req.amountUsd) || req.amountUsd < 0) {
        throw new Error("amountUsd must be a finite number >= 0");
    }
}
export function newConsultId() {
    return randomUUID();
}
export function newEventId() {
    return randomUUID();
}
export function resolveNetwork(network) {
    return network?.trim() || DEFAULT_NETWORK;
}
