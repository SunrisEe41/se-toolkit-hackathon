import { useState, useEffect, FormEvent } from "react";
import { TheoryPage } from "./TheoryPage";
import { ProgressPage } from "./ProgressPage";
import { ChatPage } from "./ChatPage";
import "./App.css";

const STORAGE_KEY = "api_key";
const STUDENT_ID_KEY = "exam_student_id";

type Page = "theory" | "progress" | "chat";

function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem(STORAGE_KEY) ?? ""
  );
  const [studentId, setStudentId] = useState(
    () => localStorage.getItem(STUDENT_ID_KEY) ?? ""
  );
  const [sidDraft, setSidDraft] = useState(studentId);
  const [sidSaved, setSidSaved] = useState(false);
  const [draft, setDraft] = useState("");
  const [page, setPage] = useState<Page>("theory");

  function handleConnect(e: FormEvent) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    localStorage.setItem(STORAGE_KEY, trimmed);
    setToken(trimmed);
  }

  function handleDisconnect() {
    localStorage.removeItem(STORAGE_KEY);
    setToken("");
    setDraft("");
  }

  if (!token) {
    return (
      <form className="token-form" onSubmit={handleConnect}>
        <h1>🎓 Exam Prep Bot</h1>
        <p>Practice problems, review theory, and chat with an AI agent.</p>
        <input
          type="password"
          placeholder="API Key"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit">Connect</button>
      </form>
    );
  }

  const navBtn = (p: Page, label: string, icon: string) => (
    <button
      className={page === p ? "nav-active" : ""}
      onClick={() => setPage(p)}
    >
      {icon} {label}
    </button>
  );

  return (
    <div>
      <header className="app-header">
        <nav className="nav-links">
          {navBtn("theory", "Theory", "📚")}
          {navBtn("chat", "Chat", "🤖")}
          {navBtn("progress", "Progress", "📊")}
        </nav>
        <form
          className="sid-form"
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = sidDraft.trim();
            if (trimmed) {
              localStorage.setItem(STUDENT_ID_KEY, trimmed);
              setStudentId(trimmed);
              setSidSaved(true);
              setTimeout(() => setSidSaved(false), 2000);
            }
          }}
        >
          <span className="sid-label">Student:</span>
          <input
            type="text"
            placeholder="Your name"
            value={sidDraft}
            onChange={(e) => setSidDraft(e.target.value)}
          />
          <button type="submit">{sidSaved ? "✓" : "Save"}</button>
        </form>
        <button className="btn-disconnect" onClick={handleDisconnect}>
          Disconnect
        </button>
      </header>

      {page === "theory" && <TheoryPage apiKey={token} />}
      {page === "chat" && <ChatPage apiKey={token} studentId={studentId} />}
      {page === "progress" && <ProgressPage apiKey={token} studentId={studentId} />}
    </div>
  );
}

export default App;
