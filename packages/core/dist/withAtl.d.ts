import type { AtlClient } from "./client.js";
import type { ConsultResponse, SettlementResponse } from "./types.js";
export type WithAtlOptions = {
    client: AtlClient;
    agentId: string;
    seller: string;
    /** Path only, e.g. /v1/gas */
    sku: string;
    amountUsd: number;
    payTo: string;
    network?: string;
    /**
     * If false, skip consult and only recordSettlement after a successful response.
     * Default true. Use false when you already consulted or want zero pre-pay RTT.
     */
    consult?: boolean;
    /**
     * If true (default), recordSettlement runs without awaiting (does not block the caller).
     * Failures are swallowed and optionally reported via onSettlementError.
     */
    settleAsync?: boolean;
    onSettlementError?: (err: unknown) => void;
};
export type WithAtlResult<T> = {
    response: Response;
    body: T;
    consult: ConsultResponse | null;
    settlement: SettlementResponse | null;
    /** Present when settleAsync=true; resolves when ledger write finishes */
    settlementPromise: Promise<SettlementResponse | null>;
};
/**
 * Five-line path for builders:
 *   const { body } = await withAtl(fetchPaid, url, { client, agentId, seller, sku, amountUsd, payTo });
 *
 * - consult is in-process (no remote RTT) when using createAtlClient + local ledger
 * - settlement defaults to async so it does not add latency after pay
 * - sets X-ATL-* headers so sellers with soft middleware attach score without blocking
 */
export declare function withAtl<T = unknown>(fetchImpl: typeof fetch, url: string, opts: WithAtlOptions): Promise<WithAtlResult<T>>;
//# sourceMappingURL=withAtl.d.ts.map