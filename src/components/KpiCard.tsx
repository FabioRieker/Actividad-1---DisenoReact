import React from 'react';
import { IonIcon } from '@ionic/react';
import { useCountUp } from '../hooks/useMotion';

export interface KpiCardProps {
  label: string;
  value: number;
  icon: string;
  /** Clases Tailwind de fondo/texto de la celda, p. ej. "bg-vermilion text-ink" */
  toneClassName: string;
  /** Filtro que aplica al pulsar (se lee en el aria-label) */
  actionLabel: string;
  active?: boolean;
  onSelect: () => void;
  /** Retardo de entrada escalonada en ms */
  delayMs?: number;
}

/**
 * Celda de indicador pulsable: además de informar, filtra el listado.
 * El estado activo se marca con una barra inferior gruesa (no solo con color).
 */
const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  icon,
  toneClassName,
  actionLabel,
  active = false,
  onSelect,
  delayMs = 0,
}) => {
  const display = useCountUp(value);
  return (
  <button
    type="button"
    onClick={onSelect}
    aria-pressed={active}
    aria-label={`${label}: ${value}. ${actionLabel}`}
    style={{ '--d': `${delayMs}ms` } as React.CSSProperties}
    className={`anim-rise group relative flex min-h-[96px] flex-col justify-between p-3 text-left transition-[box-shadow] duration-100 md:p-4 ${toneClassName} ${
      active
        ? 'shadow-[inset_0_-10px_0_0_#111]'
        : 'hover:shadow-[inset_0_-6px_0_0_#111] focus-visible:shadow-[inset_0_-6px_0_0_#111]'
    }`}
  >
    <span className="flex items-start justify-between gap-1">
      <span className="font-mono text-[11px] font-bold uppercase leading-tight tracking-wider md:text-xs">
        {label}
      </span>
      <IonIcon icon={icon} className="hidden shrink-0 text-lg sm:block" aria-hidden="true" />
    </span>
    <span className="font-display text-4xl font-extrabold tabular-nums leading-none md:text-5xl">
      {/* key={value}: reinicia el "pop" cada vez que cambia la cifra */}
      <span key={value} className="anim-pop">
        {display}
      </span>
    </span>
  </button>
  );
};

export default KpiCard;
