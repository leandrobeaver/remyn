"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { n: "1", label: "Painel", href: "/" },
  { n: "2", label: "Áreas", href: "/areas" },
  { n: "3", label: "Revisão", href: "/revisao" },
  { n: "4", label: "Histórico", href: "/historico" },
  { n: "5", label: "Ajustes", href: "/ajustes" },
];

export function NavTabs({ due }: { due: number }) {
  const path = usePathname();
  return (
    <nav className="toc" aria-label="Sumário">
      {TABS.map((t) => {
        const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
            <span className="n">{t.n}</span>
            {t.label}
            {t.href === "/revisao" && due > 0 && <span className="badge">{due}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
