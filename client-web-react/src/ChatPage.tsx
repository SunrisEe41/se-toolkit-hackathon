import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import "./App.css";

interface Message {
  role: "user" | "assistant";
  text: string;
  timestamp: number;
}

function MessageContent({ text }: { text: string }) {
  return (
    <div className="md-content">
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {text}
      </ReactMarkdown>
    </div>
  );
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
            <MessageContent text={m.text} />
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
