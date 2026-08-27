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

function parseTxHash(res: Response, body: unknown): string {
  const headerTx =
    res.headers.get("x-payment-response") ||
    res.headers.get("X-PAYMENT-RESPONSE") ||
    "";
  if (headerTx && /^0x[a-fA-F0-9]{64}$/.test(headerTx.trim())) {
    return headerTx.trim();
  }
  if (body && typeof body === "object") {
    const o = body as Record<string, unknown>;
    for (const k of ["transaction", "txHash", "tx"]) {
      const v = o[k];
      if (typeof v === "string" && v.startsWith("0x")) return v;
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
export async function withAtl<T = unknown>(
  fetchImpl: typeof fetch,
  url: string,
  opts: WithAtlOptions
): Promise<WithAtlResult<T>> {
  const doConsult = opts.consult !== false;
  let consult: ConsultResponse | null = null;

  if (doConsult) {
    consult = await opts.client.consult({
      agentId: opts.agentId,
      seller: opts.seller,
      sku: opts.sku,
      amountUsd: opts.amountUsd,
      network: opts.network,
    });
  }

  const headers: Record<string, string> = {
    "X-ATL-Agent-Id": opts.agentId,
    "X-ATL-Amount-Usd": String(opts.amountUsd),
  };
  if (consult) headers["X-ATL-Consult-Id"] = consult.consultId;

  const response = await fetchImpl(url, { method: "GET", headers });
  const text = await response.text();
  let body: T;
  try {
    body = JSON.parse(text) as T;
  } catch {
    body = text as unknown as T;
  }

  const settleAsync = opts.settleAsync !== false;

  const writeSettlement = async (): Promise<SettlementResponse | null> => {
    if (!response.ok) return null;
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

  let settlement: SettlementResponse | null = null;
  let settlementPromise: Promise<SettlementResponse | null>;

  if (settleAsync) {
    settlementPromise = writeSettlement().catch((err) => {
      opts.onSettlementError?.(err);
      return null;
    });
  } else {
    try {
      settlement = await writeSettlement();
    } catch (err) {
      opts.onSettlementError?.(err);
    }
    settlementPromise = Promise.resolve(settlement);
  }

  return { response, body, consult, settlement, settlementPromise };
}
