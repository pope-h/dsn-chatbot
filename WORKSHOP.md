# Build your own AI chatbot

By the end of the session you'll have a chatbot running on your laptop that answers
questions about an organisation using only the facts you give it, and you'll know how to
point it at a topic of your own.

## Before the session (please do this at home)

Setup eats a surprising amount of workshop time, so let's get it out of the way.

1. **Node.js 18.17 or newer.** Run `node -v` to check. If it's older, install the LTS
   version from https://nodejs.org
2. **Clone the repo and switch to the starter branch**
   ```bash
   git clone <repo-url>
   cd dsn-chatbot
   git checkout workshop-starter
   npm install
   ```
3. **Get a free Gemini API key** at https://aistudio.google.com/apikey (you need a Google
   account, it takes a minute and no card).
4. **Add your key**
   ```bash
   cp .env.example .env.local
   ```
   Then open `.env.local` and paste your key after `GEMINI_API_KEY=`.
5. **Check it works.** Run `npm run dev`, open http://localhost:3000 and click one of the
   suggestion buttons. You should get a reply.

Stuck on any of this? Message me before the day and we'll sort it out.

Please don't share your API key or commit `.env.local`. It's already in `.gitignore`, so
you'd have to go out of your way to do it.

## What we'll do

There are three steps. The app works at every stage, it just gets better.

### Step 1: ground the bot (`app/api/chat/route.ts`)

Ask the bot "When was DSN founded?" right now. It will confidently give you an answer, and
it's probably wrong. The bot knows nothing about DSN, it's just guessing.

Find the `TODO (step 1)` and write the system prompt. Once the bot is told to answer only
from `data/dsn.md`, ask the same question again. It should now admit it doesn't know.

### Step 2: stream the answer (`components/useChat.ts`)

The reply currently pops up all at once after a pause. Find the `TODO (step 2)` and read
the response as it arrives, so the words appear as they're written.

### Step 3: make it yours

- Replace `data/dsn.md` with facts about something you care about (your company, your
  school, a club, a recipe collection...).
- Update the name and suggestion buttons in `components/Chat.tsx`.
- Tweak the system prompt tone. Make it formal, funny, or very short.

## If you finish early

The finished version lives on the `main` branch and has a few extras: source tags under
each answer, suggested follow-up questions, thumbs up/down, a dark mode toggle and a Stop
button. Have a look at `lib/reply.ts` on `main` to see how the source tags work, and try
adding one of them to your own version.

## Things that commonly go wrong

| What you see | What it usually is |
|---|---|
| `GEMINI_API_KEY is not set` | `.env.local` is missing or has the wrong name. Restart `npm run dev` after editing it. |
| `Gemini API error 503` | Google's side is busy. Wait a few seconds and ask again. |
| `Gemini API error 429` | You've hit the free limit. Wait a minute. |
| `Gemini API error 400` or `403` | The key is wrong or was copied with a space on the end. |
| Changed `dsn.md` but the bot hasn't noticed | Send a fresh message, it's re-read on every request. If it still hasn't, restart the dev server. |
| Port 3000 is already in use | `npm run dev -- -p 3001` |
