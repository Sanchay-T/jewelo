"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  SampleBoard,
  SampleItem,
  SampleVerdict,
} from "@/lib/sample-images-board";
import styles from "./board.module.css";

const EMPTY: SampleBoard = {
  updatedAt: "",
  status: "Loading…",
  items: [],
  messages: [],
};

export default function SampleImagesPage() {
  const [board, setBoard] = useState<SampleBoard>(EMPTY);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/sample-images", { cache: "no-store" });
      if (!response.ok) throw new Error(`board ${response.status}`);
      const next = (await response.json()) as SampleBoard;
      setBoard(next);
      setError(null);
      setActiveId((current) => current ?? next.items[0]?.id ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "board failed");
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 4000);
    return () => window.clearInterval(timer);
  }, [load]);

  const active = useMemo(
    () => board.items.find((item) => item.id === activeId) ?? board.items[0],
    [activeId, board.items],
  );

  async function send(partial: {
    verdict?: SampleVerdict;
    text?: string;
    imageId?: string;
  }) {
    const text = (partial.text ?? draft).trim();
    if (!text && !partial.verdict) return;
    setBusy(true);
    try {
      const response = await fetch("/api/sample-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "feedback",
          from: "sanchay",
          imageId: partial.imageId ?? active?.id,
          verdict: partial.verdict,
          text,
        }),
      });
      if (!response.ok) throw new Error(`save ${response.status}`);
      setBoard((await response.json()) as SampleBoard);
      setDraft("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.top}>
        <div>
          <p className={styles.kicker}>Jewelo · travel board</p>
          <h1>Sample images</h1>
        </div>
        <p className={styles.status}>{board.status}</p>
      </header>

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.layout}>
        <section className={styles.viewer} aria-label="Active still">
          {active ? (
            <>
              <img src={active.src} alt={active.title} />
              <div className={styles.meta}>
                <h2>{active.title}</h2>
                <p>
                  {active.look} · {active.env} · {active.font}
                </p>
                <p className={styles.note}>{active.agentNote}</p>
                <p className={styles.verdict} data-v={active.verdict}>
                  {active.verdict}
                </p>
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void send({ verdict: "pass", text: "Pass" })}
                >
                  Pass
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void send({ verdict: "tweak", text: "Tweak" })}
                >
                  Tweak
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void send({ verdict: "fail", text: "Fail" })}
                >
                  Fail
                </button>
              </div>
            </>
          ) : (
            <p>No stills yet.</p>
          )}
        </section>

        <aside className={styles.side}>
          <h3>Filmstrip</h3>
          <div className={styles.strip}>
            {board.items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={item.id === active?.id ? styles.on : undefined}
                onClick={() => setActiveId(item.id)}
              >
                <img src={item.src} alt="" />
                <span data-v={item.verdict}>{item.title}</span>
              </button>
            ))}
          </div>

          <h3>Talk to the agent</h3>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="What to change, what to generate next, a name, a look…"
            rows={4}
          />
          <button
            type="button"
            className={styles.send}
            disabled={busy || !draft.trim()}
            onClick={() => void send({ text: draft })}
          >
            Send note
          </button>

          <ol className={styles.feed}>
            {[...board.messages].reverse().map((message) => (
              <li key={message.id} data-from={message.from}>
                <strong>{message.from}</strong>
                {message.verdict ? ` · ${message.verdict}` : ""}
                {message.imageId ? ` · ${labelFor(board.items, message.imageId)}` : ""}
                <span>{message.text}</span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </main>
  );
}

function labelFor(items: SampleItem[], id: string) {
  return items.find((item) => item.id === id)?.title ?? id;
}
