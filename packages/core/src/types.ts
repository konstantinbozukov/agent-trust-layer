/** ATL protocol version for responses. */
export const ATL_PROTOCOL = "atl" as const;
export const ATL_VERSION = "0.1.0" as const;

export type AtlVerdict = "allow" | "caution" | "deny";

export type ConsultRequest = {
  agentId: string;
  seller: string;
  sku: string;
  amountUsd: number;
  network?: string;
};

export type ConsultResponse = {
  verdict: AtlVerdict;
  score: number;
  reasons: string[];
  consultId: string;
  protocol: typeof ATL_PROTOCOL;
  version: typeof ATL_VERSION;
};

export type SettlementRequest = {
  consultId: string;
  agentId: string;
  payer: string;
  payTo: string;
  amountUsd: number;
  txHash: string;
  sku: string;
  seller?: string;
  network?: string;
};

export type AgentSnapshot = {
  agentId: string;
  settlementCount: number;
  score: number;
};

export type SettlementResponse = {
  eventId: string;
  agent: AgentSnapshot;
  protocol: typeof ATL_PROTOCOL;
  version: typeof ATL_VERSION;
};

export type LedgerEvent = {
  type: "settlement";
  eventId: string;
  consultId: string;
  agentId: string;
  payer: string;
  payTo: string;
  amountUsd: number;
  txHash: string;
  sku: string;
  seller?: string;
  network: string;
  at: string;
};

export type AtlLedger = {
  countSettlements(agentId: string): Promise<number>;
  appendSettlement(event: LedgerEvent): Promise<void>;
  listSettlements(agentId?: string): Promise<LedgerEvent[]>;
};

export const DEFAULT_NETWORK = "eip155:8453";
