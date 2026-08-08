import { recentSessions, reviewsByDay, totals } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default function HistoricoPage() {
  const days = reviewsByDay(30);
  const sessions = recentSessions(15);
  const t = totals();
  const maxDay = Math.max(1, ...days.map((d) => d.count));
  const totalMin = Math.round(t.timeMs / 60000);

  return (
    <>
      <section className="sec" aria-labelledby="s1">
        <div className="sec-head">
          <span className="n">4</span>
          <h2 id="s1">Histórico</h2>
        </div>
        {t.reviews === 0 ? (
          <div className="empty">
            <p style={{ fontWeight: 650 }}>Nenhuma revisão feita ainda.</p>
            <p className="sub">Depois da primeira sessão, aqui entram os seus dias de estudo, a taxa de acerto e as sessões.</p>
          </div>
        ) : (
          <p className="assignment" style={{ fontSize: 18 }}>
            <span className="num">{t.reviews.toLocaleString("pt-BR")}</span> revisões no total, uns{" "}
            <span className="num">{totalMin}</span> min de prática registrada.
          </p>
        )}
      </section>

      {days.length > 0 && (
        <section className="sec" aria-labelledby="s2">
          <div className="sec-head">
            <span className="n">4.1</span>
            <h2 id="s2">Últimos 30 dias</h2>
            <span className="aside">revisões por dia e quanto você lembrou</span>
          </div>
          <div className="loadchart" role="img" aria-label="Revisões por dia nos últimos 30 dias">
            {days.map((d) => (
              <div key={d.day} className="col" title={`${d.day}: ${d.count} revisões, ${d.correct} lembradas`}>
                <span className="v">{d.count}</span>
                <span className="bar" style={{ height: `${Math.max(6, Math.round((d.count / maxDay) * 64))}px` }} />
                <span className="d">{d.day.slice(8)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {sessions.length > 0 && (
        <section className="sec" aria-labelledby="s3">
          <div className="sec-head">
            <span className="n">4.2</span>
            <h2 id="s3">Sessões</h2>
          </div>
          <table style={{ maxWidth: 640 }}>
            <thead>
              <tr>
                <th>Quando</th>
                <th className="r">Exercícios</th>
                <th className="r">Lembrou de primeira</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td>
                    {new Date(s.started_at + "Z").toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="r">{s.review_count}</td>
                  <td className="r">
                    {s.review_count > 0 ? `${Math.round((s.correct_count / s.review_count) * 100)}%` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="sub" style={{ marginTop: 10, maxWidth: "70ch" }}>
            Taxa de acerto muito alta o tempo todo não é troféu: pode ser sinal de revisão cedo demais. O
            agendador mira a sua meta de retenção gastando o mínimo de revisões.
          </p>
        </section>
      )}
    </>
  );
}
