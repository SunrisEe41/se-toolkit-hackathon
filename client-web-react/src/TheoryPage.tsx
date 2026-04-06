import { useEffect, useState } from "react";
import "./App.css";

interface Topic {
  id: number;
  slug: string;
  title: string;
  description: string;
}

interface Theory {
  id: number;
  topic_id: number;
  title: string;
  content: string;
}

export function TheoryPage({ apiKey }: { apiKey: string }) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [theory, setTheory] = useState<Theory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const headers = { Authorization: `Bearer ${apiKey}` };

  useEffect(() => {
    if (!apiKey) return;
    fetch("/exam/topics/", { headers })
      .then((r) => r.json())
      .then(setTopics)
      .catch((e) => setError(e.message));
  }, [apiKey]);

  useEffect(() => {
    if (!selectedSlug) return;
    setLoading(true);
    setError("");
    fetch(`/exam/theory/${selectedSlug}`, { headers })
      .then((r) => r.json())
      .then((data) => {
        setTheory(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [selectedSlug]);

  // Simple markdown-like formatting
  function renderContent(text: string) {
    return text.split("\n").map((line, i) => {
      // Bold: **text**
      let content = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      // Inline code
      content = content.replace(/`(.+?)`/g, "<code>$1</code>");

      if (line.startsWith("- ") || line.startsWith("* ")) {
        return (
          <li key={i} dangerouslySetInnerHTML={{ __html: content.slice(2) }} />
        );
      }
      if (/^\d+\.\s/.test(line)) {
        return (
          <li key={i} dangerouslySetInnerHTML={{ __html: content }} />
        );
      }
      if (line.startsWith("### ")) {
        return (
          <h3 key={i} dangerouslySetInnerHTML={{ __html: content.slice(4) }} />
        );
      }
      if (line.trim() === "") return <br key={i} />;
      return (
        <p key={i} dangerouslySetInnerHTML={{ __html: content }} />
      );
    });
  }

  return (
    <div className="theory-page">
      <h2>📚 Exam Theory</h2>

      <div className="theory-topics">
        {topics.map((t) => (
          <button
            key={t.id}
            className={selectedSlug === t.slug ? "active" : ""}
            onClick={() => setSelectedSlug(t.slug)}
          >
            {t.title}
          </button>
        ))}
      </div>

      {selectedSlug && (
        <div className="theory-content">
          {loading && <p>Loading...</p>}
          {error && <p className="error">{error}</p>}
          {!loading &&
            !error &&
            theory.map((th) => (
              <div key={th.id} className="theory-card">
                <h3>{th.title}</h3>
                <div className="theory-text">{renderContent(th.content)}</div>
              </div>
            ))}
          {!loading && !error && theory.length === 0 && (
            <p>No theory pages for this topic yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
