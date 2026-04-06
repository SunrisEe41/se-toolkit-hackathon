import { useState } from "react";
import "./App.css";

interface Task {
  id: number;
  topic_id: number;
  question: string;
  difficulty: string;
}

export function ExamPage({
  apiKey,
  studentId,
}: {
  apiKey: string;
  studentId: string;
}) {
  const [numTasks, setNumTasks] = useState(5);
  const [examTasks, setExamTasks] = useState<Task[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [results, setResults] = useState<
    { task: Task; answer: string; correct: boolean; explanation: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);

  const headers = { Authorization: `Bearer ${apiKey}` };

  const startExam = async () => {
    setLoading(true);
    try {
      const resp = await fetch("/exam/progress/exam-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ student_id: studentId, num_tasks: numTasks }),
      });
      const data = await resp.json();
      setExamTasks(data.tasks || []);
      setCurrentIndex(0);
      setAnswers(new Array(numTasks).fill(""));
      setResults([]);
    } catch {
      alert("Failed to start exam. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const updateAnswer = (value: string) => {
    const copy = [...answers];
    copy[currentIndex] = value;
    setAnswers(copy);
  };

  const checkAnswer = async () => {
    const task = examTasks[currentIndex];
    const answer = answers[currentIndex];
    if (!task || !answer.trim()) return;

    setChecking(true);
    try {
      const resp = await fetch("/exam/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          message: `Check this answer. Task: "${task.question}". Student's answer: "${answer}". Is it correct? Reply ONLY "CORRECT" or "INCORRECT: <brief explanation>"`,
        }),
      });
      const data = await resp.json();
      const reply = data.reply || "";
      const correct =
        reply.toUpperCase().includes("CORRECT") &&
        !reply.toUpperCase().includes("INCORRECT");

      setResults((prev) => [
        ...prev,
        { task, answer, correct, explanation: reply },
      ]);

      // Auto-submit to track progress
      try {
        await fetch("/exam/progress/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify({
            student_id: studentId,
            task_id: task.id,
            user_answer: answer,
          }),
        });
      } catch {
        // submit is best-effort
      }
    } catch {
      alert("Failed to check answer.");
    } finally {
      setChecking(false);
    }
  };

  const nextTask = () => {
    if (currentIndex + 1 < examTasks.length) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const showResults = () => {
    setSubmitting(true);
  };

  const correctCount = results.filter((r) => r.correct).length;

  if (examTasks.length === 0 && !loading) {
    return (
      <div className="exam-page">
        <h2>📝 Exam Mode</h2>
        <p>
          Select the number of tasks and start the exam. Tasks will be drawn
          randomly from all topics.
        </p>
        <div className="exam-setup">
          <label>
            Number of tasks:
            <select
              value={numTasks}
              onChange={(e) => setNumTasks(Number(e.target.value))}
            >
              {[3, 5, 7, 10].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button onClick={startExam} disabled={loading || !studentId}>
            Start Exam
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="exam-page">
        <h2>📝 Exam Mode</h2>
        <p>Loading tasks...</p>
      </div>
    );
  }

  // Results screen
  if (submitting) {
    return (
      <div className="exam-page">
        <h2>📝 Exam Results</h2>
        <div className="exam-results">
          <div className="result-score">
            <span className="score-value">
              {correctCount}/{examTasks.length}
            </span>
            <span className="score-label">Correct</span>
          </div>
          <div className="result-list">
            {results.map((r, i) => (
              <div key={i} className={`result-item ${r.correct ? "ok" : "fail"}`}>
                <strong>
                  Q{i + 1}: {r.task.question.slice(0, 80)}
                  {r.task.question.length > 80 ? "…" : ""}
                </strong>
                <p>Your answer: {r.answer}</p>
                <p>{r.explanation}</p>
              </div>
            ))}
          </div>
          <button onClick={() => {
            setExamTasks([]);
            setAnswers([]);
            setResults([]);
            setCurrentIndex(0);
            setSubmitting(false);
          }}>
            New Exam
          </button>
        </div>
      </div>
    );
  }

  // Exam in progress
  const task = examTasks[currentIndex];
  const allDone = results.length === examTasks.length;

  if (allDone) {
    return (
      <div className="exam-page">
        <h2>📝 Exam Complete</h2>
        <p>
          You answered all {examTasks.length} tasks.{" "}
          <strong>{correctCount}/{examTasks.length}</strong> correct.
        </p>
        <div className="result-list">
          {results.map((r, i) => (
            <div key={i} className={`result-item ${r.correct ? "ok" : "fail"}`}>
              <strong>Q{i + 1}</strong>
              <p>{r.task.question}</p>
              <p>Your answer: {r.answer}</p>
              <p>{r.explanation}</p>
            </div>
          ))}
        </div>
        <button onClick={showResults}>Detailed Results</button>
        <button
          className="btn-secondary"
          onClick={() => {
            setExamTasks([]);
            setAnswers([]);
            setResults([]);
            setCurrentIndex(0);
            setSubmitting(false);
          }}
        >
          New Exam
        </button>
      </div>
    );
  }

  const hasResult = results[currentIndex];

  return (
    <div className="exam-page">
      <div className="exam-progress-header">
        <h2>📝 Exam Mode</h2>
        <span className="exam-counter">
          Task {currentIndex + 1} of {examTasks.length}
        </span>
      </div>

      <div className="exam-progress-bar">
        <div
          className="exam-progress-fill"
          style={{
            width: `${((currentIndex + (hasResult ? 1 : 0)) / examTasks.length) * 100}%`,
          }}
        />
      </div>

      <div className="task-card exam-task">
        <div className="task-header">
          <span className="task-topic">Task {currentIndex + 1}</span>
          <span
            className="task-diff"
            style={{
              background:
                task.difficulty === "easy"
                  ? "#22c55e"
                  : task.difficulty === "medium"
                  ? "#f59e0b"
                  : "#ef4444",
            }}
          >
            {task.difficulty}
          </span>
        </div>
        <p className="task-question">{task.question}</p>

        <div className="task-answer-section">
          <textarea
            value={answers[currentIndex]}
            onChange={(e) => updateAnswer(e.target.value)}
            placeholder="Your answer (show steps if needed)..."
            rows={4}
            disabled={hasResult || checking}
          />
        </div>

        {!hasResult && !checking && (
          <div className="exam-actions">
            <button onClick={checkAnswer} disabled={!answers[currentIndex].trim()}>
              Check Answer
            </button>
          </div>
        )}

        {checking && <p className="loading">Checking your answer...</p>}

        {hasResult && (
          <div className={`task-feedback ${hasResult.correct ? "correct" : "wrong"}`}>
            <p>{hasResult.explanation}</p>
          </div>
        )}

        {hasResult && currentIndex + 1 < examTasks.length && (
          <div className="exam-actions">
            <button onClick={nextTask}>Next Task →</button>
          </div>
        )}

        {hasResult && currentIndex + 1 >= examTasks.length && (
          <div className="exam-actions">
            <button onClick={showResults}>See Results</button>
          </div>
        )}
      </div>

      {/* Task navigation */}
      <div className="exam-task-nav">
        {examTasks.map((t, i) => (
          <button
            key={t.id}
            className={`task-dot ${i === currentIndex ? "current" : ""} ${
              results[i] ? (results[i].correct ? "done-ok" : "done-fail") : ""
            }`}
            onClick={() => setCurrentIndex(i)}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
