"use client";

import { useState, useRef, useEffect, FormEvent, KeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useChat } from "./useChat";
import { ThemeToggle } from "./ThemeToggle";
import { parseReply } from "@/lib/reply";

const SUGGESTIONS = [
  { title: "DSN Abuja", prompt: "What is DSN Abuja and what does it do?" },
  { title: "Join", prompt: "How do I join the DSN community in Abuja?" },
  { title: "Bootcamp", prompt: "Tell me about the DSN AI Bootcamp 2026" },
  { title: "Data science", prompt: "What is data science, and how do I start learning it?" },
];

const MAX_CHARS = 1000;

// only autofocus on laptops, on a phone it throws the keyboard up over everything
const focusInput = (el: HTMLTextAreaElement | null) => {
  if (el && window.matchMedia("(pointer: fine)").matches) el.focus();
};

export function Chat() {
  const { messages, loading, send, retry, stop, reset, rate } = useChat();
  const [input, setInput] = useState("");
  const [atBottom, setAtBottom] = useState(true);
  const [announcement, setAnnouncement] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottom = useRef(true);
  const wasLoading = useRef(false);

  useEffect(() => focusInput(inputRef.current), []);

  // keep scrolling down as the reply streams, unless they scrolled up to read
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // for screen readers: read the reply out once it is finished, not word by word
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (wasLoading.current && !loading && last?.role === "assistant") {
      setAnnouncement(last.error ? last.content : parseReply(last.content).text);
    }
    wasLoading.current = loading;
  }, [loading, messages]);

  // make the textarea taller as they type (CSS caps it)
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [input]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    stickToBottom.current = near;
    setAtBottom(near);
  }

  function scrollToBottom() {
    const el = scrollRef.current;
    stickToBottom.current = true;
    el?.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }

  function ask(text: string) {
    if (!text.trim() || loading) return;
    stickToBottom.current = true;
    send(text);
    setInput("");
    focusInput(inputRef.current);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) stop();
    else ask(input);
  }

  // Enter sends, Shift+Enter is a new line
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      ask(input);
    }
  }

  function newChat() {
    reset();
    setInput("");
    focusInput(inputRef.current);
  }

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <Logo />
          <div>
            <h1>DSN Abuja Assistant</h1>
            <p>DSN Abuja and data science, answered</p>
          </div>
        </div>
        <div className="header-actions">
          {messages.length > 0 && (
            <button className="ghost" onClick={newChat}>
              <PlusIcon /> <span className="label">New chat</span>
            </button>
          )}
          <ThemeToggle />
        </div>
      </header>

      <div className="messages" ref={scrollRef} onScroll={onScroll}>
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

          {messages.map((m, i) => {
            const isLast = i === messages.length - 1;
            const streaming = loading && isLast;

            if (m.role === "user") {
              return (
                <div key={i} className="row user">
                  <div className="bubble">{m.content}</div>
                </div>
              );
            }

            const reply = parseReply(m.content);
            const done = !m.error && reply.text && !streaming;

            return (
              <div key={i} className="row assistant">
                <div className="avatar" aria-hidden>DSN</div>
                <div className="body">
                  {m.error ? (
                    <div className="error">
                      {m.content}
                      {isLast && !loading && (
                        <button className="ghost small" onClick={retry}>
                          Try again
                        </button>
                      )}
                    </div>
                  ) : reply.text ? (
                    <div className="markdown">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a: (props) => <a {...props} target="_blank" rel="noopener noreferrer" />,
                        }}
                      >
                        {reply.text}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <Typing />
                  )}

                  {done && reply.sources.length > 0 && (
                    <div className="sources">
                      <span>From the knowledge base:</span>
                      {reply.sources.map((s) => (
                        <span key={s} className="source">{s}</span>
                      ))}
                    </div>
                  )}

                  {done && (
                    <div className="actions">
                      <CopyButton text={reply.text} />
                      <button
                        className={`icon-btn${m.rating === "up" ? " active" : ""}`}
                        onClick={() => rate(i, "up")}
                        aria-label="Good answer"
                        aria-pressed={m.rating === "up"}
                        title="Good answer"
                      >
                        <ThumbIcon />
                      </button>
                      <button
                        className={`icon-btn down${m.rating === "down" ? " active" : ""}`}
                        onClick={() => rate(i, "down")}
                        aria-label="Bad answer"
                        aria-pressed={m.rating === "down"}
                        title="Bad answer"
                      >
                        <ThumbIcon />
                      </button>
                    </div>
                  )}

                  {done && isLast && reply.followups.length > 0 && (
                    <div className="followups">
                      {reply.followups.map((q) => (
                        <button key={q} className="followup" onClick={() => ask(q)}>
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <form className="composer" onSubmit={onSubmit}>
        {!atBottom && messages.length > 0 && (
          <button type="button" className="jump" onClick={scrollToBottom}>
            <ArrowDownIcon /> Latest
          </button>
        )}
        <div className="composer-box">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask about DSN Abuja, the bootcamp, or data science…"
            aria-label="Message"
            maxLength={MAX_CHARS}
            rows={1}
          />
          <button
            type="submit"
            className={loading ? "send stop" : "send"}
            disabled={!loading && !input.trim()}
            aria-label={loading ? "Stop generating" : "Send message"}
          >
            {loading ? <StopIcon /> : <SendIcon />}
          </button>
        </div>
        <p className="hint">
          {input.length > MAX_CHARS * 0.8 ? (
            <span className={input.length >= MAX_CHARS ? "count full" : "count"}>
              {input.length} / {MAX_CHARS} characters
            </span>
          ) : (
            <>
              Answers can be incomplete or out of date. Confirm details at{" "}
              <a href="https://www.datasciencenigeria.org" target="_blank" rel="noopener noreferrer">
                datasciencenigeria.org
              </a>
              .
            </>
          )}
        </p>
      </form>

      <div className="sr-only" aria-live="polite">
        {announcement}
      </div>
    </div>
  );
}

function Logo({ large = false }: { large?: boolean }) {
  return (
    <div className={large ? "logo large" : "logo"} aria-label="DSN Abuja" role="img">
      DSN<span>Abuja</span>
    </div>
  );
}

function Typing() {
  return (
    <div className="typing" aria-label="Assistant is typing">
      <span />
      <span />
      <span />
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard only works on https/localhost, nothing to do otherwise
    }
  }

  return (
    <button className="icon-btn" onClick={copy} aria-label="Copy answer" title="Copy answer">
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  );
}

const svgProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const SendIcon = () => (
  <svg width="18" height="18" {...svgProps} strokeWidth={2.2}>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);

const StopIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <rect x="5" y="5" width="14" height="14" rx="2" />
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" {...svgProps} strokeWidth={2.2}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const ArrowDownIcon = () => (
  <svg width="14" height="14" {...svgProps} strokeWidth={2.2}>
    <path d="M12 5v14M5 12l7 7 7-7" />
  </svg>
);

const CopyIcon = () => (
  <svg width="15" height="15" {...svgProps}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </svg>
);

const CheckIcon = () => (
  <svg width="15" height="15" {...svgProps}>
    <path d="M5 12l5 5L20 7" />
  </svg>
);

const ThumbIcon = () => (
  <svg width="15" height="15" {...svgProps}>
    <path d="M7 10v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h3zm0 0l4-8a3 3 0 0 1 3 3v4h5.5a2 2 0 0 1 2 2.3l-1.4 8a2 2 0 0 1-2 1.7H7" />
  </svg>
);
