import { useState, useEffect, useCallback } from "react";
import "./App.css";

interface Topic {
  id: number;
  slug: string;
  title: string;
  description: string;
}

interface Task {
  id: number;
  topic_id: number;
  question: string;
  answer: string;
  explanation: string;
  difficulty: string;
}

export function PracticePage({ apiKey }: { apiKey: string }) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const headers = { Authorization: `Bearer ${apiKey}` };

  useEffect(() => {
    if (!apiKey) return;
    fetch("/exam/topics/", { headers })
      .then((r) => r.json())
      .then(setTopics)
      .catch(() => {});
  }, [apiKey]);

  const getTask = useCallback(
    (topicId: number) => {
      setLoading(true);
      setFeedback(null);
      setAnswer("");
      setTask(null);
      fetch(`/exam/tasks/random?topic_id=${topicId}`, { headers })
        .then((r) => r.json())
        .then((data) => {
          setTask(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    },
    [headers]
  );

  const submit = () => {
    if (!task || !answer.trim()) return;
    const correct = task.answer.trim().toLowerCase() === answer.trim().toLowerCase();
    setFeedback(
      correct
        ? `✅ Correct! ${task.explanation}`
        : `❌ Not quite. The answer is: ${task.answer}\n\n${task.explanation}`
    );
  };

  const diffColor = (d: string) =>
    d === "easy" ? "#22c55e" : d === "medium" ? "#f59e0b" : "#ef4444";

  return (
    <div className="practice-page">
      <h2>✏️ Practice Problems</h2>
      <p className="practice-intro">
        Select a topic to get a random problem. Practice in the CLI chat:{" "}
        <code>uv run nanobot agent -c config.json</code>
      </p>

      <div className="topic-grid">
        {topics.map((t) => (
          <button
            key={t.id}
            className={`topic-btn ${selectedTopic?.id === t.id ? "active" : ""}`}
            onClick={() => {
              setSelectedTopic(t);
              getTask(t.id);
            }}
          >
            {t.title}
          </button>
        ))}
      </div>

      {loading && <p className="loading">Loading task...</p>}

      {task && !loading && (
        <div className="task-card">
          <div className="task-header">
            <span className="task-topic">{selectedTopic?.title}</span>
            <span
              className="task-diff"
              style={{ background: diffColor(task.difficulty) }}
            >
              {task.difficulty}
            </span>
          </div>
          <p className="task-question">{task.question}</p>
          <div className="task-answer-section">
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Your answer..."
              onKeyDown={(e) => e.key === "Enter" && submit()}
              disabled={!!feedback}
            />
            <button onClick={submit} disabled={!!feedback || !answer.trim()}>
              Check
            </button>
          </div>
          {feedback && (
            <div className={`task-feedback ${feedback.startsWith("✅") ? "correct" : "wrong"}`}>
              {feedback.split("\n").map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          )}
          <button
            className="btn-next"
            onClick={() => task && getTask(task.topic_id)}
          >
            Next task →
          </button>
        </div>
      )}
    </div>
  );
}
