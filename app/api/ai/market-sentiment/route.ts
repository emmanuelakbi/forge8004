import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getRateLimitHeaders } from "@/app/lib/rate-limiter";
import { getGroqClient } from "@/app/lib/groq-client";
import { validateSentimentBody } from "@/app/lib/validators";
import { cleanAiJsonResponse } from "@/app/lib/ai-helpers";
import { AI_MODEL } from "@/app/lib/constants";

export async function POST(request: NextRequest) {
  const rateLimitResponse = checkRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const validationError = validateSentimentBody(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const groq = getGroqClient();
  if (!groq) {
    return NextResponse.json(
      { error: "GROQ_API_KEY_MISSING" },
      { status: 500 },
    );
  }

  const { marketData } = body;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are a senior financial analyst. Return a JSON object with a 'sentiment' key containing a detailed 2-3 sentence market analysis including trends and potential outlook.",
        },
        {
          role: "user",
          content: `Analyze the following market data and provide a detailed sentiment analysis in JSON format: BTC ${marketData.btc.price} (${marketData.btc.change24h}% 24h), ETH ${marketData.eth.price} (${marketData.eth.change24h}% 24h).`,
        },
      ],
      model: AI_MODEL,
      response_format: { type: "json_object" },
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) throw new Error("No content from Groq");

    const cleaned = cleanAiJsonResponse(rawContent);
    const result = JSON.parse(cleaned);

    const headers = getRateLimitHeaders(request);
    return NextResponse.json(
      { sentiment: result.sentiment || "Market neutral." },
      { headers },
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
