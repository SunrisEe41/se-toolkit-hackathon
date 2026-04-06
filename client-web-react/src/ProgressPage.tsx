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

export function ProgressPage({ apiKey, studentId }: { apiKey: string; studentId: string }) {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [error, setError] = useState("");

  const headers = { Authorization: `Bearer ${apiKey}` };

  useEffect(() => {
    if (!studentId) return;
    setError("");
    fetch(`/exam/progress/${studentId.trim()}`, { headers })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setProgress)
      .catch((e) => setError(e.message));
  }, [studentId, apiKey]);

  const accuracyColor = (a: number) =>
    a >= 0.8 ? "#22c55e" : a >= 0.5 ? "#f59e0b" : "#ef4444";

  return (
    <div className="progress-page">

      {!studentId && (
        <p className="no-data">Enter your name/ID in the header above to view progress.</p>
      )}

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
