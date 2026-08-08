import Link from "next/link";
import { db } from "@/lib/db";
import { getReviewQueue } from "@/lib/queries";
import { ReviewSession } from "@/components/ReviewSession";

export const dynamic = "force-dynamic";

export default function RevisaoPage() {
  const queue = getReviewQueue();

  if (queue.length === 0) {
    const next = db
      .prepare(
        `SELECT MIN(s.due) AS d FROM scheduling s JOIN cards c ON c.id = s.card_id
         WHERE c.suspended = 0 AND s.state != 0`
      )
      .get() as { d: string | null };
    const nextText = next.d
      ? new Date(next.d).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
      : null;
    return (
      <section className="sec">
        <div className="sec-head">
          <span className="n">3</span>
          <h2>Revisão</h2>
        </div>
        <div className="empty">
          <p style={{ fontWeight: 650 }}>Nada pra revisar agora.</p>
          <p className="sub">
            {nextText
              ? `A próxima revisão vence em ${nextText}. Espaçar é o método: revisar antes da hora só gasta o seu tempo.`
              : "Você ainda não tem cartões. Crie uma área e alguns cartões primeiro."}
          </p>
          <Link href={nextText ? "/" : "/areas"} className="btn">
            {nextText ? "Voltar ao painel" : "Ir pra Áreas"}
          </Link>
        </div>
      </section>
    );
  }

  return <ReviewSession items={queue} />;
}
