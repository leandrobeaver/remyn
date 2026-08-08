/*
CONTRATO DE DIREÇÃO
THESIS: uma apostila suíça de exercícios que conhece o aluno; recusa o dashboard
escuro de cards com anéis de progresso e o papel creme com serifa.
OWN-WORLD: papel #FBFBF8, tinta preta #17171A, spot azul #2438C9 com retículas
(10/25/50/75/100) carregando todo dado; Archivo único; filetes finos; numeração
como gramática (capítulos, seções, Ex. 041); radius 2px; sem sombra.
STORY: o aluno abre, lê a tarefa do dia como um enunciado impresso, faz a sessão,
e vê competência (não contagem de cartões) crescer por evidência.
FIRST VIEWPORT: cabeçalho com sumário numerado; seção "1 Hoje" com o enunciado
da sessão em tipo grande (números em spot) e o botão azul "Começar a sessão";
abaixo, mapa de competência por área em barras de retícula.
FORM: livro didático suíço de matemática, candidato 4 da lista ordenada,
seed a5dfd883 (assigned index 4).
*/
import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { getDailyPlan } from "@/lib/queries";
import { NavTabs } from "@/components/NavTabs";

const archivo = Archivo({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-archivo",
  axes: ["wdth"],
});

export const metadata: Metadata = {
  title: "REMYN",
  description: "Sistema pessoal de aprendizagem adaptativa",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const due = getDailyPlan().dueNow;
  return (
    <html lang="pt-BR">
      <body className={archivo.variable}>
        <header className="masthead">
          <div className="masthead-inner">
            <Link href="/" className="wordmark">
              <span className="regmark" aria-hidden="true">
                <i />
                <i />
              </span>
              REMYN
            </Link>
            <NavTabs due={due} />
          </div>
        </header>
        <main className="shell">{children}</main>
      </body>
    </html>
  );
}
