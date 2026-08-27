import { assertConsultRequest, evaluateStubPolicy, newConsultId, newEventId, normalizeAgentId, normalizeSeller, resolveNetwork, } from "./policy.js";
import { ATL_PROTOCOL, ATL_VERSION } from "./types.js";
function denySet(opts) {
    if (!opts.denyList)
        return new Set();
    if (opts.denyList instanceof Set) {
        return new Set([...opts.denyList].map(normalizeAgentId));
    }
    return new Set(opts.denyList.map(normalizeAgentId));
}
export function scoreFromCount(settlementCount) {
    if (settlementCount <= 0)
        return 50;
    return Math.min(50 + 10 * settlementCount, 100);
}
export async function agentSnapshot(ledger, agentId) {
    const id = normalizeAgentId(agentId);
    const settlementCount = await ledger.countSettlements(id);
    return {
        agentId: id,
        settlementCount,
        score: scoreFromCount(settlementCount),
    };
}
export function createAtlClient(opts) {
    const denied = denySet(opts);
    async function consult(req) {
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
    async function recordSettlement(req) {
        if (!req.consultId?.trim())
            throw new Error("consultId required");
        if (!req.agentId?.trim())
            throw new Error("agentId required");
        if (!req.payer?.trim())
            throw new Error("payer required");
        if (!req.payTo?.trim())
            throw new Error("payTo required");
        if (!req.sku?.trim())
            throw new Error("sku required");
        if (typeof req.txHash !== "string")
            throw new Error("txHash required");
        if (!Number.isFinite(req.amountUsd) || req.amountUsd < 0) {
            throw new Error("amountUsd must be a finite number >= 0");
        }
        const agentId = normalizeAgentId(req.agentId);
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
    return { consult, recordSettlement, agentSnapshot: (id) => agentSnapshot(opts.ledger, id) };
}
