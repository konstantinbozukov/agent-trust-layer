# agent-trust-layer (npm)

ATL v0.1 reference core: `consult`, `recordSettlement`, JSONL/memory ledger, and **`withAtl()`**.

```bash
npm i agent-trust-layer
```

## Five lines

```js
import { createAtlClient, createMemoryLedger, withAtl } from "agent-trust-layer";

const client = createAtlClient({ ledger: createMemoryLedger() });
const { body } = await withAtl(fetchPaid, "https://signals.edge.report/v1/gas", {
  client, agentId, seller: "https://signals.edge.report", sku: "/v1/gas",
  amountUsd: 0.001, payTo: "0xSellerPayTo",
});
```

- Local consult = no remote RTT before pay  
- Settlement async by default  
- No `X-ATL-Agent-Id` on seller ⇒ **zero ATL work / zero latency**

Repo: https://github.com/konstantinbozukov/agent-trust-layer
