// Barra de competência no vocabulário do mundo: 10 segmentos em retícula da
// tinta spot. "Sem evidência" nunca vira barra vazia pintada de zero: vira
// segmentos tracejados, que é visualmente "ainda não medido".
export function Segbar({
  value,
  unknown = false,
  title,
}: {
  value: number | null;
  unknown?: boolean;
  title?: string;
}) {
  const filled = value === null ? 0 : Math.round(Math.max(0, Math.min(1, value)) * 10);
  const tint = value === null ? "f1" : value < 0.55 ? "f1" : value < 0.7 ? "f2" : value < 0.85 ? "f3" : "f4";
  return (
    <span
      className={`segbar${unknown || value === null ? " unknown" : ""}`}
      title={title ?? (value === null ? "Sem evidência ainda" : `Retenção estimada: ${Math.round(value * 100)}%`)}
      role="img"
      aria-label={title ?? (value === null ? "Sem evidência ainda" : `Retenção estimada ${Math.round(value * 100)} por cento`)}
    >
      {Array.from({ length: 10 }, (_, i) => (
        <i key={i} className={i < filled ? tint : undefined} />
      ))}
    </span>
  );
}
