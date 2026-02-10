// Claude CLI stream-json message types

export type ClaudeMessage =
  | SystemInitMessage
  | AssistantMessage
  | ResultMessage
  | ToolUseMessage
  | ToolResultMessage;

export interface SystemInitMessage {
  type: "system";
  subtype: "init";
  session_id: string;
  tools: unknown[];
  model: string;
}

export interface ContentBlock {
  type: "text";
  text: string;
}

export interface AssistantMessage {
  type: "assistant";
  message: {
    id: string;
    type: "message";
    role: "assistant";
    content: ContentBlock[];
    model: string;
    stop_reason: string | null;
  };
  session_id: string;
}

export interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolUseMessage {
  type: "assistant";
  message: {
    id: string;
    type: "message";
    role: "assistant";
    content: (ContentBlock | ToolUseBlock)[];
    model: string;
    stop_reason: string | null;
  };
  session_id: string;
}

export interface ToolResultMessage {
  type: "tool_result";
  tool_use_id: string;
  content: string;
  is_error: boolean;
}

export interface ResultMessage {
  type: "result";
  subtype: "success" | "error";
  cost_usd: number;
  duration_ms: number;
  duration_api_ms: number;
  is_error: boolean;
  num_turns: number;
  session_id: string;
  result?: string;
}

// Permission request from Claude CLI
export interface PermissionRequest {
  type: "tool_use";
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_use_id: string;
}

// User message to send to Claude CLI
export interface UserMessagePayload {
  type: "user_message";
  message: string;
}

export interface PermissionResponse {
  type: "tool_result";
  tool_use_id: string;
  result: "approved" | "denied";
}

// Stream event for real-time token streaming
export interface StreamEvent {
  type: "content_block_delta";
  index: number;
  delta: {
    type: "text_delta";
    text: string;
  };
}
