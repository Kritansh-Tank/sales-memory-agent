import { streamText, convertToModelMessages, UIMessage } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { getMemoryClient } from "@/lib/xtrace";

export const runtime = "nodejs";
export const maxDuration = 60;

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY! });

export async function POST(req: Request) {
  const body = await req.json();
  const messages: UIMessage[] = Array.isArray(body.messages) ? body.messages : [];
  const accountId: string = body.accountId ?? "";
  const accountName: string = body.accountName ?? "Unknown Account";

  if (messages.length === 0) {
    return new Response("No messages", { status: 400 });
  }

  // Extract the user's latest question for memory search
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  const searchQuery = lastUserMsg
    ? lastUserMsg.parts.filter((p) => p.type === "text").map((p) => (p as { type: "text"; text: string }).text).join(" ")
    : "account information stakeholders deal status";

  // Search XTrace memory BEFORE calling the LLM (RAG pattern)
  const client = getMemoryClient();
  let memoryContext = "No relevant account memories found.";
  try {
    const results = await client.memories.search({
      query: searchQuery,
      user_id: accountId,
      limit: 8,
    });
    if (results.data?.length) {
      memoryContext = results.data.map((m) => `• ${m.text}`).join("\n");
    }
  } catch (err) {
    console.error("[chat] Memory search error:", err);
  }

  const systemPrompt = `You are an elite B2B Sales Intelligence Assistant for the account "${accountName}".

The following facts have been retrieved from the team's accumulated account memory:

${memoryContext}

Instructions:
- Answer the user's question using ONLY the memory facts above.
- Be concise and direct. Use bullet points for multiple items.
- If the memory doesn't contain relevant info, say so clearly.
- Never make up information not present in the memory.`;

  const result = streamText({
    model: groq("llama-3.3-70b-versatile"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({
    onError: (error) => {
      if (error instanceof Error) return error.message;
      return "An error occurred";
    },
  });
}
