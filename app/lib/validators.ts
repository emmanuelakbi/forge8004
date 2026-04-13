export function validateTradeCycleBody(body: any): string | null {
  if (!body || typeof body !== "object") return "Invalid request body";
  if (typeof body.strategy !== "string") return "Missing or invalid 'strategy'";
  if (!body.marketData?.btc?.price || !body.marketData?.eth?.price)
    return "Missing marketData with btc and eth price objects";
  return null; // Valid
}

export function validateReassessBody(body: any): string | null {
  if (!body || typeof body !== "object") return "Invalid request body";
  if (!body.position || typeof body.position !== "object")
    return "Missing 'position' object";
  if (!body.position.side || !body.position.asset)
    return "Position must have 'side' and 'asset' fields";
  return null;
}

export function validateSentimentBody(body: any): string | null {
  if (!body || typeof body !== "object") return "Invalid request body";
  if (!body.marketData?.btc?.price || !body.marketData?.btc?.change24h)
    return "Missing marketData.btc with price and change24h";
  if (!body.marketData?.eth?.price || !body.marketData?.eth?.change24h)
    return "Missing marketData.eth with price and change24h";
  return null;
}

export function validateGridAdvisoryBody(body: any): string | null {
  if (!body || typeof body !== "object") return "Invalid request body";
  if (!body.marketData?.btc?.price || !body.marketData?.eth?.price)
    return "Missing marketData with btc and eth price objects";
  return null;
}

export function normalizeRiskProfile(
  riskProfile: any,
): "conservative" | "balanced" | "aggressive" {
  if (riskProfile === "conservative" || riskProfile === "aggressive")
    return riskProfile;
  return "balanced";
}
