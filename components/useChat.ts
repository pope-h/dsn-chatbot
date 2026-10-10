"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ERROR_MARKER, parseReply } from "@/lib/reply";

export interface Message {
  role: "user" | "assistant";
  content: string;
  error?: boolean; // failed/stopped replies get shown but we never send them back to Gemini
  rating?: "up" | "down";
}

const STORAGE_KEY = "dsn-chat";

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [restored, setRestored] = useState(false);

  // bring back the last chat after a refresh
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
      if (Array.isArray(saved)) setMessages(saved);
    } catch {
      // private mode or junk in storage, just start fresh
    }
    setRestored(true);
  }, []);

  // only save when a reply is done, not on every token
  useEffect(() => {
    if (!restored || loading) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // can't save, no big deal, chat still works
    }
  }, [messages, loading, restored]);

  // add the question to the chat and stream the answer in
  const run = useCallback(async (base: Message[], content: string) => {
    const history: Message[] = [...base, { role: "user", content }];
    // empty assistant bubble first, we fill it in as words arrive
    setMessages([...history, { role: "assistant", content: "" }]);
    setLoading(true);

    const setAssistant = (text: string, error = false) =>
      setMessages((prev) => [...prev.slice(0, -1), { role: "assistant", content: text, error }]);

    const controller = new AbortController();
    abortRef.current = controller;
    let reply = "";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.filter((m) => !m.error).map(({ role, content }) => ({ role, content })),
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Something went wrong.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        reply += decoder.decode(value, { stream: true });
        if (reply.includes(ERROR_MARKER)) throw new Error("The reply was interrupted. Please try again.");
        setAssistant(reply);
      }
    } catch (err) {
      if (controller.signal.aborted) {
        // they hit Stop, keep whatever came through so far
        if (!reply) setAssistant("Stopped.", true);
      } else {
        setAssistant(err instanceof Error ? err.message : "Something went wrong.", true);
      }
    } finally {
      abortRef.current = null;
      setLoading(false);
    }
  }, []);

  const send = useCallback(
    (text: string) => {
      const content = text.trim();
      if (!content || loading) return;
      run(messages, content);
    },
    [messages, loading, run]
  );

  // ask the last question again
  const retry = useCallback(() => {
    if (loading) return;
    const lastUser = messages.findLastIndex((m) => m.role === "user");
    if (lastUser === -1) return;
    run(messages.slice(0, lastUser), messages[lastUser].content);
  }, [messages, loading, run]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
  }, []);

  // thumbs up/down: mark it in the UI and tell the server
  const rate = useCallback(
    (index: number, rating: "up" | "down") => {
      const answer = messages[index];
      if (!answer || answer.rating === rating) return;
      const question = messages.slice(0, index).findLast((m) => m.role === "user");

      setMessages((prev) => prev.map((m, i) => (i === index ? { ...m, rating } : m)));
      fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          question: question?.content ?? "",
          answer: parseReply(answer.content).text,
        }),
      }).catch(() => {
        // not worth bothering the user if this fails
      });
    },
    [messages]
  );

  return { messages, loading, send, retry, stop, reset, rate };
}
