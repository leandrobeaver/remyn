"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { approveCandidatesAction, generateCardsAction } from "@/app/actions";
import type { GenerationResult } from "@/lib/types";
import { CARD_TYPE_LABEL } from "@/lib/types";

export function GeneratePanel({ areaId, areaName, hasKey }: { areaId: number; areaName: string; hasKey: boolean }) {
  const [material, setMaterial] = useState("");
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!hasKey) {
    return (
      <p className="sub" style={{ maxWidth: "70ch" }}>
        Este recurso usa a API da Anthropic e ainda não tem chave configurada. Adicione a sua em{" "}
        <Link href="/ajustes">Ajustes</Link>. Só o material que você colar aqui é enviado pra IA; o resto dos
        seus dados fica no seu computador.
      </p>
    );
  }

  const analyze = () => {
    setError("");
    setDone("");
    startTransition(async () => {
      const res = await generateCardsAction(areaId, areaName, material);
      if (res.ok) {
        setResult(res.result);
        setSelected(new Set(res.result.cartoes.map((_, i) => i)));
        if (res.result.cartoes.length === 0) {
          setError("A IA não achou nada que valesse um cartão neste material. Os motivos estão listados abaixo.");
        }
      } else {
        setError(res.error);
      }
    });
  };

  const approve = () => {
    if (!result) return;
    const approved = result.cartoes.filter((_, i) => selected.has(i));
    startTransition(async () => {
      const n = await approveCandidatesAction(areaId, approved, result.conceitos);
      setDone(`${n} ${n === 1 ? "cartão criado" : "cartões criados"}. Eles entram como novos na fila de revisão.`);
      setResult(null);
      setMaterial("");
      router.refresh();
    });
  };

  return (
    <div style={{ maxWidth: 760 }}>
      {!result && (
        <>
          <p className="sub" style={{ maxWidth: "70ch", marginTop: 0 }}>
            Cole um trecho de documentação, artigo, nota ou transcrição. A IA identifica os conceitos, aplica o
            filtro de qualidade e propõe no máximo 8 cartões de alto valor. Nada é criado sem a sua aprovação.
          </p>
          <div className="field">
            <label htmlFor="material">Material</label>
            <textarea
              id="material"
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              rows={7}
              maxLength={24000}
              placeholder="Cole o material aqui"
            />
          </div>
          <button className="btn-primary" onClick={analyze} disabled={pending || material.trim().length < 40}>
            {pending ? "Analisando o material…" : "Analisar com IA"}
          </button>
        </>
      )}

      {error && (
        <div className="note" role="alert">
          <span className="tag">NOTA</span>
          <span>{error}</span>
        </div>
      )}
      {done && (
        <div className="note" role="status">
          <span className="tag">FEITO</span>
          <span>{done}</span>
        </div>
      )}

      {result && (
        <>
          {result.cartoes.length > 0 && (
            <>
              <p style={{ fontWeight: 650 }}>
                {result.conceitos.length} conceitos identificados, {result.cartoes.length}{" "}
                {result.cartoes.length === 1 ? "cartão proposto" : "cartões propostos"}. Desmarque o que não quiser.
              </p>
              {result.cartoes.map((c, i) => (
                <label key={i} className="candidate" style={{ fontWeight: 400, fontSize: "inherit" }}>
                  <input
                    type="checkbox"
                    checked={selected.has(i)}
                    onChange={(e) => {
                      const next = new Set(selected);
                      if (e.target.checked) next.add(i);
                      else next.delete(i);
                      setSelected(next);
                    }}
                  />
                  <span className="body">
                    <span className="f">{c.frente}</span>
                    <br />
                    <span className="b">{c.verso}</span>
                    <br />
                    <span className="sub">
                      {c.conceito} · {CARD_TYPE_LABEL[c.tipo] ?? c.tipo} · {c.justificativa}
                    </span>
                  </span>
                </label>
              ))}
              <div className="bigact" style={{ marginTop: 14 }}>
                <button className="btn-primary" onClick={approve} disabled={pending || selected.size === 0}>
                  {pending ? "Criando…" : `Criar ${selected.size} ${selected.size === 1 ? "cartão" : "cartões"}`}
                </button>
                <button onClick={() => setResult(null)} disabled={pending}>
                  Descartar tudo
                </button>
              </div>
            </>
          )}

          {result.rejeitados.length > 0 && (
            <details style={{ marginTop: 18 }}>
              <summary className="sub" style={{ cursor: "pointer" }}>
                O que a IA reprovou no filtro de qualidade ({result.rejeitados.length})
              </summary>
              <table style={{ marginTop: 10 }}>
                <tbody>
                  {result.rejeitados.map((r, i) => (
                    <tr key={i}>
                      <td>{r.ideia}</td>
                      <td className="sub">{r.motivo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          )}
          {result.cartoes.length === 0 && (
            <button style={{ marginTop: 12 }} onClick={() => setResult(null)}>
              Tentar outro material
            </button>
          )}
        </>
      )}
    </div>
  );
}
