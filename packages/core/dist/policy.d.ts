import type { AtlVerdict, ConsultRequest } from "./types.js";
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
export declare function evaluateStubPolicy(input: PolicyInput): PolicyResult;
export declare function normalizeAgentId(agentId: string): string;
export declare function normalizeSeller(seller: string): string;
/** On-chain settlement id (x402 payment-response); only these raise stub score. */
export declare function isScoreableTxHash(txHash: string): boolean;
export declare function assertConsultRequest(req: ConsultRequest): void;
export declare function newConsultId(): string;
export declare function newEventId(): string;
export declare function resolveNetwork(network?: string): string;
//# sourceMappingURL=policy.d.ts.map