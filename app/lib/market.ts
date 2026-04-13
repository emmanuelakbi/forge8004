export type Kline = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string,
];

export type ParsedCandle = {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
};

export type SupportResistance = {
  support: number | null;
  resistance: number | null;
};

export function computeRSI(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  const recent = closes.slice(-(period + 1));
  let gains = 0,
    losses = 0;
  for (let i = 1; i < recent.length; i++) {
    const diff = recent[i] - recent[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round((100 - 100 / (1 + rs)) * 10) / 10;
}

export function parseKlines(raw: Kline[]): ParsedCandle[] {
  return raw.map((k) => ({
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
    closeTime: k[6],
  }));
}

export function computeSupportResistance(
  candles: ParsedCandle[],
): SupportResistance {
  if (candles.length < 3) return { support: null, resistance: null };
  return {
    support: Math.min(...candles.map((c) => c.low)),
    resistance: Math.max(...candles.map((c) => c.high)),
  };
}

export async function fetchBinance(
  url: string,
  timeoutMs = 15000,
): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`Binance ${response.status}`);
    return response.json();
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}
