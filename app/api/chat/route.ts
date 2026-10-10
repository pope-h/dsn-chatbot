/**
 * POST /api/chat
 * Takes the whole conversation, streams the reply back as plain text.
 *
 * This is the file to spend the most time on in the workshop. The system prompt below
 * is where "grounding" happens: we paste data/dsn.md in and tell the model to stick
 * to it, instead of letting it guess.
 */

import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { streamChat, type ChatMessage } from "@/lib/gemini";
import { ERROR_MARKER } from "@/lib/reply";

const MAX_MESSAGES = 20;
const MAX_CHARS = 1000;

async function buildSystemPrompt(): Promise<string> {
  const knowledge = await readFile(path.join(process.cwd(), "data", "dsn.md"), "utf8");
  return `You are the friendly assistant for DSN Abuja, the Abuja community of Data Science
Nigeria (DSN). You help people learn about DSN, its communities and programmes, and data science.

There are two kinds of question, and they follow different rules.

1. Questions about DSN, DSN Abuja, its communities, programmes, bootcamp, people, dates,
   fees, contacts or links: answer using ONLY the knowledge base below.
   - If the answer isn't there, say you don't have that information and suggest
     datasciencenigeria.org or the relevant contact. Never invent facts, names, dates, fees
     or links about DSN.
   - Mention when information is marked dated or unverified.
2. Questions about data science, machine learning, AI, statistics, Python, tools, careers or
   learning paths: start from the knowledge base, and you may also use your own general
   knowledge to explain properly and go deeper. Keep it accurate and beginner friendly, with a
   small example where it helps. Don't present guesses as facts, and say when something is
   uncertain or changes quickly (tool versions, job market, prices).

Keep answers short, clear and welcoming. Use bullet points for lists. If asked something
unrelated to DSN or data science, politely steer back to those topics.

End EVERY reply with these two lines, exactly in this format (the app turns them into buttons):
  [[sources: <section heading> | <section heading>]]
  [[followups: <question> | <question> | <question>]]
"sources" lists the section headings (the "## ..." lines) your facts came from. Write "none"
if none of your answer came from the knowledge base (for example, a general data science
explanation), and never list the "Not known" section.
"followups" gives 2-3 short questions the user might ask next.

KNOWLEDGE BASE:
${knowledge}`;
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
    return NextResponse.json({ error: "GEMINI_API_KEY is not set." }, { status: 500 });
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
        controller.enqueue(encoder.encode(ERROR_MARKER)); // UI picks this up and shows "Try again"
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
  });
}
