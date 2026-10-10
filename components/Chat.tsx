"use client";

import { useState, useRef, useEffect, FormEvent, KeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useChat } from "./useChat";

// TODO (step 3, customise): swap these for questions about your own topic
const SUGGESTIONS = [
  { title: "DSN Abuja", prompt: "What is DSN Abuja and what does it do?" },
  { title: "Join", prompt: "How do I join the DSN community in Abuja?" },
  { title: "Bootcamp", prompt: "Tell me about the DSN AI Bootcamp 2026" },
  { title: "Data science", prompt: "What is data science, and how do I start learning it?" },
];

export function Chat() {
  const { messages, loading, send, reset } = useChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // keep the newest message in view
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function ask(text: string) {
    if (!text.trim() || loading) return;
    send(text);
    setInput("");
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    ask(input);
  }

  // Enter sends, Shift+Enter is a new line
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      ask(input);
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <Logo />
          <div>
            {/* TODO (step 3, customise): your own name here */}
            <h1>DSN Abuja Assistant</h1>
            <p>DSN Abuja and data science, answered</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button className="ghost" onClick={reset}>
            New chat
          </button>
        )}
      </header>

      <div className="messages" ref={scrollRef}>
        <div className="thread">
          {messages.length === 0 && (
            <div className="empty">
              <Logo large />
              <h2>Ask anything about DSN Abuja and data science</h2>
              <p>Answers come from a DSN knowledge base, not the model&apos;s memory.</p>
              <div className="suggestions">
                {SUGGESTIONS.map((s) => (
                  <button key={s.prompt} className="suggestion" onClick={() => ask(s.prompt)}>
                    <span>{s.title}</span>
                    {s.prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="row user">
                <div className="bubble">{m.content}</div>
              </div>
            ) : (
              <div key={i} className="row assistant">
                <div className="avatar" aria-hidden>DSN</div>
                <div className="body">
                  {m.content ? (
                    <div className="markdown">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="typing" aria-label="Assistant is typing">
                      <span />
                      <span />
                      <span />
                    </div>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      </div>

      <form className="composer" onSubmit={onSubmit}>
        <div className="composer-box">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask about DSN Abuja, the bootcamp, or data science…"
            aria-label="Message"
            maxLength={1000}
            rows={1}
          />
          <button type="submit" className="send" disabled={loading || !input.trim()} aria-label="Send message">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        </div>
        <p className="hint">Answers can be incomplete or out of date.</p>
      </form>
    </div>
  );
}

// The name badge in the header. Swap "DSN" and "Abuja" for your own name in step 3.
function Logo({ large = false }: { large?: boolean }) {
  return (
    <div className={large ? "logo large" : "logo"} aria-label="DSN Abuja" role="img">
      DSN<span>Abuja</span>
    </div>
  );
}
