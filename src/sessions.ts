import { homedir } from "os";
import { join } from "path";

export function cwdToProjectDir(cwd: string): string {
  return cwd.replaceAll("/", "-");
}

export interface SessionSummary {
  sessionId: string;
  firstMessage: string;
  timestamp: string;
}

export function parseSessionSummary(
  sessionId: string,
  lines: string[]
): SessionSummary | null {
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.type === "user" && parsed.message?.content) {
        const raw = parsed.message.content;
        const joined = typeof raw === "string"
          ? raw
          : Array.isArray(raw)
            ? raw.map((b: any) => b.text ?? "").join("")
            : String(raw);
        const msg = joined.replaceAll("\n", " ");
        return {
          sessionId,
          firstMessage: msg.length > 50 ? msg.slice(0, 50) + "..." : msg,
          timestamp: parsed.timestamp,
        };
      }
    } catch {
      continue;
    }
  }
  return null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

export async function loadSessionHistory(
  projectDir: string,
  sessionId: string
): Promise<ChatMessage[]> {
  const filePath = join(homedir(), ".claude", "projects", projectDir, `${sessionId}.jsonl`);
  const content = await Bun.file(filePath).text();
  const messages: ChatMessage[] = [];

  for (const line of content.split("\n")) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line);
      if (parsed.type === "user" && parsed.message?.content) {
        const raw = parsed.message.content;
        const text = typeof raw === "string"
          ? raw
          : Array.isArray(raw)
            ? raw.map((b: any) => b.text ?? "").join("")
            : String(raw);
        messages.push({ role: "user", text });
      } else if (parsed.type === "assistant" && parsed.message?.content) {
        const content = parsed.message.content as any[];
        const text = content
          .filter((b: any) => b.type === "text")
          .map((b: any) => b.text)
          .join("");
        if (text) {
          messages.push({ role: "assistant", text });
        }
      }
    } catch {
      continue;
    }
  }

  return messages;
}

export async function listSessions(
  projectDir: string
): Promise<SessionSummary[]> {
  const sessionsPath = join(
    homedir(),
    ".claude",
    "projects",
    projectDir
  );

  const glob = new Bun.Glob("*.jsonl");
  const summaries: SessionSummary[] = [];

  for await (const file of glob.scan(sessionsPath)) {
    const sessionId = file.replace(".jsonl", "");
    const filePath = join(sessionsPath, file);
    const content = await Bun.file(filePath).text();
    // 첫 10줄만 읽으면 충분 (user 메시지는 앞쪽에 있음)
    const lines = content.split("\n").slice(0, 10);
    const summary = parseSessionSummary(sessionId, lines);
    if (summary) {
      summaries.push(summary);
    }
  }

  // 최신순 정렬
  summaries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return summaries;
}
