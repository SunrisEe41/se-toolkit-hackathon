import { useState, useEffect } from "react";
import "./App.css";

interface ProgressData {
  student_id: string;
  total_attempts: number;
  correct_count: number;
  wrong_count: number;
  accuracy: number;
  topics_attempted: number[];
  topics_solved: number[];
}

export function ProgressPage({ apiKey }: { apiKey: string }) {
  const [studentId, setStudentId] = useState(
    () => localStorage.getItem("exam_student_id") ?? ""
  );
  const [draft, setDraft] = useState(studentId);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [error, setError] = useState("");

  const headers = { Authorization: `Bearer ${apiKey}` };

  const fetchProgress = (id: string) => {
    if (!id.trim()) return;
    setError("");
    fetch(`/exam/progress/${id.trim()}`, { headers })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => setProgress(data))
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    if (studentId) fetchProgress(studentId);
  }, [studentId]);

  const handleSubmit = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    localStorage.setItem("exam_student_id", trimmed);
    setStudentId(trimmed);
    fetchProgress(trimmed);
  };

  const accuracyColor = (a: number) =>
    a >= 0.8 ? "#22c55e" : a >= 0.5 ? "#f59e0b" : "#ef4444";

  return (
    <div className="progress-page">
      <h2>📊 Your Progress</h2>

      <div className="progress-form">
        <label>
          Student ID:
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Your name or ID"
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </label>
        <button onClick={handleSubmit}>Check</button>
      </div>

      {error && <p className="error">{error}</p>}

      {progress && (
        <div className="progress-stats">
          <div className="stat-card">
            <span className="stat-value">{progress.total_attempts}</span>
            <span className="stat-label">Total attempts</span>
          </div>
          <div className="stat-card">
            <span className="stat-value" style={{ color: "#22c55e" }}>
              {progress.correct_count}
            </span>
            <span className="stat-label">Correct</span>
          </div>
          <div className="stat-card">
            <span className="stat-value" style={{ color: "#ef4444" }}>
              {progress.wrong_count}
            </span>
            <span className="stat-label">Wrong</span>
          </div>
          <div className="stat-card">
            <span
              className="stat-value"
              style={{ color: accuracyColor(progress.accuracy) }}
            >
              {Math.round(progress.accuracy * 100)}%
            </span>
            <span className="stat-label">Accuracy</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">
              {progress.topics_attempted.length}
            </span>
            <span className="stat-label">Topics attempted</span>
          </div>
          <div className="stat-card">
            <span className="stat-value" style={{ color: "#22c55e" }}>
              {progress.topics_solved.length}
            </span>
            <span className="stat-label">Topics solved</span>
          </div>
        </div>
      )}

      {progress && progress.total_attempts === 0 && (
        <p className="no-data">
          No attempts yet. Start practicing in the CLI:
          <br />
          <code>uv run nanobot agent -c config.json</code>
        </p>
      )}
    </div>
  );
}
