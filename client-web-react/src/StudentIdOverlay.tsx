import { useState } from "react";
import "./App.css";

interface Props {
  onSubmit: (id: string) => void;
}

export function StudentIdOverlay({ onSubmit }: Props) {
  const [draft, setDraft] = useState("");

  return (
    <div className="overlay">
      <div className="overlay-card">
        <h1>🎓 Exam Prep Bot</h1>
        <p>
          Enter your name or student ID to get started.<br />
          This is used to track your progress.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = draft.trim();
            if (trimmed) onSubmit(trimmed);
          }}
        >
          <input
            type="text"
            placeholder="Your name or ID"
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
          />
          <button type="submit" disabled={!draft.trim()}>
            Start
          </button>
        </form>
      </div>
    </div>
  );
}
