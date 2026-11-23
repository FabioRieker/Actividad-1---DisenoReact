import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonPage,
  IonTextarea,
  IonTitle,
  IonToast,
  IonToolbar,
  useIonRouter,
} from '@ionic/react';
import { useIncidentsStorage } from '../hooks/useIncidentsStorage';
import { PRIORITY_STYLES } from '../components/IncidentItem';

interface IncidentDetailParams {
  id: string;
}

const IncidentDetail: React.FC = () => {
  const { id } = useParams<IncidentDetailParams>();
  const router = useIonRouter();
  const { incidents, updateDescription, toggleStatus } = useIncidentsStorage();
  const incident = incidents.find((item) => item.id === id);

  const [draft, setDraft] = useState<string>(incident?.description ?? '');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Resincroniza el borrador si cambia la incidencia mostrada
  useEffect(() => {
    setDraft(incident?.description ?? '');
    // Solo al cambiar de incidencia, no en cada edición
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incident) return;
    updateDescription(incident.id, draft.trim() || 'Sin observaciones adicionales.');
    setToastMessage('Cambios guardados');
  };

  const isDirty = incident !== undefined && draft !== incident.description;

  return (
    <IonPage>
      <IonHeader className="ion-no-border border-b-4 border-ink">
        <IonToolbar className="brutal-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" text="Volver" className="text-white" />
          </IonButtons>
          <IonTitle className="font-display font-extrabold text-white">
            {incident ? incident.id : 'Incidencia'}
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <div className="paper-grid"><div className="mx-auto flex min-h-[calc(100vh-var(--header-h))] max-w-3xl flex-col justify-center px-4 py-8 sm:px-6">
          {!incident ? (
            <div className="border-3 border-dashed border-ink bg-white p-8">
              <p className="text-base font-semibold">
                La incidencia <strong>{id}</strong> no existe o se eliminó.
              </p>
              <button
                type="button"
                className="brutal-btn mt-5 bg-ultra text-white"
                onClick={() => router.push('/home', 'back')}
              >
                Volver al listado
              </button>
            </div>
          ) : (
            <article
              aria-labelledby="incident-title"
              className={`anim-slam space-y-6 border-4 border-l-[16px] border-ink bg-white p-5 shadow-riso md:p-8 ${PRIORITY_STYLES[incident.priority].stripe}`}
            >
              <header className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold tabular-nums">{incident.id}</span>
                  <span
                    className={`border-2 border-ink px-2 py-0.5 font-mono text-[11px] font-bold uppercase ${
                      PRIORITY_STYLES[incident.priority].tag
                    }`}
                  >
                    {PRIORITY_STYLES[incident.priority].label}
                  </span>
                </div>
                <h1 id="incident-title" className="font-display text-[clamp(1.75rem,5vw,2.75rem)] font-extrabold leading-[0.9]">
                  {incident.title}
                </h1>
              </header>

              <dl className="grid grid-cols-1 gap-4 border-y-4 border-ink py-5 sm:grid-cols-3">
                <div>
                  <dt className="section-tag text-neutral-700">
                    Ubicación
                  </dt>
                  <dd className="mt-1 text-base font-bold">{incident.location}</dd>
                </div>
                <div>
                  <dt className="section-tag text-neutral-700">
                    Registrada
                  </dt>
                  <dd className="mt-1 text-base font-bold">{incident.createdAt}</dd>
                </div>
                <div>
                  <dt className="section-tag text-neutral-700">
                    Estado
                  </dt>
                  <dd className="mt-1 flex items-center gap-2">
                    <span className="text-base font-bold">
                      {incident.status === 'resuelta' ? 'Resuelta' : 'Pendiente'}
                    </span>
                    <button
                      type="button"
                      className="brutal-btn whitespace-nowrap bg-lime px-3 py-1 text-xs shadow-brutal-sm"
                      onClick={() => toggleStatus(incident.id)}
                    >
                      {incident.status === 'resuelta' ? 'Reabrir' : 'Marcar resuelta'}
                    </button>
                  </dd>
                </div>
              </dl>

              <form onSubmit={handleSave} className="space-y-3">
                <IonItem className="brutal-field" lines="none">
                  <IonTextarea
                    label="Qué ocurre"
                    labelPlacement="stacked"
                    rows={6}
                    autoGrow
                    value={draft}
                    onIonInput={(e) => setDraft(e.detail.value ?? '')}
                  />
                </IonItem>
                <div className="flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    disabled={!isDirty}
                    onClick={() => setDraft(incident.description)}
                    className="brutal-btn bg-white text-ink disabled:pointer-events-none disabled:opacity-40"
                  >
                    Descartar
                  </button>
                  <button
                    type="submit"
                    disabled={!isDirty}
                    className="brutal-btn bg-ultra text-white disabled:pointer-events-none disabled:opacity-40"
                  >
                    Guardar cambios
                  </button>
                </div>
              </form>
            </article>
          )}
        </div>
        </div>

        <IonToast
          className="brutal-toast"
          isOpen={toastMessage !== null}
          message={toastMessage ?? ''}
          duration={2000}
          position="bottom"
          onDidDismiss={() => setToastMessage(null)}
        />
      </IonContent>
    </IonPage>
  );
};

export default IncidentDetail;
