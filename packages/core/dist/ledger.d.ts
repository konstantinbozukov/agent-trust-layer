import type { AtlLedger, LedgerEvent } from "./types.js";
/** In-memory ledger (tests + ephemeral runs). */
export declare function createMemoryLedger(seed?: LedgerEvent[]): AtlLedger;
/** Append-only JSONL ledger (reference persistence). */
export declare function createJsonlLedger(filePath: string): AtlLedger;
//# sourceMappingURL=ledger.d.ts.map