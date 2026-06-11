import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 5;

const startTime = Date.now();

// Supports both GET (UptimeRobot default) and HEAD (lightweight ping)
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "sales-memory-agent",
      uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}

export async function HEAD(_req: NextRequest) {
  // HEAD must return same headers as GET but no body
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "X-Service": "sales-memory-agent",
      "X-Status": "ok",
    },
  });
}
