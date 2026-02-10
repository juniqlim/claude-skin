import React, { useState, useCallback, useEffect } from "react";
import { Box, Text, useInput, useApp, useStdout } from "ink";
import stringWidth from "string-width";
import { spawnClaude, type ParsedEvent } from "./claude-process.ts";

type AppState = "idle" | "waiting" | "permission";

interface PermissionInfo {
  toolName: string;
  toolUseId: string;
  input: Record<string, unknown>;
}

export default function App() {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [input, setInput] = useState("");
  const [cursorPos, setCursorPos] = useState(0);
  const [output, setOutput] = useState<string[]>([]);
  const [state, setState] = useState<AppState>("idle");
  const [permission, setPermission] = useState<PermissionInfo | null>(null);
  const [claude, setClaude] = useState<ReturnType<typeof spawnClaude> | null>(null);
  const [sessionId, setSessionId] = useState<string>("");

  // Spawn Claude process on mount
  useEffect(() => {
    const proc = spawnClaude();
    setClaude(proc);

    proc.onEvent((event: ParsedEvent) => {
      switch (event.type) {
        case "init":
          setSessionId(event.sessionId);
          setOutput((prev) => [...prev, `[Connected] model: ${event.model}`]);
          break;
        case "assistant":
          setOutput((prev) => [...prev, event.text]);
          setState("idle");
          break;
        case "tool_use":
          setPermission({
            toolName: event.toolName,
            toolUseId: event.toolUseId,
            input: event.input,
          });
          setState("permission");
          break;
        case "result":
          setOutput((prev) => [
            ...prev,
            event.isError
              ? `[Error] ${event.text}`
              : `[Done] cost: $${event.costUsd.toFixed(4)}`,
          ]);
          setState("idle");
          break;
      }
    });

    proc.onExit((code) => {
      setOutput((prev) => [...prev, `[Process exited: ${code}]`]);
      exit();
    });

    return () => {
      proc.kill();
    };
  }, []);

  const sendMessage = useCallback(() => {
    if (!claude || !input.trim()) return;
    setOutput((prev) => [...prev, `> ${input}`]);
    claude.send(input);
    setInput("");
    setCursorPos(0);
    setState("waiting");
  }, [claude, input]);

  useInput((ch, key) => {
    if (state === "permission") {
      if (ch === "y" || ch === "Y") {
        // Approve tool use — for now just log it
        setOutput((prev) => [...prev, `[Approved] ${permission?.toolName}`]);
        setPermission(null);
        setState("waiting");
      } else if (ch === "n" || ch === "N") {
        setOutput((prev) => [...prev, `[Denied] ${permission?.toolName}`]);
        setPermission(null);
        setState("waiting");
      }
      return;
    }

    if (state !== "idle") return;

    if (key.return) {
      sendMessage();
      return;
    }

    if (key.escape || (key.ctrl && ch === "c")) {
      if (claude) claude.kill();
      exit();
      return;
    }

    if (key.backspace || key.delete) {
      if (cursorPos > 0) {
        const before = [...input].slice(0, cursorPos - 1).join("");
        const after = [...input].slice(cursorPos).join("");
        setInput(before + after);
        setCursorPos(cursorPos - 1);
      }
      return;
    }

    if (key.leftArrow) {
      setCursorPos(Math.max(0, cursorPos - 1));
      return;
    }

    if (key.rightArrow) {
      setCursorPos(Math.min([...input].length, cursorPos + 1));
      return;
    }

    // Regular character input
    if (ch && !key.ctrl && !key.meta) {
      const chars = [...input];
      chars.splice(cursorPos, 0, ch);
      setInput(chars.join(""));
      setCursorPos(cursorPos + 1);
    }
  });

  // Calculate cursor X position using string-width (handles CJK)
  const beforeCursor = [...input].slice(0, cursorPos).join("");
  const cursorX = stringWidth(beforeCursor);
  const termWidth = stdout?.columns ?? 80;

  // Show last N lines of output that fit
  const maxOutputLines = (stdout?.rows ?? 24) - 4;
  const visibleOutput = output.slice(-maxOutputLines);

  return (
    <Box flexDirection="column" width={termWidth}>
      {/* Output area */}
      <Box flexDirection="column" flexGrow={1}>
        {visibleOutput.map((line, i) => (
          <Text key={`out-${output.length - visibleOutput.length + i}`} wrap="wrap">
            {line}
          </Text>
        ))}
      </Box>

      {/* Status */}
      {state === "waiting" && (
        <Text color="yellow">Thinking...</Text>
      )}

      {/* Permission prompt */}
      {state === "permission" && permission && (
        <Box flexDirection="column">
          <Text color="cyan">
            Tool: {permission.toolName}
          </Text>
          <Text color="cyan">
            Input: {JSON.stringify(permission.input).slice(0, 100)}
          </Text>
          <Text color="yellow" bold>
            Allow? (y/n)
          </Text>
        </Box>
      )}

      {/* Input area */}
      {state === "idle" && (
        <Box>
          <Text color="green" bold>
            {"❯ "}
          </Text>
          <Text>
            {beforeCursor}
            <Text inverse>{[...input][cursorPos] ?? " "}</Text>
            {[...input].slice(cursorPos + 1).join("")}
          </Text>
        </Box>
      )}
    </Box>
  );
}
