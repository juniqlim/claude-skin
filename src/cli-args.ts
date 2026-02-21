export interface CliOptions {
  effort?: string;
  model?: string;
  appendSystemPrompt?: string;
  systemPrompt?: string;
  resume?: boolean;
  dangerouslySkipPermissions?: boolean;
}

export function parseCliArgs(args: string[]): CliOptions {
  const opts: CliOptions = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--effort":
        opts.effort = args[++i];
        break;
      case "--model":
        opts.model = args[++i];
        break;
      case "--append-system-prompt":
        opts.appendSystemPrompt = args[++i];
        break;
      case "--system-prompt":
        opts.systemPrompt = args[++i];
        break;
      case "--resume":
      case "-r":
        opts.resume = true;
        break;
      case "--dangerously-skip-permissions":
        opts.dangerouslySkipPermissions = true;
        break;
    }
  }

  return opts;
}

export function buildClaudeArgs(opts: CliOptions): string[] {
  const args = [
    "--print",
    "--output-format", "stream-json",
    "--input-format", "stream-json",
    "--verbose",
    "--include-partial-messages",
  ];

  if (opts.effort) {
    args.push("--effort", opts.effort);
  }
  if (opts.model) {
    args.push("--model", opts.model);
  }
  if (opts.appendSystemPrompt) {
    args.push("--append-system-prompt", opts.appendSystemPrompt);
  }
  if (opts.systemPrompt) {
    args.push("--system-prompt", opts.systemPrompt);
  }
  if (opts.dangerouslySkipPermissions) {
    args.push("--dangerously-skip-permissions");
  }

  return args;
}
