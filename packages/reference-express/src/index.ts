import type { RequestHandler } from "express";
import type { AtlClient } from "@agent-trust-layer/core";

export type AtlMiddlewareOptions = {
  client: AtlClient;
  /** Header carrying agent id (default X-ATL-Agent-Id) */
  agentHeader?: string;
  /** Default amount when not provided (consult is observational in v0.1) */
  defaultAmountUsd?: number;
  /** Seller origin for consult */
  seller: string;
  /** Do not block the request on deny/caution (v0.1 default: true) */
  soft?: boolean;
};

/**
 * Observational ATL middleware: when X-ATL-Agent-Id is present, run consult
 * and attach result to res.locals.atl + response headers.
 * Does NOT block payment in v0.1 (soft=true).
 */
export function createAtlMiddleware(opts: AtlMiddlewareOptions): RequestHandler {
  const header = opts.agentHeader ?? "x-atl-agent-id";
  const soft = opts.soft !== false;
  const defaultAmount = opts.defaultAmountUsd ?? 0;

  return async (req, res, next) => {
    const agentId = String(req.header(header) ?? "").trim();
    if (!agentId) {
      next();
      return;
    }

    try {
      const sku = req.path.startsWith("/") ? req.path : `/${req.path}`;
      const amountRaw = req.header("x-atl-amount-usd");
      const amountUsd = amountRaw ? Number(amountRaw) : defaultAmount;
      const result = await opts.client.consult({
        agentId,
        seller: opts.seller,
        sku,
        amountUsd: Number.isFinite(amountUsd) ? amountUsd : defaultAmount,
      });

      (res as { locals: Record<string, unknown> }).locals.atl = result;
      res.setHeader("X-ATL-Consult-Id", result.consultId);
      res.setHeader("X-ATL-Verdict", result.verdict);
      res.setHeader("X-ATL-Score", String(result.score));

      if (!soft && result.verdict === "deny") {
        res.status(403).json({
          error: "atl_deny",
          atl: result,
        });
        return;
      }
    } catch (err) {
      // Observational: never fail the seller path on consult errors in soft mode
      if (!soft) {
        next(err);
        return;
      }
      res.setHeader("X-ATL-Error", "consult_failed");
    }
    next();
  };
}
