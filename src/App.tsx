import React, { useState, useCallback, useEffect } from "react";
import { Box, Text, useInput, useApp, useStdout, useCursor } from "ink";
import { spawnClaude, type ParsedEvent } from "./claude-process.ts";
import { cursorColumn, wrappedLineCount } from "./cursor.ts";
import { parseCliArgs, buildClaudeArgs } from "./cli-args.ts";
import { listSessions, loadSessionHistory, cwdToProjectDir, type SessionSummary } from "./sessions.ts";

type AppState = "session-select" | "idle" | "waiting" | "permission";

interface PermissionInfo {
  toolName: string;
  toolUseId: string;
  input: Record<string, unknown>;
}

function SessionPicker({
  sessions,
  selected,
  onSelect,
}: {
  sessions: SessionSummary[];
  selected: number;
  onSelect: (session: SessionSummary) => void;
}) {
  useInput((_ch, key) => {
    // input handling is done in parent
  });

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">세션 선택 (↑↓ 이동, Enter 선택, Esc 새 세션)</Text>
      <Text> </Text>
      {sessions.map((s, i) => (
        <Text key={s.sessionId} color={i === selected ? "green" : undefined}>
          {i === selected ? "❯ " : "  "}
          {s.firstMessage}
          <Text color="gray"> ({s.timestamp.slice(0, 10)})</Text>
        </Text>
      ))}
    </Box>
  );
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

  // Session picker state
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const opts = parseCliArgs(process.argv.slice(2));

  // Load sessions if --resume
  useEffect(() => {
    if (!opts.resume) {
      startClaude();
      return;
    }

    // cwd를 프로젝트 디렉토리명으로 변환
    const projectDir = cwdToProjectDir(process.cwd());
    listSessions(projectDir).then((list) => {
      if (list.length === 0) {
        // 세션 없으면 그냥 새로 시작
        startClaude();
      } else {
        setSessions(list);
        setState("session-select");
      }
    });
  }, []);

  function startClaude(resumeSessionId?: string) {
    const claudeArgs = buildClaudeArgs(opts);
    if (resumeSessionId) {
      claudeArgs.push("--resume", resumeSessionId);
    }
    const proc = spawnClaude(claudeArgs);
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
          setOutput((prev) => [...prev, `[Tool] ${event.toolName}`]);
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
  }

  const sendMessage = useCallback(() => {
    if (!claude || !inputState.text.trim()) return;
    setOutput((prev) => [...prev, `> ${inputState.text}`]);
    claude.send(inputState.text);
    setInputState({ text: "", cursor: 0 });
    setState("waiting");
  }, [claude, inputState.text]);

  useInput((ch, key) => {
    // Session picker
    if (state === "session-select") {
      if (key.upArrow) {
        setSelectedIdx((prev) => Math.max(0, prev - 1));
      } else if (key.downArrow) {
        setSelectedIdx((prev) => Math.min(sessions.length - 1, prev + 1));
      } else if (key.return) {
        const selected = sessions[selectedIdx];
        const projectDir = cwdToProjectDir(process.cwd());
        loadSessionHistory(projectDir, selected.sessionId).then((history) => {
          const lines = history.map((m) =>
            m.role === "user" ? `> ${m.text}` : m.text
          );
          setOutput(lines);
          setState("idle");
          startClaude(selected.sessionId);
        });
      } else if (key.escape) {
        setState("idle");
        startClaude();
      }
      return;
    }

    if (state === "permission") {
      if (ch === "y" || ch === "Y") {
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

    if (state !== "idle" && state !== "waiting") return;

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

  // Session select screen
  if (state === "session-select") {
    return (
      <SessionPicker
        sessions={sessions}
        selected={selectedIdx}
        onSelect={(s) => {
          setState("idle");
          startClaude(s.sessionId);
        }}
      />
    );
  }

  const { text: input, cursor: cursorPos } = inputState;
  const cursorX = cursorColumn(input, cursorPos);
  const termWidth = stdout?.columns ?? 80;

  // Show last N lines of output that fit
  const maxOutputLines = (stdout?.rows ?? 24) - 6;
  const visibleOutput = output.slice(-maxOutputLines);

  // Position the real terminal cursor for IME composition
  const inputLineY = visibleOutput.reduce(
    (sum, line) => sum + wrappedLineCount(line, termWidth),
    0
  );
  if (state === "idle" || state === "waiting") {
    setCursorPosition({ x: cursorX, y: inputLineY + (state === "waiting" ? 1 : 0) });
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
      {(state === "idle" || state === "waiting") && (
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
