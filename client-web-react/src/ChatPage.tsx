import { useEffect, useRef, useState } from "react";
import "./App.css";

interface Message {
  role: "user" | "assistant";
  text: string;
  timestamp: number;
}

export function ChatPage({
  apiKey,
  wsUrl,
  chatKey,
}: {
  apiKey: string;
  wsUrl: string;
  chatKey: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!wsUrl || !chatKey) return;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setError("");
      ws.send(
        JSON.stringify({
          type: "auth",
          token: chatKey,
        })
      );
    };

    ws.onclose = () => {
      setConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "text" || data.type === "response") {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", text: data.text || data.content || event.data, timestamp: Date.now() },
          ]);
        }
      } catch {
        // Plain text response
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: event.data, timestamp: Date.now() },
        ]);
      }
    };

    ws.onerror = () => setError("WebSocket connection failed");

    return () => ws.close();
  }, [wsUrl, chatKey]);

  const send = () => {
    if (!input.trim() || !wsRef.current || wsRef.current.readyState !== 1)
      return;

    const text = input.trim();
    setInput("");
    setMessages((prev) => [
      ...prev,
      { role: "user", text, timestamp: Date.now() },
    ]);

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
  }, [messages]);

  return (
    <div className="chat-page">
      <div className="chat-header">
        <h2>🤖 Exam Prep Chat</h2>
        <span className={connected ? "status on" : "status off"}>
          {connected ? "Connected" : "Disconnected"}
        </span>
      </div>

      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <strong>{m.role === "user" ? "You" : "Bot"}</strong>
            <p>{m.text}</p>
          </div>
        ))}
        {error && <p className="error">{error}</p>}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={
            connected
              ? "Ask for a task, submit an answer, or request theory..."
              : "Connecting..."
          }
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
