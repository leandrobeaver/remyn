"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { endSessionAction, gradeCardAction, startSessionAction } from "@/app/actions";
import type { QueueItem } from "@/lib/types";

const GRADES = [
  { rating: 1 as const, label: "De novo", className: "grade-again", hint: "esqueci" },
  { rating: 2 as const, label: "Difícil", className: "grade-hard", hint: "quase" },
  { rating: 3 as const, label: "Bom", className: "grade-good", hint: "lembrei" },
  { rating: 4 as const, label: "Fácil", className: "grade-easy", hint: "tranquilo" },
];

function ClozeFront({ text, revealed }: { text: string; revealed: boolean }) {
  const parts = text.split(/(\{\{.+?\}\})/g);
  return (
    <>
      {parts.map((p, i) => {
        const m = p.match(/^\{\{(.+?)\}\}$/);
        if (!m) return <span key={i}>{p}</span>;
        return revealed ? (
          <span key={i} style={{ color: "var(--spot)", borderBottom: "2px solid var(--spot)" }}>
            {m[1]}
          </span>
        ) : (
          <span key={i} className="gap" aria-label="lacuna">
            {" ".repeat(Math.max(6, Math.min(14, m[1].length)))}
          </span>
        );
      })}
    </>
  );
}

export function ReviewSession({ items }: { items: QueueItem[] }) {
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [finished, setFinished] = useState(false);
  const [lastDue, setLastDue] = useState("");
  const [counts, setCounts] = useState({ 1: 0, 2: 0, 3: 0, 4: 0 });
  const sessionRef = useRef<number | null>(null);
  const shownAtRef = useRef<number>(Date.now());
  const totalMsRef = useRef<number>(0);
  const router = useRouter();

  const item = items[idx];
  const total = items.length;

  const grade = useCallback(
    async (rating: 1 | 2 | 3 | 4) => {
      if (busy || !revealed || finished) return;
      setBusy(true);
      try {
        if (sessionRef.current === null) sessionRef.current = await startSessionAction();
        const elapsed = Math.min(120000, Date.now() - shownAtRef.current);
        totalMsRef.current += elapsed;
        const out = await gradeCardAction(item.card.id, rating, elapsed, sessionRef.current);
        setCounts((c) => ({ ...c, [rating]: c[rating] + 1 }));
        setLastDue(`Ex. ${String(item.card.id).padStart(3, "0")} ${out.dueText}`);
        if (idx + 1 >= total) {
          setFinished(true);
          if (sessionRef.current !== null) await endSessionAction(sessionRef.current);
        } else {
          setIdx(idx + 1);
          setRevealed(false);
          shownAtRef.current = Date.now();
        }
      } finally {
        setBusy(false);
      }
    },
    [busy, revealed, finished, idx, total, item, router]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (finished) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if ((e.key === " " || e.key === "Enter") && !revealed) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed && ["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        void grade(Number(e.key) as 1 | 2 | 3 | 4);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, finished, grade]);

  if (finished) {
    const done = counts[1] + counts[2] + counts[3] + counts[4];
    const ok = counts[3] + counts[4];
    const minutes = Math.max(1, Math.round(totalMsRef.current / 60000));
    return (
      <div className="exsheet">
        <section className="sec">
          <div className="sec-head">
            <span className="n">3</span>
            <h2>Sessão concluída</h2>
          </div>
          <p className="assignment">
            <span className="num">{done}</span> {done === 1 ? "exercício" : "exercícios"} em uns{" "}
            <span className="num">{minutes}</span> min. Você lembrou{" "}
            <span className="num">{done > 0 ? Math.round((ok / done) * 100) : 0}%</span> de primeira.
          </p>
          <table style={{ maxWidth: 420 }}>
            <tbody>
              {GRADES.map((g) => (
                <tr key={g.rating}>
                  <td>{g.label}</td>
                  <td className="r">{counts[g.rating]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="sub" style={{ maxWidth: "64ch" }}>
            Cada resposta virou evidência no seu modelo de conhecimento e reagendou o cartão pelo FSRS. Errar
            também alimenta o modelo: erro aqui é dado, não punição.
          </p>
          <div className="bigact" style={{ marginTop: 16 }}>
            <button
              className="btn-primary"
              onClick={() => {
                router.push("/");
                router.refresh();
              }}
            >
              Voltar ao painel
            </button>
            <button
              onClick={() => {
                router.push("/historico");
                router.refresh();
              }}
            >
              Ver histórico
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="exsheet">
      <div className="exmeta">
        <span className="exnum">Ex. {String(item.card.id).padStart(3, "0")}</span>
        <span className="crumb">
          {item.area.name} · {item.concept.name}
          {item.isNew && " · novo"}
        </span>
        <span className="count">
          {idx + 1} / {total}
        </span>
      </div>
      <div className="progressrule" aria-hidden="true">
        <span style={{ transform: `scaleX(${idx / total})` }} />
      </div>

      <p className="q">
        {item.card.type === "cloze" ? (
          <ClozeFront text={item.card.front} revealed={revealed} />
        ) : (
          item.card.front
        )}
      </p>
      {item.card.type === "production" && !revealed && (
        <p className="sub">Formule a resposta em voz alta ou de cabeça antes de virar.</p>
      )}

      {revealed ? (
        <>
          <div className="answer print-in">
            {(item.card.type !== "cloze" || item.card.back.trim() !== "") && (
              <p className="a" style={{ margin: 0 }}>{item.card.back}</p>
            )}
            {item.card.context && <p className="ctx sub">{item.card.context}</p>}
          </div>
          <div className="grades" role="group" aria-label="Como foi lembrar isso">
            {GRADES.map((g) => (
              <button key={g.rating} className={`grade ${g.className}`} onClick={() => grade(g.rating)} disabled={busy}>
                <span className="kbd">{g.rating}</span>
                {g.label}
                <small>{g.hint}</small>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="revealbar">
          <button onClick={() => setRevealed(true)} autoFocus>
            Mostrar resposta <span className="sub" style={{ marginLeft: 8 }}>espaço</span>
          </button>
        </div>
      )}

      {lastDue && (
        <p className="sub" style={{ marginTop: 40, textAlign: "center" }} aria-live="polite">
          {lastDue}
        </p>
      )}
    </div>
  );
}
