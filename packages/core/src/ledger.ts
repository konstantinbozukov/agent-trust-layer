import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import type { AtlLedger, LedgerEvent } from "./types.js";
import { normalizeAgentId } from "./policy.js";

/** In-memory ledger (tests + ephemeral runs). */
export function createMemoryLedger(
  seed: LedgerEvent[] = []
): AtlLedger {
  const events: LedgerEvent[] = [...seed];
  return {
    async countSettlements(agentId: string) {
      const id = normalizeAgentId(agentId);
      return events.filter((e) => e.agentId === id).length;
    },
    async appendSettlement(event: LedgerEvent) {
      events.push({
        ...event,
        agentId: normalizeAgentId(event.agentId),
      });
    },
    async listSettlements(agentId?: string) {
      if (!agentId) return [...events];
      const id = normalizeAgentId(agentId);
      return events.filter((e) => e.agentId === id);
    },
  };
}

/** Append-only JSONL ledger (reference persistence). */
export function createJsonlLedger(filePath: string): AtlLedger {
  mkdirSync(dirname(filePath), { recursive: true });

  function load(): LedgerEvent[] {
    if (!existsSync(filePath)) return [];
    const text = readFileSync(filePath, "utf8").trim();
    if (!text) return [];
    return text
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as LedgerEvent);
  }

  return {
    async countSettlements(agentId: string) {
      const id = normalizeAgentId(agentId);
      return load().filter((e) => e.agentId === id).length;
    },
    async appendSettlement(event: LedgerEvent) {
      const row: LedgerEvent = {
        ...event,
        agentId: normalizeAgentId(event.agentId),
      };
      appendFileSync(filePath, JSON.stringify(row) + "\n", "utf8");
    },
    async listSettlements(agentId?: string) {
      const all = load();
      if (!agentId) return all;
      const id = normalizeAgentId(agentId);
      return all.filter((e) => e.agentId === id);
    },
  };
}
