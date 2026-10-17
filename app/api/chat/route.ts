/**
 * POST /api/chat
 * Takes the whole conversation, streams the reply back as plain text.
 *
 * STEP 1 of the workshop happens in this file (look for the TODO below).
 */

import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { streamChat, type ChatMessage } from "@/lib/gemini";

const MAX_MESSAGES = 20;
const MAX_CHARS = 1000;

async function buildSystemPrompt(): Promise<string> {
  // This reads data/dsn.md, the file with everything we know about DSN
  const knowledge = await readFile(path.join(process.cwd(), "data", "dsn.md"), "utf8");

  // TODO (step 1): write the system prompt.
  //
  // Right now the bot has no idea about DSN Abuja and will just wing it. Try asking it
  // "Who is the lead of DSN Abuja?" and see what it makes up. Then fix it:
  //
  //  1. Tell it who it is (the friendly assistant for DSN Abuja)
  //  2. Tell it to answer ONLY from the knowledge base
  //  3. Tell it what to do when the answer isn't there (say so, never invent names or dates)
  //  4. Keep it on topic (DSN and data science only) and keep answers short
  //  5. Paste `knowledge` in at the bottom, after a "KNOWLEDGE BASE:" label
  //
  // Hint: it's one template string, and you can drop `knowledge` into it with ${knowledge}
  return `You are a helpful assistant.`;
}

export async function POST(request: NextRequest) {
  let messages: ChatMessage[];
  try {
    const body = await request.json();
    messages = body.messages;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const valid =
    Array.isArray(messages) &&
    messages.length > 0 &&
    messages[messages.length - 1].role === "user" &&
    messages.every(
      (m) =>
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0
    );
  if (!valid) {
    return NextResponse.json({ error: "Invalid messages." }, { status: 400 });
  }

  const trimmed = messages
    .slice(-MAX_MESSAGES)
    .map((m) => ({ ...m, content: m.content.slice(0, MAX_CHARS) }));
  // Gemini errors out if the history starts with an assistant message, so trim those
  while (trimmed.length && trimmed[0].role !== "user") trimmed.shift();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not set. Check your .env.local file." },
      { status: 500 }
    );
  }

  const systemPrompt = await buildSystemPrompt();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamChat(trimmed, systemPrompt, apiKey)) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        console.error("[chat]", err);
        controller.enqueue(encoder.encode("\n\n[Sorry, something went wrong. Please try again.]"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
  });
}
