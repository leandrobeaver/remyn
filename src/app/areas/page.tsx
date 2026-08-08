import Link from "next/link";
import { listAreas } from "@/lib/queries";
import { createAreaAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default function AreasPage() {
  const areas = listAreas();
  return (
    <>
      <section className="sec" aria-labelledby="s1">
        <div className="sec-head">
          <span className="n">2</span>
          <h2 id="s1">Áreas de estudo</h2>
          <span className="aside">{areas.length === 0 ? "nenhuma ainda" : `${areas.length} ${areas.length === 1 ? "área" : "áreas"}`}</span>
        </div>

        {areas.length === 0 ? (
          <div className="empty">
            <p style={{ fontWeight: 650 }}>Área é um assunto grande: Inglês, Programação, Vendas.</p>
            <p className="sub">
              Dentro de cada área vivem os conceitos, e cada conceito tem seus cartões e, nas próximas fases,
              exercícios e projetos. Crie a primeira aqui embaixo.
            </p>
          </div>
        ) : (
          <div>
            {areas.map((a, i) => (
              <div key={a.id} className="chapter">
                <span className="n">{i + 1}</span>
                <div className="body">
                  <Link href={`/areas/${a.id}`} className="name">
                    {a.name}
                  </Link>
                  {a.description && <div className="sub">{a.description}</div>}
                </div>
                <span className="stats">
                  {a.concepts} {a.concepts === 1 ? "conceito" : "conceitos"} · {a.cards}{" "}
                  {a.cards === 1 ? "cartão" : "cartões"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="sec" aria-labelledby="s2">
        <div className="sec-head">
          <span className="n">2.{areas.length + 1}</span>
          <h2 id="s2">Nova área</h2>
        </div>
        <form action={createAreaAction} style={{ maxWidth: 560 }}>
          <div className="field">
            <label htmlFor="area-name">Nome</label>
            <input id="area-name" type="text" name="name" required maxLength={80} placeholder="Inglês" />
          </div>
          <div className="field">
            <label htmlFor="area-desc">Pra que você quer aprender isso (opcional)</label>
            <input
              id="area-desc"
              type="text"
              name="description"
              maxLength={200}
              placeholder="Conversar com clientes gringos sem travar"
            />
          </div>
          <button type="submit" className="btn-primary">Criar área</button>
        </form>
      </section>
    </>
  );
}
