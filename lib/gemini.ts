/**
 * Talks to Gemini. We send the whole conversation plus the system prompt, and get the
 * answer back in small pieces (server-sent events) so it can type out on screen.
 * Fine to treat as a black box in the session, the interesting bit is the prompt.
 */

// gemini-2.5-flash is closed to new keys now, so we use 3.8. If you run out of free requests
// for the day, you can try another model by setting GEMINI_MODEL in .env.local
// (the daily limit is per model), e.g. GEMINI_MODEL=gemini-3.5-flash
const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const GEMINI_STREAM_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent`;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function* streamChat(
  messages: ChatMessage[],
  systemPrompt: string,
  apiKey: string
): AsyncGenerator<string> {
  const response = await fetch(`${GEMINI_STREAM_URL}?alt=sse`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      // Gemini calls the assistant role "model"
      contents: messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      generationConfig: {
        temperature: 0.3, // keep it low, we want it sticking to the facts not being creative
        maxOutputTokens: 2048, // newer models think a bit first and that counts here too, so leave room
        thinkingConfig: { thinkingBudget: 0 }, // asks it to skip "thinking" so the first words show up quicker
      },
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Gemini API error ${response.status}: ${await response.text()}`);
  }

  // a chunk from the network can end mid-line, so hold on to the leftover bit
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const parsed = JSON.parse(line.slice(6));
        const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) yield text;
      } catch {
        // half a JSON line, ignore it
      }
    }
  }
}
