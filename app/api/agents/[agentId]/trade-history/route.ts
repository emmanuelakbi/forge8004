import { NextResponse } from "next/server";

const DEPRECATED_RESPONSE = {
  error: "AGENT_ROUTE_DEPRECATED",
  message:
    "This demo agent route has been retired. The app now reads agent data directly from the authenticated Firestore workspace.",
};

export async function GET() {
  return NextResponse.json(DEPRECATED_RESPONSE, { status: 410 });
}
