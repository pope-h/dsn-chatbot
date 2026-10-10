# DSN Chatbot

A small chatbot that answers questions about Data Science Nigeria. Built with Next.js and
Gemini, and made for a hands-on workshop.

The idea: the bot doesn't answer from memory. It gets a text file about DSN
(`data/dsn.md`) and is told to only use that. If the answer isn't in the file, it says so
instead of making something up.

## Coming for the workshop?

You want the **`workshop-starter`** branch, not this one. This is the finished version, so
no peeking until we get there. Follow `WORKSHOP.md` on that branch to get set up.

```bash
git checkout workshop-starter
```

## Running this version

You need Node 18.17 or newer and a free Gemini key from https://aistudio.google.com/apikey.

```bash
npm install
cp .env.example .env.local     # then paste your key into .env.local
npm run dev                    # http://localhost:3000
```

## Where things are

| | |
|---|---|
| `data/dsn.md` | what the bot knows |
| `app/api/chat/route.ts` | the system prompt (this is where the grounding happens) |
| `lib/gemini.ts` | the call to Gemini |
| `components/useChat.ts` | sends messages and reads the streamed reply |
| `components/Chat.tsx` | the chat screen |

This version also has a few extras the workshop one doesn't: source tags under answers,
follow-up suggestions, thumbs up/down (saved to `data/feedback.jsonl`), a theme toggle and
chat history that survives a refresh.

The knowledge base was put together from public news and reports, so some of it may be out
of date. Check datasciencenigeria.org for anything important.
