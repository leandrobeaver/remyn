import { getSetting } from "@/lib/db";
import { saveSettingsAction, wipeHistoryAction } from "@/app/actions";
import { ConfirmButton } from "@/components/ConfirmButton";

export const dynamic = "force-dynamic";

export default function AjustesPage() {
  const hasKey = Boolean(getSetting("anthropic_api_key", "") || process.env.ANTHROPIC_API_KEY);
  const model = getSetting("ai_model", "claude-sonnet-5");
  const retention = getSetting("request_retention", "0.9");
  const newLimit = getSetting("daily_new_limit", "6");
  const reviewLimit = getSetting("daily_review_limit", "60");

  return (
    <>
      <section className="sec" aria-labelledby="s1">
        <div className="sec-head">
          <span className="n">5</span>
          <h2 id="s1">Ajustes</h2>
        </div>
        <form action={saveSettingsAction} style={{ maxWidth: 620 }}>
          <div className="field">
            <label htmlFor="key">Chave da API Anthropic {hasKey && <span className="chip chip-spot">configurada</span>}</label>
            <input
              id="key"
              type="password"
              name="anthropic_api_key"
              placeholder={hasKey ? "Deixe em branco pra manter a atual" : "sk-ant-…"}
              autoComplete="off"
            />
            <p className="sub" style={{ margin: "4px 0 0" }}>
              Fica gravada só no banco local. É usada apenas quando você manda analisar um material.
            </p>
          </div>
          <div className="frow">
            <div className="field">
              <label htmlFor="model">Modelo de IA</label>
              <input id="model" type="text" name="ai_model" defaultValue={model} />
            </div>
            <div className="field">
              <label htmlFor="ret">Meta de retenção (0.80 a 0.95)</label>
              <input id="ret" type="number" name="request_retention" step="0.01" min="0.8" max="0.95" defaultValue={retention} />
            </div>
          </div>
          <div className="frow">
            <div className="field">
              <label htmlFor="newl">Cartões novos por dia</label>
              <input id="newl" type="number" name="daily_new_limit" min="0" max="50" defaultValue={newLimit} />
            </div>
            <div className="field">
              <label htmlFor="revl">Limite de revisões por dia</label>
              <input id="revl" type="number" name="daily_review_limit" min="10" max="500" defaultValue={reviewLimit} />
            </div>
          </div>
          <p className="sub" style={{ maxWidth: "66ch" }}>
            Meta de retenção mais alta = mais revisões. 0.90 é um bom equilíbrio; o objetivo do REMYN é o mínimo
            de revisões sem deixar a memória cair, não o máximo de estudo dentro do app.
          </p>
          <button type="submit" className="btn-primary">Salvar ajustes</button>
        </form>
      </section>

      <section className="sec" aria-labelledby="s2">
        <div className="sec-head">
          <span className="n">5.1</span>
          <h2 id="s2">Seus dados</h2>
        </div>
        <p className="sub" style={{ maxWidth: "70ch" }}>
          Tudo mora num SQLite local (<code>data/remyn.db</code>). Nada sai da sua máquina, a não ser o material
          que você explicitamente manda a IA analisar.
        </p>
        <div className="bigact">
          <a href="/api/export" className="btn" download>
            Exportar tudo (JSON)
          </a>
          <form action={wipeHistoryAction}>
            <ConfirmButton
              className="btn-quiet"
              message="Apagar TODO o histórico de revisões, sessões e evidências, e zerar o agendamento dos cartões? Os cartões e conceitos ficam. Não tem volta."
            >
              Apagar histórico de aprendizagem
            </ConfirmButton>
          </form>
        </div>
      </section>

      <section className="sec" aria-labelledby="s3">
        <div className="sec-head">
          <span className="n">5.2</span>
          <h2 id="s3">Como o REMYN pensa</h2>
        </div>
        <div style={{ maxWidth: "70ch" }}>
          <p>
            Cartão certo não vira prova de domínio: revisão só gera evidência até o nível &quot;Lembra&quot;. Os
            níveis de cima (Explica, Aplica, Transfere, Cria e ensina) exigem perguntas abertas, exercícios e
            projetos, que chegam nas próximas fases.
          </p>
          <p>
            &quot;Sem evidência&quot; é diferente de &quot;não sabe&quot;: o sistema só afirma o que consegue
            apontar em evidências. Todo número tem um &quot;por quê?&quot; na página do conceito.
          </p>
        </div>
      </section>
    </>
  );
}
