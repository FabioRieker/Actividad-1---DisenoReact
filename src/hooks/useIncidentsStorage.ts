import { useCallback, useSyncExternalStore } from 'react';
import { Incident } from '../types/incident';
import { INITIAL_INCIDENTS } from '../data/initialIncidents';

const STORAGE_KEY = 'smartlab.incidents.v1';

/**
 * Store compartido a nivel de módulo: todas las vistas (Home, Detalle) leen
 * el mismo estado. IonRouterOutlet mantiene Home montada al navegar, por lo
 * que un useState local por vista quedaría desincronizado.
 */
let incidents: Incident[] = loadFromStorage();
const listeners = new Set<() => void>();

function isIncident(value: unknown): value is Incident {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.title === 'string' &&
    typeof v.location === 'string' &&
    typeof v.description === 'string' &&
    (v.priority === 'alta' || v.priority === 'media' || v.priority === 'baja') &&
    (v.status === 'pendiente' || v.status === 'resuelta') &&
    typeof v.createdAt === 'string'
  );
}

function loadFromStorage(): Incident[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return INITIAL_INCIDENTS;
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every(isIncident)) return parsed;
  } catch {
    // Datos corruptos o almacenamiento bloqueado: se usan los datos iniciales
  }
  return INITIAL_INCIDENTS;
}

function setIncidents(updater: (prev: Incident[]) => Incident[]): void {
  incidents = updater(incidents);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(incidents));
  } catch {
    // Cuota excedida o modo privado: el estado en memoria sigue siendo válido
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = (): Incident[] => incidents;

export function useIncidentsStorage() {
  const data = useSyncExternalStore(subscribe, getSnapshot);

  const addIncident = useCallback((incident: Incident) => {
    setIncidents((prev) => [incident, ...prev]);
  }, []);

  /** Reinserta una incidencia borrada en su posición original (acción "Deshacer") */
  const restoreIncident = useCallback((incident: Incident, index: number) => {
    setIncidents((prev) => {
      if (prev.some((item) => item.id === incident.id)) return prev;
      const next = [...prev];
      next.splice(Math.min(Math.max(index, 0), next.length), 0, incident);
      return next;
    });
  }, []);

  const toggleStatus = useCallback((id: string) => {
    setIncidents((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: item.status === 'pendiente' ? 'resuelta' : 'pendiente' }
          : item
      )
    );
  }, []);

  const deleteIncident = useCallback((id: string) => {
    setIncidents((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const updateDescription = useCallback((id: string, description: string) => {
    setIncidents((prev) =>
      prev.map((item) => (item.id === id ? { ...item, description } : item))
    );
  }, []);

  return {
    incidents: data,
    addIncident,
    restoreIncident,
    toggleStatus,
    deleteIncident,
    updateDescription,
  };
}
