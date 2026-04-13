import { test } from "vitest";
import { createSpotGridRuntime, performInitialMarketBuy } from "../../src/services/gridBotService";

test("debug grid levels", () => {
  const md = {
    btc: { price: 65000, change24h: 1.5 },
    eth: { price: 2500, change24h: -0.5 },
    timestamp: 1000000,
  };

  const rt = createSpotGridRuntime({
    agentId: "a",
    marketData: md,
    capitalReserved: 6000,
    overrides: { rangeLow: 60000, rangeHigh: 70000, gridLevels: 6 },
    timestamp: 1000,
  });

  console.log("Levels:");
  for (const l of rt.levels) {
    console.log("  " + l.id + " " + l.side + " price=" + l.price + " status=" + l.status + " paired=" + l.pairedLevelId + " quoteAlloc=" + l.quoteAllocated);
  }

  const sellsAbove = rt.levels.filter(l => l.side === "SELL" && l.status === "closed" && l.price > 65000);
  console.log("Sells above 65000:", sellsAbove.length);
  for (const s of sellsAbove) {
    const paired = rt.levels.find(l => l.id === s.pairedLevelId);
    console.log("  " + s.id + " price=" + s.price + " paired=" + s.pairedLevelId + " pairedFound=" + !!paired);
  }

  const result = performInitialMarketBuy(rt, 65000, 2000);
  console.log("Armed sells:", result.armedSells.length);
  console.log("Filled buys:", result.filledBuys.length);
});
