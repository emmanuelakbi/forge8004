export function normalizeAiMessage(message?: string): string {
  if (!message) {
    return 'No AI rationale provided.';
  }

  const trimmed = message.trim();
  if (!trimmed) {
    return 'No AI rationale provided.';
  }

  const lower = trimmed.toLowerCase();

  if (lower.includes('groq_api_key_missing')) {
    return 'Groq API key missing. Configure the server environment to resume AI decisions.';
  }

  if (
    lower.includes('model_decommissioned') ||
    lower.includes('no longer supported') ||
    lower.includes('invalid_request_error') ||
    lower.includes('console.groq.com/docs/deprecations') ||
    lower.includes('llama3-70b-8192')
  ) {
    return 'Model endpoint unavailable. Holding position in fail-safe mode and awaiting supported model configuration.';
  }

  if (lower.includes('quota') || lower.includes('rate limit') || lower.includes('429')) {
    return 'AI engine rate-limited. Holding position in safety mode until capacity returns.';
  }

  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
    return 'AI engine returned a malformed payload. Holding position in fail-safe mode.';
  }

  return trimmed;
}
