import React, { useState, useCallback, useEffect } from "react";
import { Box, Text, useInput, useApp, useStdout, useCursor } from "ink";
import { spawnClaude, type ParsedEvent } from "./claude-process.ts";
import { cursorColumn, wrappedLineCount } from "./cursor.ts";

type AppState = "idle" | "waiting" | "permission";

interface PermissionInfo {
  toolName: string;
  toolUseId: string;
  input: Record<string, unknown>;
}

export default function App() {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const { setCursorPosition } = useCursor();
  const [inputState, setInputState] = useState({ text: "", cursor: 0 });
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
          if (event.isError) {
            setOutput((prev) => [...prev, `[Error] ${event.text}`]);
          }
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
    if (!claude || !inputState.text.trim()) return;
    setOutput((prev) => [...prev, `> ${inputState.text}`]);
    claude.send(inputState.text);
    setInputState({ text: "", cursor: 0 });
    setState("waiting");
  }, [claude, inputState.text]);

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
      setInputState((prev) => {
        if (prev.cursor <= 0) return prev;
        const chars = [...prev.text];
        chars.splice(prev.cursor - 1, 1);
        return { text: chars.join(""), cursor: prev.cursor - 1 };
      });
      return;
    }

    if (key.leftArrow) {
      setInputState((prev) => ({
        ...prev,
        cursor: Math.max(0, prev.cursor - 1),
      }));
      return;
    }

    if (key.rightArrow) {
      setInputState((prev) => ({
        ...prev,
        cursor: Math.min([...prev.text].length, prev.cursor + 1),
      }));
      return;
    }

    // Regular character input (IME may send multiple chars at once, e.g. "거 ")
    if (ch && !key.ctrl && !key.meta) {
      setInputState((prev) => {
        const chars = [...prev.text];
        const newChars = [...ch];
        chars.splice(prev.cursor, 0, ...newChars);
        return { text: chars.join(""), cursor: prev.cursor + newChars.length };
      });
    }
  });

  const { text: input, cursor: cursorPos } = inputState;
  const cursorX = cursorColumn(input, cursorPos);
  const termWidth = stdout?.columns ?? 80;

  // Show last N lines of output that fit
  const maxOutputLines = (stdout?.rows ?? 24) - 4;
  const visibleOutput = output.slice(-maxOutputLines);

  // Position the real terminal cursor for IME composition
  // y = sum of wrapped line counts for all output lines
  const inputLineY = visibleOutput.reduce(
    (sum, line) => sum + wrappedLineCount(line, termWidth),
    0
  );
  if (state === "idle") {
    setCursorPosition({ x: cursorX, y: inputLineY });
  } else {
    setCursorPosition(undefined);
  }

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
          <Text>{input}</Text>
        </Box>
      )}
    </Box>
  );
}
