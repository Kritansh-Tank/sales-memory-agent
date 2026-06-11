import { NextRequest, NextResponse } from "next/server";
import { getMemoryClient, DEMO_ACCOUNTS } from "@/lib/xtrace";

export const runtime = "nodejs";
export const maxDuration = 30; // allow up to 30s for seed + retry logic (Vercel Pro: up to 300s)

// GET: list all memories for an account, scoped by user_id=accountId
export async function GET(req: NextRequest) {
  const accountId = req.nextUrl.searchParams.get("accountId");
  if (!accountId) {
    return NextResponse.json({ error: "accountId is required" }, { status: 400 });
  }

  const client = getMemoryClient();
  const memories: { id: string; text: string; created_at?: string }[] = [];

  try {
    // Scope by user_id=accountId — no group registration needed.
    // XTrace's group_ids require pre-registration via client.groups.create();
    // unknown ids are silently dropped, so we use user_id as the account namespace.
    let results = await client.memories.search({
      query: "account deal stakeholder information facts",
      user_id: accountId,
      limit: 50,
    });

    // If empty, wait 4s and retry once (async extraction may still be in progress)
    if ((results.data ?? []).length === 0) {
      await new Promise((r) => setTimeout(r, 4000));
      results = await client.memories.search({
        query: "account deal stakeholder information facts",
        user_id: accountId,
        limit: 50,
      });
    }

    for (const m of results.data ?? []) {
      memories.push({ id: m.id, text: m.text, created_at: m.created_at });
    }

    return NextResponse.json({ memories });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: ingest a note for an account
export async function POST(req: Request) {
  const { accountId, note, repId } = await req.json();
  if (!accountId || !note) {
    return NextResponse.json({ error: "accountId and note are required" }, { status: 400 });
  }

  const client = getMemoryClient();

  try {
    const job = await client.memories.ingest(
      {
        messages: [{ role: "user", content: note }],
        user_id: accountId,   // scope to account namespace
        conv_id: `ingest_${repId || "rep"}_${Date.now()}`,
      },
      { wait: true }
    );

    // memories_created from XTrace is an array of created memory objects
    const raw = job.result?.memories_created;
    const memoriesCreated = Array.isArray(raw) ? raw.length : (typeof raw === "number" ? raw : 0);

    return NextResponse.json({ success: true, memoriesCreated, status: job.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT: seed demo data for an account (parallel async ingestion — fast)
export async function PUT(req: Request) {
  const { accountId } = await req.json();
  const account = DEMO_ACCOUNTS.find((a) => a.id === accountId);
  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const client = getMemoryClient();

  // Fire all ingests in parallel, scoped by user_id=accountId
  await Promise.all(
    account.seedData.map((note, i) =>
      client.memories
        .ingest({
          messages: [{ role: "user", content: note }],
          user_id: accountId,   // account namespace (no group registration needed)
          conv_id: `seed_${accountId}_${i}_${Date.now()}`,
        })
        .catch(() => null)
    )
  );

  // Give XTrace ~8 seconds to extract in the background before we return
  // (free tier extraction can take 5-8s per batch)
  await new Promise((r) => setTimeout(r, 8000));

  return NextResponse.json({ success: true, totalCreated: account.seedData.length });
}

// DELETE: delete a specific memory
export async function DELETE(req: Request) {
  const { memoryId } = await req.json();
  if (!memoryId) {
    return NextResponse.json({ error: "memoryId is required" }, { status: 400 });
  }

  const client = getMemoryClient();
  try {
    await client.memories.delete(memoryId);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
