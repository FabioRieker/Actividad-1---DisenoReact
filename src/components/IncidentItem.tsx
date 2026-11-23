import React, { useState } from 'react';
import { IonIcon, IonItem, IonItemOption, IonItemOptions, IonItemSliding } from '@ionic/react';
import {
  arrowForwardOutline,
  checkmarkCircleOutline,
  locationOutline,
  refreshOutline,
  timeOutline,
  trashOutline,
} from 'ionicons/icons';
import { Incident, IncidentPriority } from '../types/incident';
import { prefersReducedMotion, useInView } from '../hooks/useMotion';

/** Franja lateral y etiqueta de prioridad (color + texto: nunca solo color) */
export const PRIORITY_STYLES: Record<
  IncidentPriority,
  { stripe: string; tag: string; label: string; short: string }
> = {
  alta: { stripe: 'border-l-vermilion', tag: 'bg-vermilion text-ink', label: 'Prioridad alta', short: 'Alta' },
  media: { stripe: 'border-l-lilac', tag: 'bg-lilac text-ink', label: 'Prioridad media', short: 'Media' },
  baja: { stripe: 'border-l-lime', tag: 'bg-lime text-ink', label: 'Prioridad baja', short: 'Baja' },
};

export interface IncidentItemProps {
  incident: Incident;
  onToggleStatus: (id: string) => void;
  onDelete: (id: string) => void;
  /** Posición en el listado: escalona la animación de entrada */
  index?: number;
}

const IncidentItem: React.FC<IncidentItemProps> = ({ incident, onToggleStatus, onDelete, index = 0 }) => {
  const [ref, inView] = useInView<HTMLDivElement>();
  const [isLeaving, setIsLeaving] = useState<boolean>(false);
  const [flashKey, setFlashKey] = useState<number>(0);
  const isResolved = incident.status === 'resuelta';
  const priority = PRIORITY_STYLES[incident.priority];

  // Evita que los botones internos activen la navegación del IonItem
  const stop = (e: React.MouseEvent, action: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    action();
  };

  // Sale volando antes de eliminarse del estado
  const handleDelete = () => {
    if (isLeaving) return;
    setIsLeaving(true);
    window.setTimeout(() => onDelete(incident.id), prefersReducedMotion() ? 0 : 300);
  };

  const handleToggle = () => {
    setFlashKey((k) => k + 1);
    onToggleStatus(incident.id);
  };

  const motionClass = isLeaving ? 'anim-leave' : inView ? 'anim-rise' : 'reveal-pending';

  return (
    // La sombra vive en el contenedor: IonItemSliding necesita overflow oculto para las opciones
    <div
      ref={ref}
      style={{ '--d': `${Math.min(index, 6) * 70}ms` } as React.CSSProperties}
      className={`brutal-press relative border-3 border-ink bg-white ${motionClass}`}
    >
      {flashKey > 0 && (
        <span key={flashKey} aria-hidden="true" className="anim-flash pointer-events-none absolute inset-0 z-10" />
      )}
      {isResolved && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-4 top-10 z-10 animate-stamp-in border-[3px] border-ultra px-2 py-0.5 font-mono text-sm font-extrabold uppercase tracking-widest text-ultra motion-reduce:animate-none md:right-8 md:text-base"
        >
          Resuelta
        </span>
      )}

      <IonItemSliding className={`overflow-hidden border-l-[12px] ${priority.stripe}`}>
        <IonItem
          className="incident-item"
          routerLink={`/incident/${incident.id}`}
          detail={false}
          aria-label={`Abrir ficha de ${incident.id}: ${incident.title}`}
        >
          <div className="w-full py-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold tabular-nums">{incident.id}</span>
              <span className={`border-2 border-ink px-2 py-0.5 font-mono text-[11px] font-bold uppercase ${priority.tag}`}>
                {priority.label}
              </span>
            </div>

            <h3
              className={`font-display mt-2 pr-2 text-xl font-extrabold leading-tight md:text-2xl ${
                isResolved ? 'text-neutral-600 line-through decoration-ultra decoration-[3px]' : 'text-ink'
              }`}
            >
              {incident.title}
            </h3>

            <p className="mt-1 line-clamp-2 max-w-prose text-sm text-neutral-800">
              {incident.description}
            </p>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t-2 border-dashed border-ink pt-3">
              <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold">
                <span className="inline-flex items-center gap-1">
                  <IonIcon icon={locationOutline} aria-hidden="true" />
                  {incident.location}
                </span>
                <span className="inline-flex items-center gap-1 font-mono text-xs text-neutral-700">
                  <IonIcon icon={timeOutline} aria-hidden="true" />
                  {incident.createdAt}
                </span>
              </span>

              <span className="flex items-center gap-2">
                <button
                  type="button"
                  className={`brutal-btn min-h-[44px] px-3 py-1 text-xs shadow-brutal-sm ${
                    isResolved ? 'bg-white text-ink' : 'bg-lime text-ink'
                  }`}
                  onClick={(e) => stop(e, handleToggle)}
                >
                  <IonIcon icon={isResolved ? refreshOutline : checkmarkCircleOutline} aria-hidden="true" />
                  {isResolved ? 'Reabrir' : 'Resolver'}
                </button>
                <button
                  type="button"
                  className="brutal-btn h-11 w-11 bg-white px-0 py-0 text-ink shadow-brutal-sm hover:bg-vermilion"
                  aria-label={`Eliminar incidencia ${incident.id}`}
                  title="Eliminar"
                  onClick={(e) => stop(e, handleDelete)}
                >
                  <IonIcon icon={trashOutline} className="text-lg" aria-hidden="true" />
                </button>
                <IonIcon
                  icon={arrowForwardOutline}
                  className="hidden text-2xl md:block"
                  aria-hidden="true"
                />
              </span>
            </div>
          </div>
        </IonItem>

        {/* Atajo táctil: opciones ocultas tras deslizamiento horizontal */}
        <IonItemOptions side="end">
          <IonItemOption
            color="success"
            onClick={handleToggle}
            aria-label={isResolved ? 'Reabrir incidencia' : 'Marcar como resuelta'}
          >
            <IonIcon slot="icon-only" icon={isResolved ? refreshOutline : checkmarkCircleOutline} />
          </IonItemOption>
          <IonItemOption
            color="danger"
            onClick={handleDelete}
            aria-label={`Eliminar incidencia ${incident.id}`}
          >
            <IonIcon slot="icon-only" icon={trashOutline} />
          </IonItemOption>
        </IonItemOptions>
      </IonItemSliding>
    </div>
  );
};

export default IncidentItem;
