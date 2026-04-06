import { useState, useEffect, FormEvent } from "react";
import { TheoryPage } from "./TheoryPage";
import { PracticePage } from "./PracticePage";
import { ProgressPage } from "./ProgressPage";
import "./App.css";

const STORAGE_KEY = "api_key";

type Page = "theory" | "practice" | "progress";

function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem(STORAGE_KEY) ?? ""
  );
  const [draft, setDraft] = useState("");
  const [page, setPage] = useState<Page>("practice");

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
        <p>Practice problems and review theory for analytical geometry and linear algebra.</p>
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
          {navBtn("practice", "Practice", "✏️")}
          {navBtn("theory", "Theory", "📚")}
          {navBtn("progress", "Progress", "📊")}
        </nav>
        <button className="btn-disconnect" onClick={handleDisconnect}>
          Disconnect
        </button>
      </header>

      {page === "practice" && <PracticePage apiKey={token} />}
      {page === "theory" && <TheoryPage apiKey={token} />}
      {page === "progress" && <ProgressPage apiKey={token} />}
    </div>
  );
}

export default App;
