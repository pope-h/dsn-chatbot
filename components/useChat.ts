"use client";

import { useState, useCallback } from "react";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || loading) return;

      const history: Message[] = [...messages, { role: "user", content }];
      // empty assistant bubble first, we fill it in as the answer arrives
      setMessages([...history, { role: "assistant", content: "" }]);
      setLoading(true);

      const setAssistant = (text: string) =>
        setMessages((prev) => [...prev.slice(0, -1), { role: "assistant", content: text }]);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history }),
        });

        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? "Something went wrong.");
        }

        // TODO (step 2): make the answer type out word by word.
        //
        // Right now we wait for the whole reply and show it in one go, which feels slow.
        // The server is already streaming, we just aren't reading it as it comes. Replace
        // the two lines below with a loop that:
        //
        //  1. gets a reader:    const reader = res.body.getReader();
        //  2. makes a decoder:  const decoder = new TextDecoder();
        //  3. keeps reading until `done` is true:  const { done, value } = await reader.read();
        //  4. adds each piece onto the reply so far, then calls setAssistant(reply)
        //
        // Hint: decoder.decode(value, { stream: true }) turns the bytes into text.
        const reply = await res.text();
        setAssistant(reply);
      } catch (err) {
        setAssistant(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    },
    [messages, loading]
  );

  const reset = useCallback(() => setMessages([]), []);

  return { messages, loading, send, reset };
}
