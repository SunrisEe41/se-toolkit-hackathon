import { useEffect, useRef, useState } from "react";
import "./App.css";

interface Message {
  role: "user" | "assistant";
  text: string;
  timestamp: number;
}

export function ChatPage({ wsUrl, chatKey }: { wsUrl?: string; chatKey: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const [buffer, setBuffer] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const bufferRef = useRef("");

  useEffect(() => {
    if (!wsUrl || !chatKey) return;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setError("");
      // Send auth
      ws.send(JSON.stringify({ type: "auth", token: chatKey }));
    };

    ws.onclose = () => setConnected(false);

    ws.onmessage = (event) => {
      let text = event.data;
      try {
        const data = JSON.parse(event.data);
        if (data.type === "auth_ok") {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", text: "Connected! How can I help you today?", timestamp: Date.now() },
          ]);
          return;
        }
        if (data.type === "chunk") {
          text = data.delta || "";
        } else if (data.type === "done") {
          // Commit buffer as final message
          if (bufferRef.current) {
            setMessages((prev) => [
              ...prev,
              { role: "assistant", text: bufferRef.current, timestamp: Date.now() },
            ]);
            bufferRef.current = "";
            setBuffer("");
          }
          return;
        } else if (data.type === "error") {
          setError(text);
          return;
        }
      } catch {
        // Plain text
      }

      // Accumulate streaming text
      bufferRef.current += text;
      setBuffer(bufferRef.current);
    };

    ws.onerror = () => setError("Cannot connect to agent. Check WebSocket URL.");

    return () => ws.close();
  }, [wsUrl, chatKey]);

  const send = () => {
    if (!input.trim() || !wsRef.current || wsRef.current.readyState !== 1) return;
    const text = input.trim();
    setInput("");
    setBuffer("");
    bufferRef.current = "";
    setMessages((prev) => [...prev, { role: "user", text, timestamp: Date.now() }]);
    wsRef.current.send(JSON.stringify({ type: "message", text }));
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, buffer]);

  if (!chatKey) {
    return (
      <div className="chat-page chat-setup">
        <h2>🤖 Exam Prep Agent</h2>
        <p>Enter your API key to connect (same as used for login).</p>
        <label>
          Access key:
          <input
            type="password"
            placeholder="API Key"
            value={chatKey}
            onChange={(e) => {
              const v = e.target.value;
              localStorage.setItem("chat_key", v);
            }}
          />
        </label>
      </div>
    );
  }

  return (
    <div className="chat-page">
      <div className="chat-header">
        <h2>🤖 Exam Prep Agent</h2>
        <span className={connected ? "status on" : "status off"}>
          {connected ? "Connected" : "Disconnected"}
        </span>
      </div>

      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <strong>{m.role === "user" ? "You" : "Agent"}</strong>
            <p>{m.text}</p>
          </div>
        ))}
        {buffer && (
          <div className="msg assistant streaming">
            <strong>Agent</strong>
            <p>{buffer}</p>
          </div>
        )}
        {error && <p className="error">{error}</p>}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={connected ? "Ask for a task, submit an answer, or request theory..." : "Connecting..."}
          disabled={!connected}
          rows={2}
        />
        <button onClick={send} disabled={!connected}>
          Send
        </button>
      </div>
    </div>
  );
}
