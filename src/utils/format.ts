export function formatCurrency(value?: number) {
  if (value === undefined || value === null) return "—";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

const STRATEGY_DISPLAY_NAMES: Record<string, string> = {
  arbitrage: "Low-Volatility Scalp",
  yield: "Patient Accumulation",
  market_making: "Spread Trading",
  spot_grid_bot: "Grid Trading",
};

export function formatEnumLabel(value?: string) {
  if (!value) return "—";
  if (STRATEGY_DISPLAY_NAMES[value]) return STRATEGY_DISPLAY_NAMES[value];
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function truncateHex(value?: string) {
  if (!value || value.length < 10) return value ?? "—";
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}
