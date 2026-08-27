import type { AgentSnapshot, AtlLedger, ConsultRequest, ConsultResponse, SettlementRequest, SettlementResponse } from "./types.js";
export type AtlClientOptions = {
    ledger: AtlLedger;
    /** Optional deny list of agentIds */
    denyList?: Set<string> | string[];
};
export declare function scoreFromCount(settlementCount: number): number;
export declare function agentSnapshot(ledger: AtlLedger, agentId: string): Promise<AgentSnapshot>;
export declare function createAtlClient(opts: AtlClientOptions): {
    consult: (req: ConsultRequest) => Promise<ConsultResponse>;
    recordSettlement: (req: SettlementRequest) => Promise<SettlementResponse>;
    agentSnapshot: (id: string) => Promise<AgentSnapshot>;
};
export type AtlClient = ReturnType<typeof createAtlClient>;
//# sourceMappingURL=client.d.ts.map