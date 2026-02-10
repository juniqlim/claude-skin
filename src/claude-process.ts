// Claude CLI child process manager

export type ParsedEvent =
  | { type: "init"; sessionId: string; model: string }
  | { type: "assistant"; text: string }
  | { type: "tool_use"; toolName: string; toolUseId: string; input: Record<string, unknown> }
  | { type: "result"; text: string; costUsd: number; isError: boolean }
  | { type: "unknown"; raw: unknown };

export function parseNDJSON(line: string, emit: (event: ParsedEvent) => void): void {
  const trimmed = line.trim();
  if (!trimmed) return;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return;
  }

  if (parsed.type === "system" && parsed.subtype === "init") {
    emit({
      type: "init",
      sessionId: parsed.session_id as string,
      model: parsed.model as string,
    });
    return;
  }

  if (parsed.type === "assistant") {
    const msg = parsed.message as Record<string, unknown>;
    const content = msg.content as Array<Record<string, unknown>>;

    for (const block of content) {
      if (block.type === "text") {
        emit({ type: "assistant", text: block.text as string });
      } else if (block.type === "tool_use") {
        emit({
          type: "tool_use",
          toolName: block.name as string,
          toolUseId: block.id as string,
          input: block.input as Record<string, unknown>,
        });
      }
    }
    return;
  }

  if (parsed.type === "result") {
    emit({
      type: "result",
      text: (parsed.result as string) ?? "",
      costUsd: (parsed.total_cost_usd as number) ?? 0,
      isError: (parsed.is_error as boolean) ?? false,
    });
    return;
  }

  emit({ type: "unknown", raw: parsed });
}

export interface ClaudeProcess {
  send: (message: string) => void;
  kill: () => void;
  onEvent: (handler: (event: ParsedEvent) => void) => void;
  onExit: (handler: (code: number | null) => void) => void;
}

export function spawnClaude(extraArgs: string[] = []): ClaudeProcess {
  const eventHandlers: Array<(event: ParsedEvent) => void> = [];
  const exitHandlers: Array<(code: number | null) => void> = [];

  const proc = Bun.spawn(
    ["claude", ...extraArgs],
    {
      stdin: "pipe",
      stdout: "pipe",
      stderr: "inherit",
    }
  );

  // Read stdout as NDJSON stream
  const reader = proc.stdout.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  (async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          parseNDJSON(line, (event) => {
            for (const handler of eventHandlers) {
              handler(event);
            }
          });
        }
      }
      // Process remaining buffer
      if (buffer.trim()) {
        parseNDJSON(buffer, (event) => {
          for (const handler of eventHandlers) {
            handler(event);
          }
        });
      }
    } catch {
      // stream closed
    }
  })();

  proc.exited.then((code) => {
    for (const handler of exitHandlers) {
      handler(code);
    }
  });

  return {
    send(message: string) {
      const payload = JSON.stringify({
        type: "user",
        message: { role: "user", content: message },
        session_id: "default",
        parent_tool_use_id: null,
      });
      proc.stdin.write(payload + "\n");
    },
    kill() {
      proc.kill();
    },
    onEvent(handler) {
      eventHandlers.push(handler);
    },
    onExit(handler) {
      exitHandlers.push(handler);
    },
  };
}
