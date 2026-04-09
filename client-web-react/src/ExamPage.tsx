import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import "./App.css";

interface Task {
  id: number;
  topic_id: number;
  question: string;
  difficulty: string;
}

interface Result {
  task: Task;
  answer: string;
  correct: boolean;
  explanation: string;
}

function MdText({ text }: { text: string }) {
  return (
    <div className="md-content">
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {text}
      </ReactMarkdown>
    </div>
  );
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
  const [results, setResults] = useState<(Result | null)[]>([]);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

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
      const tasks = data.tasks || [];
      setExamTasks(tasks);
      setCurrentIndex(0);
      setAnswers(new Array(tasks.length).fill(""));
      setResults(new Array(tasks.length).fill(null));
      setShowSummary(false);
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

      const newResults = [...results];
      newResults[currentIndex] = { task, answer, correct, explanation: reply };
      setResults(newResults);

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
        // best-effort
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

  const correctCount = results.filter((r) => r?.correct).length;
  const answeredCount = results.filter((r) => r !== null).length;
  const allDone = answeredCount === examTasks.length;

  // Setup screen
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

  // Summary screen
  if (showSummary) {
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
            {results.map((r, i) =>
              r ? (
                <div key={i} className={`result-item ${r.correct ? "ok" : "fail"}`}>
                  <strong>Q{i + 1}: {r.task.question}</strong>
                  <p>Your answer: {r.answer}</p>
                  <MdText text={r.explanation} />
                </div>
              ) : null
            )}
          </div>
          <button onClick={() => {
            setExamTasks([]);
            setAnswers([]);
            setResults([]);
            setCurrentIndex(0);
            setShowSummary(false);
          }}>
            New Exam
          </button>
        </div>
      </div>
    );
  }

  // Exam in progress
  const task = examTasks[currentIndex];
  const currentResult = results[currentIndex];

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
            width: `${(answeredCount / examTasks.length) * 100}%`,
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
            disabled={!!currentResult || checking}
          />
        </div>

        {!currentResult && !checking && (
          <div className="exam-actions">
            <button onClick={checkAnswer} disabled={!answers[currentIndex].trim()}>
              Check Answer
            </button>
          </div>
        )}

        {checking && <p className="loading">Checking your answer...</p>}

        {currentResult && (
          <div className={`task-feedback ${currentResult.correct ? "correct" : "wrong"}`}>
            <MdText text={currentResult.explanation} />
          </div>
        )}

        {currentResult && currentIndex + 1 < examTasks.length && (
          <div className="exam-actions">
            <button onClick={nextTask}>Next Task →</button>
          </div>
        )}

        {currentResult && allDone && (
          <div className="exam-actions">
            <button onClick={() => setShowSummary(true)}>
              See Results
            </button>
          </div>
        )}
      </div>

      {/* Task navigation dots */}
      <div className="exam-task-nav">
        {examTasks.map((t, i) => {
          const r = results[i];
          return (
            <button
              key={t.id}
              className={`task-dot ${i === currentIndex ? "current" : ""} ${
                r ? (r.correct ? "done-ok" : "done-fail") : ""
              }`}
              onClick={() => setCurrentIndex(i)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
