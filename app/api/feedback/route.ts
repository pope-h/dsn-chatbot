/**
 * POST /api/feedback
 * Logs thumbs up/down to data/feedback.jsonl. The thumbs-down ones are useful, they
 * point at what's missing from dsn.md.
 * (On Vercel and similar you can't write files, so you only get the console log there.)
 */

import { NextRequest, NextResponse } from "next/server";
import { appendFile } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const valid =
    body &&
    (body.rating === "up" || body.rating === "down") &&
    typeof body.question === "string" &&
    typeof body.answer === "string";
  if (!valid) {
    return NextResponse.json({ error: "Invalid feedback." }, { status: 400 });
  }

  const entry = {
    at: new Date().toISOString(),
    rating: body.rating,
    question: body.question.slice(0, 1000),
    answer: body.answer.slice(0, 4000),
  };
  console.log("[feedback]", entry.rating, JSON.stringify(entry.question));

  try {
    await appendFile(path.join(process.cwd(), "data", "feedback.jsonl"), JSON.stringify(entry) + "\n");
  } catch (err) {
    console.error("[feedback] could not write file", err);
  }

  return NextResponse.json({ ok: true });
}
