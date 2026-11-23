import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonTextarea,
  IonToast,
  IonToolbar,
  RefresherEventDetail,
  useIonRouter,
  useIonViewDidEnter,
  useIonViewWillLeave,
} from '@ionic/react';
import {
  addOutline,
  alertCircleOutline,
  checkmarkCircleOutline,
  closeOutline,
  layersOutline,
  timeOutline,
} from 'ionicons/icons';
import { FilterOption, Incident, IncidentPriority } from '../types/incident';
import { useIncidentsStorage } from '../hooks/useIncidentsStorage';
import KpiCard from '../components/KpiCard';
import IncidentItem, { PRIORITY_STYLES } from '../components/IncidentItem';
import { modalEnter, modalLeave } from '../animations/transitions';

type PriorityFilter = IncidentPriority | 'todas';

interface ToastState {
  message: string;
  /** Si existe, el toast muestra el botón "Deshacer" */
  undo?: () => void;
}

const PRIORITY_RANK: Record<IncidentPriority, number> = { alta: 0, media: 1, baja: 2 };

const PRIORITY_OPTIONS: { value: IncidentPriority; title: string; hint: string; checked: string }[] = [
  { value: 'alta', title: 'Alta', hint: 'Bloquea una clase', checked: 'bg-vermilion' },
  { value: 'media', title: 'Media', hint: 'Molesta, pero se trabaja', checked: 'bg-lilac' },
  { value: 'baja', title: 'Baja', hint: 'Mantenimiento', checked: 'bg-lime' },
];

const PRIORITY_FILTERS: { value: PriorityFilter; label: string }[] = [
  { value: 'todas', label: 'Cualquiera' },
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Media' },
  { value: 'baja', label: 'Baja' },
];

const Home: React.FC = () => {
  const router = useIonRouter();

  // Datos persistidos en localStorage mediante Custom Hook
  const { incidents, addIncident, restoreIncident, toggleStatus, deleteIncident } =
    useIncidentsStorage();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<FilterOption>('todas');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('todas');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isViewActive, setIsViewActive] = useState<boolean>(true);

  // Estado controlado del formulario modal
  const [title, setTitle] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [priority, setPriority] = useState<IncidentPriority>('media');
  const [showErrors, setShowErrors] = useState<boolean>(false);

  const listRef = useRef<HTMLIonListElement | null>(null);
  const listSectionRef = useRef<HTMLElement | null>(null);
  const searchRef = useRef<HTMLIonSearchbarElement | null>(null);
  const titleInputRef = useRef<HTMLIonInputElement | null>(null);

  // IonRouterOutlet mantiene Home montada en segundo plano: los atajos solo actúan si está visible
  useIonViewDidEnter(() => setIsViewActive(true));
  useIonViewWillLeave(() => setIsViewActive(false));

  // Cálculo memoizado de indicadores KPI
  const metrics = useMemo(() => {
    const total = incidents.length;
    const pending = incidents.filter((item) => item.status === 'pendiente').length;
    const resolved = total - pending;
    const critical = incidents.filter(
      (item) => item.status === 'pendiente' && item.priority === 'alta'
    ).length;
    return { total, pending, resolved, critical };
  }, [incidents]);

  // Incidencia pendiente de mayor prioridad: protagonista del hero
  const mostUrgent = useMemo(
    () =>
      incidents
        .filter((item) => item.status === 'pendiente')
        .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])[0],
    [incidents]
  );

  // Filtrado combinado + orden útil: pendientes primero, después por prioridad
  const filteredIncidents = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return incidents
      .filter((item) => {
        const matchesStatus = activeFilter === 'todas' || item.status === activeFilter;
        const matchesPriority = priorityFilter === 'todas' || item.priority === priorityFilter;
        const matchesQuery =
          normalizedQuery === '' ||
          item.title.toLowerCase().includes(normalizedQuery) ||
          item.location.toLowerCase().includes(normalizedQuery) ||
          item.id.toLowerCase().includes(normalizedQuery);
        return matchesStatus && matchesPriority && matchesQuery;
      })
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'pendiente' ? -1 : 1;
        return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      });
  }, [incidents, activeFilter, priorityFilter, searchQuery]);

  const hasActiveFilters =
    activeFilter !== 'todas' || priorityFilter !== 'todas' || searchQuery.trim() !== '';

  const clearFilters = () => {
    setActiveFilter('todas');
    setPriorityFilter('todas');
    setSearchQuery('');
  };

  const openModal = () => {
    setShowErrors(false);
    setIsModalOpen(true);
  };

  // Atajos de teclado: "/" busca, "N" crea (ignorados mientras se escribe)
  useEffect(() => {
    if (!isViewActive || isModalOpen) return undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, ion-searchbar, ion-input, ion-textarea, [contenteditable="true"]')) {
        return;
      }
      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.setFocus();
      } else if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        openModal();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isViewActive, isModalOpen]);

  // Pulsar un KPI aplica su filtro y lleva al listado
  const applyKpiFilter = (status: FilterOption, prio: PriorityFilter) => {
    setActiveFilter(status);
    setPriorityFilter(prio);
    setSearchQuery('');
    listSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Gesto nativo Pull-to-Refresh
  // Foco que sigue al puntero sobre el hero (variables CSS, sin re-render)
  const handleHeroPointer = (e: React.PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - rect.top}px`);
  };

  // Palabras del titular envueltas en máscaras para revelarlas una a una
  const renderWords = (text: string, baseDelay = 150) =>
    text.split(' ').map((word, i) => (
      <React.Fragment key={`${word}-${i}`}>
        <span className="word-mask">
          <span style={{ '--d': `${baseDelay + i * 70}ms` } as React.CSSProperties}>{word}</span>
        </span>{' '}
      </React.Fragment>
    ));

  const listKey = `${activeFilter}-${priorityFilter}`;

  const handleRefresh = (event: CustomEvent<RefresherEventDetail>) => {
    setTimeout(() => {
      setToast({ message: 'Listado actualizado' });
      event.detail.complete();
    }, 700);
  };

  const handleToggleStatus = async (id: string) => {
    const target = incidents.find((item) => item.id === id);
    toggleStatus(id);
    await listRef.current?.closeSlidingItems();
    setToast({
      message: target?.status === 'pendiente' ? `${id} marcada como resuelta` : `${id} reabierta`,
      undo: () => toggleStatus(id),
    });
  };

  const handleDeleteIncident = async (id: string) => {
    const index = incidents.findIndex((item) => item.id === id);
    const removed = incidents[index];
    deleteIncident(id);
    await listRef.current?.closeSlidingItems();
    setToast({
      message: `${id} eliminada`,
      undo: removed ? () => restoreIncident(removed, index) : undefined,
    });
  };

  const titleError = showErrors && !title.trim();
  const locationError = showErrors && !location.trim();

  const handleCreateIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !location.trim()) {
      // Errores en línea junto al campo, y el foco vuelve al primero que falta
      setShowErrors(true);
      if (!title.trim()) titleInputRef.current?.setFocus();
      return;
    }

    const newIncident: Incident = {
      id: `INC-${Date.now().toString(36).toUpperCase().slice(-5)}`,
      title: title.trim(),
      location: location.trim(),
      description: description.trim() || 'Sin observaciones adicionales.',
      priority,
      status: 'pendiente',
      createdAt: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    };

    addIncident(newIncident);
    setTitle('');
    setLocation('');
    setDescription('');
    setPriority('media');
    setShowErrors(false);
    setIsModalOpen(false);
    clearFilters();
    setToast({ message: `${newIncident.id} registrada` });
  };

  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const tickerItems = [
    plural(metrics.pending, 'pendiente', 'pendientes'),
    plural(metrics.critical, 'crítica', 'críticas'),
    plural(metrics.resolved, 'resuelta', 'resueltas'),
    mostUrgent ? `Urgente: ${mostUrgent.title}` : 'Laboratorio en orden',
    'Pulsa N para registrar',
  ];

  return (
    <IonPage>
      {/* Cabecera ultramarina con marca, contador y acción principal */}
      <IonHeader className="ion-no-border border-b-4 border-ink">
        <IonToolbar className="brutal-toolbar">
          <div className="flex items-center justify-between gap-3 px-4">
            <span className="flex items-baseline gap-2">
              <span className="font-display text-2xl font-extrabold leading-none text-white">
                SmartLab
              </span>
              <span className="hidden font-serif text-lg italic text-lime sm:inline">
                monitor de incidencias
              </span>
            </span>

            <span className="flex items-center gap-3">
              <span className="flex items-center gap-2 text-sm font-bold" aria-live="polite">
                <span className="hidden font-mono text-xs uppercase tracking-wider sm:inline">
                  Sin resolver
                </span>
                <span className="grid h-9 min-w-9 place-items-center border-2 border-ink bg-lime px-2 font-mono font-extrabold tabular-nums text-ink">
                  {metrics.pending}
                </span>
              </span>
              <button
                type="button"
                onClick={openModal}
                className="brutal-btn hidden bg-white text-ink shadow-brutal-sm md:inline-flex"
              >
                <IonIcon icon={addOutline} className="text-lg" aria-hidden="true" />
                Nueva incidencia
                <kbd className="border border-ink px-1 font-mono text-[10px]">N</kbd>
              </button>
            </span>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent
            pullingText="Desliza para actualizar"
            refreshingSpinner="crescent"
            refreshingText="Actualizando..."
          />
        </IonRefresher>

        {/*
          Layout con vh:
          - Móvil / tablet: columna única. Hero de 46vh / 38vh.
          - Escritorio (lg): dos columnas. La izquierda ocupa todo el alto
            de la ventana (100vh menos la cabecera) y queda fija al hacer scroll.
        */}
        <div className="lg:grid lg:min-h-[calc(100vh-var(--header-h))] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <aside className="flex flex-col border-b-4 border-ink lg:sticky lg:top-0 lg:h-[calc(100vh-var(--header-h))] lg:border-b-0 lg:border-r-4">
            {/* Teletipo: resumen en movimiento (se detiene con prefers-reduced-motion) */}
            <div className="overflow-hidden border-b-4 border-ink bg-ink py-2 text-lime" aria-hidden="true">
              <div className="flex w-max animate-marquee gap-8 whitespace-nowrap font-mono text-xs font-bold uppercase tracking-wider motion-reduce:animate-none">
                {[...tickerItems, ...tickerItems].map((item, i) => (
                  <span key={i} className="flex items-center gap-8">
                    {item}
                    <span className="text-white">✦</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Hero: la incidencia más urgente, sobre trama de semitono */}
            <section
              aria-labelledby="urgent-title"
              onPointerMove={handleHeroPointer}
              className="halftone group/hero relative flex min-h-[46vh] flex-col overflow-hidden p-4 md:min-h-[38vh] md:p-6 lg:min-h-0 lg:flex-1"
            >
              <div className="spotlight" aria-hidden="true" />
              <div
                key={mostUrgent?.id ?? 'empty'}
                className="anim-slam relative flex flex-1 flex-col justify-end border-4 border-ink bg-paper p-5 shadow-brutal md:p-8"
              >
                {mostUrgent ? (
                  <>
                    <p className="flex flex-wrap items-center gap-3">
                      <span className="font-serif text-2xl italic leading-none md:text-3xl">
                        Lo más urgente
                      </span>
                      <span
                        className={`border-2 border-ink px-2 py-0.5 font-mono text-[11px] font-bold uppercase ${
                          PRIORITY_STYLES[mostUrgent.priority].tag
                        }`}
                      >
                        {PRIORITY_STYLES[mostUrgent.priority].label}
                      </span>
                    </p>
                    <h1
                      id="urgent-title"
                      className="font-display mt-3 max-w-[16ch] text-[clamp(2.2rem,7vw,4.2rem)] font-extrabold leading-[0.9]"
                    >
                      {renderWords(mostUrgent.title)}
                    </h1>
                    <p className="anim-rise mt-4 font-mono text-sm font-bold md:text-base" style={{ '--d': '450ms' } as React.CSSProperties}>
                      {mostUrgent.id} · {mostUrgent.location} · {mostUrgent.createdAt}
                    </p>
                    <div className="anim-rise mt-6 flex flex-wrap gap-3" style={{ '--d': '550ms' } as React.CSSProperties}>
                      <button
                        type="button"
                        className="brutal-btn bg-ultra text-white"
                        onClick={() => router.push(`/incident/${mostUrgent.id}`)}
                      >
                        Abrir ficha
                      </button>
                      <button
                        type="button"
                        className="brutal-btn bg-lime text-ink"
                        onClick={() => handleToggleStatus(mostUrgent.id)}
                      >
                        <IonIcon icon={checkmarkCircleOutline} aria-hidden="true" />
                        Resolver
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="font-serif text-2xl italic md:text-3xl">Respira.</p>
                    <h1
                      id="urgent-title"
                      className="font-display mt-2 text-[clamp(2.2rem,7vw,4.2rem)] font-extrabold leading-[0.9]"
                    >
                      {renderWords('Todo resuelto.')}
                    </h1>
                    <p className="mt-4 max-w-prose text-base font-semibold md:text-lg">
                      No queda nada pendiente en el laboratorio.
                    </p>
                    <button type="button" className="brutal-btn mt-6 self-start bg-ultra text-white" onClick={openModal}>
                      <IonIcon icon={addOutline} aria-hidden="true" />
                      Registrar una avería
                    </button>
                  </>
                )}
              </div>
            </section>

            {/* Indicadores pulsables: cada celda filtra el listado */}
            <section aria-label="Resumen de incidencias. Pulsa una cifra para filtrar" className="border-t-4 border-ink">
              <div className="grid grid-cols-4 divide-x-4 divide-ink">
                <KpiCard
                  label="Total"
                  delayMs={300}
                  value={metrics.total}
                  icon={layersOutline}
                  toneClassName="bg-white text-ink"
                  actionLabel="Ver todas"
                  active={activeFilter === 'todas' && priorityFilter === 'todas'}
                  onSelect={() => applyKpiFilter('todas', 'todas')}
                />
                <KpiCard
                  label="Pendientes"
                  delayMs={380}
                  value={metrics.pending}
                  icon={timeOutline}
                  toneClassName="bg-lilac text-ink"
                  actionLabel="Ver pendientes"
                  active={activeFilter === 'pendiente' && priorityFilter === 'todas'}
                  onSelect={() => applyKpiFilter('pendiente', 'todas')}
                />
                <KpiCard
                  label="Críticas"
                  delayMs={460}
                  value={metrics.critical}
                  icon={alertCircleOutline}
                  toneClassName="bg-vermilion text-ink"
                  actionLabel="Ver pendientes de prioridad alta"
                  active={activeFilter === 'pendiente' && priorityFilter === 'alta'}
                  onSelect={() => applyKpiFilter('pendiente', 'alta')}
                />
                <KpiCard
                  label="Resueltas"
                  delayMs={540}
                  value={metrics.resolved}
                  icon={checkmarkCircleOutline}
                  toneClassName="bg-lime text-ink"
                  actionLabel="Ver resueltas"
                  active={activeFilter === 'resuelta' && priorityFilter === 'todas'}
                  onSelect={() => applyKpiFilter('resuelta', 'todas')}
                />
              </div>
            </section>
          </aside>

          <main className="paper-grid min-h-[60vh] px-4 pb-32 pt-6 md:px-8 md:pb-16 md:pt-8">
            {/* 01 · Búsqueda y filtros */}
            <section
              aria-labelledby="filters-title"
              className="anim-rise mb-10 space-y-5"
              style={{ '--d': '200ms' } as React.CSSProperties}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="filters-title" className="section-tag">
                  01 / Buscar y filtrar
                </h2>
                <span className="hidden font-mono text-xs text-neutral-700 lg:inline">
                  Atajo: <kbd className="border-2 border-ink bg-white px-1.5 font-bold">/</kbd>
                </span>
              </div>

              <IonSearchbar
                ref={searchRef}
                value={searchQuery}
                onIonInput={(e) => setSearchQuery(e.detail.value ?? '')}
                placeholder="Código, título o aula…"
                debounce={150}
                className="brutal-search"
                aria-label="Buscar incidencias"
              />

              <IonSegment
                className="brutal-segment"
                value={activeFilter}
                onIonChange={(e) => setActiveFilter((e.detail.value as FilterOption) ?? 'todas')}
                aria-label="Filtrar por estado"
              >
                <IonSegmentButton value="todas">
                  <IonLabel>
                    Todas<span className="hidden sm:inline"> · {metrics.total}</span>
                  </IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="pendiente">
                  <IonLabel>
                    Pendientes<span className="hidden sm:inline"> · {metrics.pending}</span>
                  </IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="resuelta">
                  <IonLabel>
                    Resueltas<span className="hidden sm:inline"> · {metrics.resolved}</span>
                  </IonLabel>
                </IonSegmentButton>
              </IonSegment>

              {/* Filtro por prioridad: grupo de botones conmutables */}
              <div role="group" aria-label="Filtrar por prioridad" className="flex flex-wrap items-center gap-2">
                <span className="mr-1 font-mono text-xs font-bold uppercase tracking-wider">Prioridad</span>
                {PRIORITY_FILTERS.map((opt) => {
                  const selected = priorityFilter === opt.value;
                  const tone =
                    opt.value === 'todas' ? 'bg-ultra text-white' : PRIORITY_STYLES[opt.value].tag;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setPriorityFilter(opt.value)}
                      className={`min-h-[44px] border-3 border-ink px-3 text-sm font-bold transition-transform duration-100 active:translate-y-0.5 ${
                        selected ? `${tone} shadow-brutal-sm` : 'bg-white text-ink hover:-translate-y-0.5'
                      }`}
                    >
                      {selected && <span aria-hidden="true">✓ </span>}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 02 · Listado con gestos laterales */}
            <section ref={listSectionRef} aria-labelledby="list-title" className="scroll-mt-4">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b-4 border-ink pb-3">
                <div>
                  <p className="section-tag">02 / Listado</p>
                  <h2 id="list-title" className="font-display mt-1 text-3xl font-extrabold md:text-4xl" aria-live="polite">
                    {filteredIncidents.length}{' '}
                    <span className="font-serif text-2xl font-normal italic md:text-3xl">
                      {filteredIncidents.length === 1 ? 'incidencia' : 'incidencias'}
                    </span>
                  </h2>
                </div>
                {hasActiveFilters ? (
                  <button type="button" onClick={clearFilters} className="brutal-btn bg-white text-ink shadow-brutal-sm">
                    <IonIcon icon={closeOutline} aria-hidden="true" />
                    Quitar filtros
                  </button>
                ) : (
                  <span className="max-w-[28ch] text-right text-sm font-semibold text-neutral-700">
                    <span className="md:hidden">Toca una tarjeta para ver su ficha o deslízala ←</span>
                    <span className="hidden md:inline">Pulsa una tarjeta para abrir su ficha</span>
                  </span>
                )}
              </div>

              {filteredIncidents.length === 0 ? (
                <div className="border-3 border-dashed border-ink bg-white p-8">
                  <p className="font-serif text-3xl italic">Nada por aquí.</p>
                  <p className="mt-2 text-sm font-medium">
                    {hasActiveFilters
                      ? 'Ninguna incidencia coincide con la búsqueda o los filtros.'
                      : 'Todavía no hay incidencias registradas.'}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    {hasActiveFilters && (
                      <button type="button" onClick={clearFilters} className="brutal-btn bg-white text-ink">
                        Quitar filtros
                      </button>
                    )}
                    <button type="button" onClick={openModal} className="brutal-btn bg-ultra text-white">
                      <IonIcon icon={addOutline} aria-hidden="true" />
                      Registrar incidencia
                    </button>
                  </div>
                </div>
              ) : (
                <IonList key={listKey} ref={listRef} lines="none" className="brutal-list space-y-6 p-0">
                  {filteredIncidents.map((incident, i) => (
                    <IncidentItem
                      key={incident.id}
                      index={i}
                      incident={incident}
                      onToggleStatus={handleToggleStatus}
                      onDelete={handleDeleteIncident}
                    />
                  ))}
                </IonList>
              )}
            </section>
          </main>
        </div>

        {/* Botón flotante solo en móvil/tablet pequeña (en escritorio está en la cabecera) */}
        <IonFab slot="fixed" vertical="bottom" horizontal="end" className="anim-wiggle mb-4 mr-4 md:hidden" style={{ '--d': '900ms' } as React.CSSProperties}>
          <IonFabButton className="brutal-fab" onClick={openModal} aria-label="Registrar incidencia">
            <IonIcon icon={addOutline} className="text-3xl" />
          </IonFabButton>
        </IonFab>

        {/* Modal de alta */}
        <IonModal
          className="brutal-modal"
          isOpen={isModalOpen}
          enterAnimation={modalEnter}
          leaveAnimation={modalLeave}
          onDidPresent={() => titleInputRef.current?.setFocus()}
          onDidDismiss={() => setIsModalOpen(false)}
        >
          <IonHeader className="ion-no-border border-b-4 border-ink">
            <IonToolbar className="brutal-toolbar">
              <div className="flex items-center justify-between px-4">
                <h2 className="flex items-baseline gap-2 text-white">
                  <span className="font-display text-2xl font-extrabold">Nueva</span>
                  <span className="font-serif text-xl italic text-lime">incidencia</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  aria-label="Cerrar formulario"
                  className="grid h-11 w-11 place-items-center border-2 border-white text-white transition-colors hover:bg-white hover:text-ultra"
                >
                  <IonIcon icon={closeOutline} className="text-2xl" />
                </button>
              </div>
            </IonToolbar>
          </IonHeader>

          <IonContent className="ion-padding">
            <form onSubmit={handleCreateIncident} noValidate className="mx-auto max-w-xl space-y-6 py-2">
              <p className="font-mono text-xs text-neutral-700">
                Los campos con * son obligatorios. Pulsa Esc para cerrar.
              </p>

              <div>
                <IonItem className={`brutal-field ${titleError ? 'is-invalid' : ''}`} lines="none">
                  <IonInput
                    ref={titleInputRef}
                    label="Qué falla *"
                    labelPlacement="stacked"
                    placeholder="Ej. El proyector no detecta HDMI"
                    value={title}
                    maxlength={80}
                    onIonInput={(e) => setTitle(e.detail.value ?? '')}
                    required
                  />
                </IonItem>
                {titleError && (
                  <p role="alert" className="mt-2 font-mono text-xs font-bold text-[#B3200A]">
                    ✕ Escribe un título corto para la avería.
                  </p>
                )}
              </div>

              <div>
                <IonItem className={`brutal-field ${locationError ? 'is-invalid' : ''}`} lines="none">
                  <IonInput
                    label="Dónde *"
                    labelPlacement="stacked"
                    placeholder="Ej. Laboratorio 102"
                    value={location}
                    maxlength={60}
                    onIonInput={(e) => setLocation(e.detail.value ?? '')}
                    required
                  />
                </IonItem>
                {locationError && (
                  <p role="alert" className="mt-2 font-mono text-xs font-bold text-[#B3200A]">
                    ✕ Indica el aula o espacio.
                  </p>
                )}
              </div>

              {/* Prioridad como opciones visibles (más rápida que un desplegable) */}
              <fieldset>
                <legend className="mb-3 font-mono text-xs font-bold uppercase tracking-wider">
                  Prioridad
                </legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {PRIORITY_OPTIONS.map((opt) => {
                    const checked = priority === opt.value;
                    return (
                      <label
                        key={opt.value}
                        className={`flex min-h-[64px] cursor-pointer flex-col justify-center border-3 border-ink p-3 transition-[transform,box-shadow] duration-100 has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ultra ${
                          checked ? `${opt.checked} -translate-y-0.5 shadow-brutal` : 'bg-white hover:-translate-y-0.5'
                        }`}
                      >
                        <input
                          type="radio"
                          name="priority"
                          value={opt.value}
                          checked={checked}
                          onChange={() => setPriority(opt.value)}
                          className="sr-only"
                        />
                        <span className="flex items-center justify-between font-display text-lg font-extrabold">
                          {opt.title}
                          <span aria-hidden="true">{checked ? '●' : '○'}</span>
                        </span>
                        <span className="text-xs font-semibold">{opt.hint}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <IonItem className="brutal-field" lines="none">
                <IonTextarea
                  label="Detalles (opcional)"
                  labelPlacement="stacked"
                  rows={4}
                  placeholder="Síntomas, desde cuándo pasa, qué has probado…"
                  value={description}
                  onIonInput={(e) => setDescription(e.detail.value ?? '')}
                />
              </IonItem>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="brutal-btn bg-white text-ink"
                >
                  Cancelar
                </button>
                <button type="submit" className="brutal-btn bg-ultra px-6 text-base text-white">
                  Guardar incidencia
                </button>
              </div>
            </form>
          </IonContent>
        </IonModal>

        <IonToast
          className="brutal-toast"
          isOpen={toast !== null}
          message={toast?.message ?? ''}
          duration={toast?.undo ? 4500 : 2200}
          position="bottom"
          buttons={
            toast?.undo
              ? [{ text: 'Deshacer', handler: () => toast.undo?.() }]
              : undefined
          }
          onDidDismiss={() => setToast(null)}
        />
      </IonContent>
    </IonPage>
  );
};

export default Home;
