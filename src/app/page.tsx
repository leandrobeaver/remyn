import Link from "next/link";
import { dashboardAreas, fragileConcepts, getDailyPlan, totals } from "@/lib/queries";
import { LEVEL_LABEL, PRIORITY_LABEL } from "@/lib/types";
import { Segbar } from "@/components/Segbar";

export const dynamic = "force-dynamic";

const WEEKDAY = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export default function Dashboard() {
  const plan = getDailyPlan();
  const areas = dashboardAreas();
  const fragile = fragileConcepts(5);
  const t = totals();
  const hasContent = t.cards > 0;
  const maxProj = Math.max(1, ...plan.projection.map((p) => p.count));

  return (
    <>
      <section className="sec" aria-labelledby="s1">
        <div className="sec-head">
          <span className="n">1</span>
          <h2 id="s1">Hoje</h2>
          {t.reviews > 0 && (
            <span className="aside">{t.reviews.toLocaleString("pt-BR")} revisões feitas até aqui</span>
          )}
        </div>

        {!hasContent ? (
          <div className="empty">
            <p style={{ fontWeight: 650 }}>Seu caderno ainda está em branco.</p>
            <ol>
              <li>Crie uma área de estudo (um assunto grande, tipo Inglês ou Programação).</li>
              <li>Dentro dela, crie conceitos e cartões, ou cole um material e deixe a IA propor só o que vale a pena.</li>
              <li>Volte aqui e faça a sessão do dia.</li>
            </ol>
            <Link href="/areas" className="btn btn-primary">
              Criar a primeira área
            </Link>
          </div>
        ) : (
          <>
            <p className="assignment">
              {plan.dueNow === 0 && plan.newAllowed === 0 ? (
                <>Nada vence agora. A memória aguenta sozinha por enquanto; volte quando a fila chamar.</>
              ) : (
                <>
                  Para hoje: <span className="num">{Math.min(plan.dueNow, plan.reviewLimit)}</span>{" "}
                  {plan.dueNow === 1 ? "revisão" : "revisões"}
                  {plan.newAllowed > 0 && (
                    <>
                      {" "}e <span className="num">{plan.newAllowed}</span> {plan.newAllowed === 1 ? "cartão novo" : "cartões novos"}
                    </>
                  )}
                  , uns <span className="num">{plan.estimatedMinutes}</span> min.
                </>
              )}
            </p>
            {(plan.dueNow > 0 || plan.newAllowed > 0) && (
              <div className="bigact">
                <Link href="/revisao" className="btn btn-primary">
                  Começar a sessão
                </Link>
                {plan.backlog > 0 && (
                  <span className="sub">{plan.backlog} vencidas de dias anteriores estão incluídas.</span>
                )}
              </div>
            )}
            {plan.overloaded && (
              <div className="note">
                <span className="tag">NOTA</span>
                <span>
                  A fila passou do seu limite diário ({plan.reviewLimit}). Cartões novos ficam pausados até ela
                  baixar; a sessão prioriza os conceitos críticos primeiro.
                </span>
              </div>
            )}
          </>
        )}
      </section>

      {hasContent && (
        <section className="sec" aria-labelledby="s2">
          <div className="sec-head">
            <span className="n">2</span>
            <h2 id="s2">Mapa de competência</h2>
            <span className="aside">retenção estimada por área · tracejado = sem evidência</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Área</th>
                <th>Retenção</th>
                <th>Nível médio</th>
                <th className="r">Sem evidência</th>
              </tr>
            </thead>
            <tbody>
              {areas.map((a, i) => (
                <tr key={a.area.id}>
                  <td>
                    <span className="num" style={{ marginRight: 10 }}>{i + 1}</span>
                    <Link href={`/areas/${a.area.id}`} style={{ color: "inherit", fontWeight: 650 }}>
                      {a.area.name}
                    </Link>{" "}
                    <span className="sub">{a.conceptCount} {a.conceptCount === 1 ? "conceito" : "conceitos"}</span>
                  </td>
                  <td>
                    <Segbar value={a.avgRetention} unknown={a.testedCount === 0} />{" "}
                    <span className="sub">{a.avgRetention !== null ? `${Math.round(a.avgRetention * 100)}%` : "ainda não medida"}</span>
                  </td>
                  <td>
                    {a.testedCount > 0 ? (
                      <span className="chip chip-spot">{LEVEL_LABEL[Math.round(a.avgLevel)]}</span>
                    ) : (
                      <span className="chip chip-unknown">não testado</span>
                    )}
                  </td>
                  <td className="r">{a.unknownCount > 0 ? `${a.unknownCount} de ${a.conceptCount}` : "0"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="sub" style={{ marginTop: 10, maxWidth: "70ch" }}>
            Sem evidência quer dizer que o sistema ainda não testou, e isso é diferente de você não saber.
            Retenção mede memória; competência de verdade (explicar, aplicar, transferir) entra nas próximas fases.
          </p>
        </section>
      )}

      {hasContent && (
        <section className="sec" aria-labelledby="s3">
          <div className="sec-head">
            <span className="n">3</span>
            <h2 id="s3">Carga dos próximos 14 dias</h2>
            <span className="aside">revisões que vencem por dia</span>
          </div>
          <div className="loadchart" role="img" aria-label={`Projeção de carga: máximo de ${maxProj} revisões num dia nos próximos 14 dias`}>
            {plan.projection.map((p, i) => {
              const d = new Date(p.day + "T12:00:00");
              return (
                <div key={p.day} className={`col${i === 0 ? " today" : ""}`}>
                  {p.count > 0 && <span className="v">{p.count}</span>}
                  <span
                    className="bar"
                    style={{ height: `${Math.max(p.count > 0 ? 6 : 1, Math.round((p.count / maxProj) * 64))}px` }}
                  />
                  <span className="d">{i === 0 ? "hoje" : WEEKDAY[d.getDay()]}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {fragile.length > 0 && (
        <section className="sec" aria-labelledby="s4">
          <div className="sec-head">
            <span className="n">4</span>
            <h2 id="s4">Frágeis agora</h2>
            <span className="aside">importância × risco de esquecer</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Conceito</th>
                <th>Prioridade</th>
                <th>Retenção</th>
                <th>Nível</th>
              </tr>
            </thead>
            <tbody>
              {fragile.map((f) => (
                <tr key={f.concept.id}>
                  <td>
                    <Link href={`/areas/${f.area.id}`} style={{ color: "inherit", fontWeight: 650 }}>
                      {f.concept.name}
                    </Link>{" "}
                    <span className="sub">{f.area.name}</span>
                  </td>
                  <td>
                    <span className="chip">{PRIORITY_LABEL[f.concept.priority]}</span>
                  </td>
                  <td>
                    <Segbar value={f.competency.retention} />{" "}
                    <span className="sub">{Math.round((f.competency.retention ?? 0) * 100)}%</span>
                  </td>
                  <td>
                    <span className="chip chip-spot">{LEVEL_LABEL[f.competency.level]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <footer className="footer">
        <span>REMYN · dados locais em SQLite, seus.</span>
        <span>
          {t.concepts} {t.concepts === 1 ? "conceito" : "conceitos"} · {t.cards}{" "}
          {t.cards === 1 ? "cartão ativo" : "cartões ativos"}
        </span>
      </footer>
    </>
  );
}
