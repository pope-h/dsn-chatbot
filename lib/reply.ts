/**
 * Stretch goal material, not for the main session.
 *
 * The system prompt asks the model to finish every answer with two little tags:
 *   [[sources: Programmes and platforms | AI Bootcamp history]]
 *   [[followups: How do I apply? | Is it free?]]
 * We pull those out here and show them as buttons instead of plain text.
 * ERROR_MARKER is what the server tacks on if Gemini dies halfway through a reply.
 */

export const ERROR_MARKER = "\u0000[[error]]";

export interface ParsedReply {
  text: string; // the answer without the tags
  sources: string[]; // which parts of dsn.md it says it used
  followups: string[]; // questions the user might ask next
}

export function parseReply(raw: string): ParsedReply {
  // Anything after the first "[[" is a tag. Cutting there also means a half-streamed
  // tag never shows up on screen while the reply is still coming in.
  const start = raw.indexOf("[[");
  const text = (start === -1 ? raw : raw.slice(0, start)).trimEnd();

  const tag = (name: string) => {
    const match = raw.match(new RegExp(`\\[\\[${name}:([^\\]]*)\\]\\]`, "i"));
    if (!match) return [];
    return match[1]
      .split("|")
      .map((s) => s.trim().replace(/\s*\(.*\)$/, "")) // sometimes the model adds "(…)" after a heading, drop it
      .filter((s) => s && s.toLowerCase() !== "none" && !/^not known/i.test(s)); // "I don't know" isn't a source
  };

  return { text, sources: tag("sources"), followups: tag("followups").slice(0, 3) };
}
