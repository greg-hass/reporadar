import { useMemo, useState } from "react";
import { CheckIcon, CopyIcon } from "./icons";

// Lines that look like install/setup commands across common ecosystems.
const INSTALL_RE =
  /^\s*(?:(?:\$|>|sudo)\s+)*(?:npm\s+(?:i|install)\b|npx\s+|yarn\s+(?:add|global\s+add)\b|pnpm\s+(?:add|i|install|dlx)\b|bun\s+(?:add|i|install|x)\b|pip3?\s+install\b|pipx\s+install\b|uv\s+(?:pip\s+install|tool\s+install|add)\b|brew\s+install\b|cargo\s+(?:install|add)\b|go\s+(?:install|get)\b|gem\s+install\b|composer\s+(?:global\s+)?require\b|dotnet\s+add\s+package\b|docker\s+(?:pull|run)\b|podman\s+(?:pull|run)\b|helm\s+install\b|kubectl\s+apply\b|apt(?:-get)?\s+install\b|git\s+clone\b)/;

/** Extracts install-looking command lines from rendered README HTML. */
export function extractInstallCommands(html: string): string[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const found: string[] = [];
  const seen = new Set<string>();

  const pushLines = (text: string) => {
    for (const raw of text.split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#") || !INSTALL_RE.test(line)) continue;
      const cmd = line.replace(/^\s*\$\s*/, "");
      if (!seen.has(cmd)) {
        seen.add(cmd);
        found.push(cmd);
      }
    }
  };

  // Fenced code blocks first (authoritative), then standalone inline code.
  doc.querySelectorAll("pre").forEach((pre) => pushLines(pre.textContent ?? ""));
  doc.querySelectorAll("code").forEach((code) => {
    if (code.closest("pre")) return;
    pushLines(code.textContent ?? "");
  });

  return found.slice(0, 8);
}

export default function InstallCommands({ html }: { html: string }) {
  const commands = useMemo(() => extractInstallCommands(html), [html]);
  const [copied, setCopied] = useState<string | null>(null);

  if (commands.length === 0) return null;

  const copy = async (cmd: string) => {
    try {
      await navigator.clipboard.writeText(cmd);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = cmd;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(cmd);
    setTimeout(() => setCopied((c) => (c === cmd ? null : c)), 1600);
  };

  return (
    <div className="mt-3 flex flex-col gap-1.5">
      {commands.map((cmd) => (
        <div
          key={cmd}
          className="group flex items-center gap-2 rounded-lg bg-bg px-3 py-2 shadow-[0_6px_18px_-12px_rgb(0_0_0/0.6)]"
        >
          <code className="flex-1 min-w-0 truncate font-mono text-xs text-text">{cmd}</code>
          <button
            onClick={() => copy(cmd)}
            title={copied === cmd ? "Copied" : "Copy"}
            aria-label={`Copy: ${cmd}`}
            className={`shrink-0 transition-colors ${
              copied === cmd ? "text-accent" : "text-muted hover:text-text"
            }`}
          >
            {copied === cmd ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
          </button>
        </div>
      ))}
    </div>
  );
}
