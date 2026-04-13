import Groq from "groq-sdk";

let cachedClient: Groq | null = null;

export function getGroqClient(): Groq | null {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  if (!cachedClient) {
    cachedClient = new Groq({ apiKey });
  }
  return cachedClient;
}
