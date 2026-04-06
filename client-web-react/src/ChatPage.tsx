import { useEffect, useRef, useState } from "react";
import "./App.css";

interface Message {
  role: "user" | "assistant";
  text: string;
  timestamp: number;
}

function MarkdownText({ text }: { text: string }) {
  const html = parseMarkdown(text);
  return <div className="md-content" dangerouslySetInnerHTML={{ __html: html }} />;
}

function parseMarkdown(text: string): string {
  const lines = text.split("\n");
  let result: string[] = [];
  let inCode = false;
  let codeBuf: string[] = [];
  let codeLang = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("```")) {
      if (inCode) {
        // Close code block
        result.push(
          `<pre class="code-block"><code>${codeBuf.join("\n").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`
        );
        codeBuf = [];
        codeLang = "";
        inCode = false;
      } else {
        inCode = true;
        codeLang = line.slice(3).trim();
      }
      continue;
    }

    if (inCode) {
      codeBuf.push(line);
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      result.push("<hr/>");
      continue;
    }

    // Headers
    if (line.startsWith("### ")) {
      result.push(`<h4>${inlineFormat(line.slice(4))}</h4>`);
      continue;
    }
    if (line.startsWith("## ")) {
      result.push(`<h3>${inlineFormat(line.slice(3))}</h3>`);
      continue;
    }
    if (line.startsWith("# ")) {
      result.push(`<h2>${inlineFormat(line.slice(2))}</h2>`);
      continue;
    }

    // Unordered list
    if (/^[-*]\s/.test(line)) {
      result.push(`<li>${inlineFormat(line.slice(2))}</li>`);
      continue;
    }

    // Ordered list
    const ordered = line.match(/^\d+\.\s(.*)/);
    if (ordered) {
      result.push(`<li>${inlineFormat(ordered[1])}</li>`);
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      result.push("<br/>");
      continue;
    }

    result.push(`<p>${inlineFormat(line)}</p>`);
  }

  // Close unclosed code block
  if (inCode && codeBuf.length > 0) {
    result.push(
      `<pre class="code-block"><code>${codeBuf.join("\n").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`
    );
  }

  return result.join("\n");
}

function inlineFormat(text: string): string {
  // Inline code
  text = text.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Italic
  text = text.replace(/\*(.+?)\*/g, "<em>$1</em>");
  return text;
}

export function ChatPage({ apiKey }: { apiKey: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput("");
    setError("");
    setLoading(true);

    setMessages((prev) => [...prev, { role: "user", text, timestamp: Date.now() }]);

    try {
      const resp = await fetch("/exam/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ message: text }),
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: data.reply, timestamp: Date.now() },
      ]);
    } catch (e: any) {
      setError(e.message || "Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="chat-page">
      <div className="chat-header">
        <h2>🤖 Exam Prep Agent</h2>
        <span className="status on">Online</span>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <p className="chat-hint">
            Ask me anything about analytical geometry or linear algebra! Try:
            <br />
            <code>"Give me a practice problem"</code> or <code>"Explain eigenvalues"</code>
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <strong>{m.role === "user" ? "You" : "Agent"}</strong>
            <MarkdownText text={m.text} />
          </div>
        ))}
        {error && <p className="error">{error}</p>}
        {loading && (
          <div className="msg assistant">
            <strong>Agent</strong>
            <p className="typing">Thinking...</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask for a task, theory, or help..."
          disabled={loading}
          rows={2}
        />
        <button onClick={send} disabled={loading || !input.trim()}>
          {loading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
