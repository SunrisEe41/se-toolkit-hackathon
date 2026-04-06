import { useState, useEffect, FormEvent } from "react";
import { TheoryPage } from "./TheoryPage";
import { ProgressPage } from "./ProgressPage";
import { ChatPage } from "./ChatPage";
import { ExamPage } from "./ExamPage";
import { StudentIdOverlay } from "./StudentIdOverlay";
import "./App.css";

const STORAGE_KEY = "api_key";
const STUDENT_ID_KEY = "exam_student_id";

type Page = "theory" | "chat" | "exam" | "progress";

function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem(STORAGE_KEY) ?? ""
  );
  const [studentId, setStudentId] = useState(
    () => localStorage.getItem(STUDENT_ID_KEY) ?? ""
  );
  const [sidDraft, setSidDraft] = useState(studentId);
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
    localStorage.removeItem(STUDENT_ID_KEY);
    setToken("");
    setDraft("");
    setStudentId("");
    setSidDraft("");
  }

  function handleStudentId(id: string) {
    localStorage.setItem(STUDENT_ID_KEY, id);
    setStudentId(id);
  }

  if (!studentId) {
    return <StudentIdOverlay onSubmit={handleStudentId} />;
  }

  if (!token) {
    return (
      <form className="token-form" onSubmit={handleConnect}>
        <h1>🎓 Exam Prep Bot</h1>
        <p>
          Welcome, <strong>{studentId}</strong>! Practice problems, review
          theory, and take mock exams.
        </p>
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
          {navBtn("exam", "Exam", "📝")}
          {navBtn("chat", "Chat", "🤖")}
          {navBtn("progress", "Progress", "📊")}
        </nav>
        <div className="header-right">
          <span className="student-badge">👤 {studentId}</span>
          <button
            className="btn-disconnect"
            onClick={handleDisconnect}
          >
            Logout
          </button>
        </div>
      </header>

      <div className="pages-container">
        <div className={`page ${page === "theory" ? "active" : ""}`}>
          <TheoryPage apiKey={token} />
        </div>
        <div className={`page ${page === "exam" ? "active" : ""}`}>
          <ExamPage apiKey={token} studentId={studentId} />
        </div>
        <div className={`page ${page === "chat" ? "active" : ""}`}>
          <ChatPage apiKey={token} studentId={studentId} />
        </div>
        <div className={`page ${page === "progress" ? "active" : ""}`}>
          <ProgressPage apiKey={token} studentId={studentId} />
        </div>
      </div>
    </div>
  );
}

export default App;
