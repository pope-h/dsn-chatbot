"use client";

import { useState, useRef, useEffect, FormEvent, KeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useChat } from "./useChat";

// TODO (step 3, customise): swap these for questions about your own topic
const SUGGESTIONS = [
  { title: "About DSN", prompt: "What is Data Science Nigeria?" },
  { title: "Programmes", prompt: "What programmes does DSN run?" },
  { title: "AI Bootcamp", prompt: "How do I get into the AI Bootcamp?" },
  { title: "For kids", prompt: "Does DSN have programmes for kids?" },
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
          <div className="logo" aria-hidden>DSN</div>
          <div>
            {/* TODO (step 3, customise): your own name here */}
            <h1>DSN Assistant</h1>
            <p>Data Science Nigeria, answered</p>
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
              <div className="logo large" aria-hidden>DSN</div>
              <h2>Ask anything about Data Science Nigeria</h2>
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
            placeholder="Ask about DSN programmes, bootcamps, contacts…"
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
