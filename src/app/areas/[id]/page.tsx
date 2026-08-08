import Link from "next/link";
import { notFound } from "next/navigation";
import { getArea, listAreas, listCards, listConcepts } from "@/lib/queries";
import { explainCompetency } from "@/lib/learner";
import { CARD_TYPE_LABEL, LEVEL_LABEL, PRIORITY_LABEL } from "@/lib/types";
import { createCardAction, createConceptAction, deleteCardAction, toggleSuspendAction } from "@/app/actions";
import { Segbar } from "@/components/Segbar";
import { ConfirmButton } from "@/components/ConfirmButton";
import { GeneratePanel } from "@/components/GeneratePanel";
import { getSetting } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AreaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const areaId = Number(id);
  const area = getArea(areaId);
  if (!area) notFound();

  const chapterIndex = listAreas().findIndex((a) => a.id === areaId) + 1;
  const concepts = listConcepts(areaId);
  const hasKey = Boolean(getSetting("anthropic_api_key", "") || process.env.ANTHROPIC_API_KEY);

  return (
    <>
      <section className="sec" aria-labelledby="s1">
        <div className="sec-head">
          <span className="n">{chapterIndex}</span>
          <h2 id="s1">{area.name}</h2>
          {area.description && <span className="aside">{area.description}</span>}
        </div>
        <p className="sub" style={{ maxWidth: "70ch" }}>
          <Link href="/areas">Todas as áreas</Link> · Cada conceito mostra o nível de domínio que as evidências
          sustentam e a retenção estimada dos cartões dele. O link &quot;por quê?&quot; abre a justificativa.
        </p>
      </section>

      <section className="sec" aria-labelledby="s2">
        <div className="sec-head">
          <span className="n">{chapterIndex}.1</span>
          <h2 id="s2">Conceitos</h2>
          <span className="aside">{concepts.length === 0 ? "nenhum ainda" : `${concepts.length}`}</span>
        </div>

        {concepts.length === 0 && (
          <div className="empty">
            <p style={{ fontWeight: 650 }}>Conceito é uma ideia que você quer dominar, tipo &quot;phrasal verbs de trabalho&quot; ou &quot;ponteiros em C&quot;.</p>
            <p className="sub">Crie um manualmente na seção {chapterIndex}.2, ou cole um material na seção {chapterIndex}.3 e deixe a IA propor.</p>
          </div>
        )}

        {concepts.map((c, ci) => {
          const cards = listCards(c.id);
          const k = c.competency;
          const unknown = !k || k.unknown === 1;
          return (
            <div key={c.id} className="concept">
              <div className="concept-head">
                <span className="n">{chapterIndex}.1.{ci + 1}</span>
                <span className="name">{c.name}</span>
                <span className="chip" title="Prioridade deste conceito na agenda">{PRIORITY_LABEL[c.priority]}</span>
                <span className="right">
                  {unknown ? (
                    <span className="chip chip-unknown" title="Ainda não há evidência suficiente. Diferente de não saber.">
                      sem evidência suficiente
                    </span>
                  ) : (
                    <>
                      <span className="chip chip-spot">{LEVEL_LABEL[k.level]}</span>
                      <Segbar value={k.retention} />
                      <span className="sub">
                        {k.retention !== null ? `${Math.round(k.retention * 100)}%` : "sem cartões revisados"}
                        {" · confiança "}
                        {k.confidence < 0.35 ? "baixa" : k.confidence < 0.7 ? "média" : "alta"}
                      </span>
                    </>
                  )}
                </span>
              </div>
              {c.description && <p className="sub" style={{ margin: "6px 0 0 46px", maxWidth: "70ch" }}>{c.description}</p>}

              <details className="why">
                <summary>por quê?</summary>
                <p>{explainCompetency(c.id)}</p>
              </details>

              {cards.map((card) => {
                return (
                  <div key={card.id} className={`cardrow${card.suspended ? " suspended" : ""}`}>
                    <span className="exn">Ex. {String(card.id).padStart(3, "0")}</span>
                    <span className="front" title={card.front}>{card.front}</span>
                    <span className="chip">{CARD_TYPE_LABEL[card.type]}</span>
                    {card.source === "ai" && <span className="chip" title="Gerado por IA e aprovado por você">IA</span>}
                    <form action={toggleSuspendAction.bind(null, card.id, areaId)}>
                      <button className="btn-quiet" title={card.suspended ? "Voltar a revisar este cartão" : "Pausar este cartão sem apagar"}>
                        {card.suspended ? "reativar" : "pausar"}
                      </button>
                    </form>
                    <form action={deleteCardAction.bind(null, card.id, areaId)}>
                      <ConfirmButton className="btn-quiet" message={`Excluir o cartão "${card.front.slice(0, 60)}" e todo o histórico dele?`}>
                        excluir
                      </ConfirmButton>
                    </form>
                  </div>
                );
              })}
            </div>
          );
        })}

        <form action={createConceptAction} style={{ marginTop: 20, maxWidth: 700 }}>
          <input type="hidden" name="area_id" value={areaId} />
          <div className="frow">
            <div className="field" style={{ flex: 2 }}>
              <label htmlFor="c-name">Novo conceito</label>
              <input id="c-name" type="text" name="name" required maxLength={120} placeholder="Nome do conceito" />
            </div>
            <div className="field">
              <label htmlFor="c-priority">Prioridade</label>
              <select id="c-priority" name="priority" defaultValue="medium">
                <option value="critical">Crítico</option>
                <option value="high">Alta</option>
                <option value="medium">Média</option>
                <option value="low">Baixa</option>
              </select>
            </div>
            <div className="field" style={{ alignSelf: "flex-end", flex: "0 0 auto" }}>
              <button type="submit">Criar conceito</button>
            </div>
          </div>
          <div className="field">
            <label htmlFor="c-desc">Descrição (opcional)</label>
            <input id="c-desc" type="text" name="description" maxLength={300} placeholder="O que é e por que importa" />
          </div>
        </form>
      </section>

      {concepts.length > 0 && (
        <section className="sec" aria-labelledby="s3">
          <div className="sec-head">
            <span className="n">{chapterIndex}.2</span>
            <h2 id="s3">Novo cartão</h2>
            <span className="aside">um cartão testa uma única ideia</span>
          </div>
          <form action={createCardAction} style={{ maxWidth: 700 }}>
            <input type="hidden" name="area_id" value={areaId} />
            <div className="frow">
              <div className="field" style={{ flex: 2 }}>
                <label htmlFor="k-concept">Conceito</label>
                <select id="k-concept" name="concept_id" required>
                  {concepts.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="k-type">Tipo</label>
                <select id="k-type" name="type" defaultValue="basic">
                  <option value="basic">Pergunta e resposta</option>
                  <option value="cloze">Lacuna (marque com {"{{...}}"})</option>
                  <option value="production">Produção (você formula)</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="k-front">Frente</label>
              <textarea id="k-front" name="front" required maxLength={600} placeholder={'Ex.: "There was an {{awkward}} silence after he said that."'} />
            </div>
            <div className="field">
              <label htmlFor="k-back">Verso</label>
              <textarea id="k-back" name="back" required maxLength={600} placeholder="A resposta objetiva" />
            </div>
            <div className="field">
              <label htmlFor="k-ctx">Contexto (opcional)</label>
              <input id="k-ctx" type="text" name="context" maxLength={300} placeholder="De onde veio ou quando isso aparece na vida real" />
            </div>
            <button type="submit" className="btn-primary">Criar cartão</button>
          </form>
        </section>
      )}

      <section className="sec" aria-labelledby="s4">
        <div className="sec-head">
          <span className="n">{chapterIndex}.{concepts.length > 0 ? 3 : 2}</span>
          <h2 id="s4">Analisar material com IA</h2>
          <span className="aside">a IA propõe, você aprova</span>
        </div>
        <GeneratePanel areaId={areaId} areaName={area.name} hasKey={hasKey} />
      </section>
    </>
  );
}
