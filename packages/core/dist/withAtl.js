function parseTxHash(res, body) {
    const headerTx = res.headers.get("x-payment-response") ||
        res.headers.get("X-PAYMENT-RESPONSE") ||
        "";
    if (headerTx && /^0x[a-fA-F0-9]{64}$/.test(headerTx.trim())) {
        return headerTx.trim();
    }
    if (body && typeof body === "object") {
        const o = body;
        for (const k of ["transaction", "txHash", "tx"]) {
            const v = o[k];
            if (typeof v === "string" && v.startsWith("0x"))
                return v;
        }
    }
    return "";
}
/**
 * Five-line path for builders:
 *   const { body } = await withAtl(fetchPaid, url, { client, agentId, seller, sku, amountUsd, payTo });
 *
 * - consult is in-process (no remote RTT) when using createAtlClient + local ledger
 * - settlement defaults to async so it does not add latency after pay
 * - sets X-ATL-* headers so sellers with soft middleware attach score without blocking
 */
export async function withAtl(fetchImpl, url, opts) {
    const doConsult = opts.consult !== false;
    let consult = null;
    if (doConsult) {
        consult = await opts.client.consult({
            agentId: opts.agentId,
            seller: opts.seller,
            sku: opts.sku,
            amountUsd: opts.amountUsd,
            network: opts.network,
        });
    }
    const headers = {
        "X-ATL-Agent-Id": opts.agentId,
        "X-ATL-Amount-Usd": String(opts.amountUsd),
    };
    if (consult)
        headers["X-ATL-Consult-Id"] = consult.consultId;
    const response = await fetchImpl(url, { method: "GET", headers });
    const text = await response.text();
    let body;
    try {
        body = JSON.parse(text);
    }
    catch {
        body = text;
    }
    const settleAsync = opts.settleAsync !== false;
    const writeSettlement = async () => {
        if (!response.ok)
            return null;
        const txHash = parseTxHash(response, body) || `pending-${Date.now()}`;
        return opts.client.recordSettlement({
            consultId: consult?.consultId ?? `no-consult-${Date.now()}`,
            agentId: opts.agentId,
            payer: opts.agentId,
            payTo: opts.payTo,
            amountUsd: opts.amountUsd,
            txHash,
            sku: opts.sku,
            seller: opts.seller,
            network: opts.network,
        });
    };
    let settlement = null;
    let settlementPromise;
    if (settleAsync) {
        settlementPromise = writeSettlement().catch((err) => {
            opts.onSettlementError?.(err);
            return null;
        });
    }
    else {
        try {
            settlement = await writeSettlement();
        }
        catch (err) {
            opts.onSettlementError?.(err);
        }
        settlementPromise = Promise.resolve(settlement);
    }
    return { response, body, consult, settlement, settlementPromise };
}
