import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Schichttypen, Mitarbeiter, Schichtplan } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [schichttypen, setSchichttypen] = useState<Schichttypen[]>([]);
  const [mitarbeiter, setMitarbeiter] = useState<Mitarbeiter[]>([]);
  const [schichtplan, setSchichtplan] = useState<Schichtplan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [schichttypenData, mitarbeiterData, schichtplanData] = await Promise.all([
        LivingAppsService.getSchichttypen(),
        LivingAppsService.getMitarbeiter(),
        LivingAppsService.getSchichtplan(),
      ]);
      setSchichttypen(schichttypenData);
      setMitarbeiter(mitarbeiterData);
      setSchichtplan(schichtplanData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [schichttypenData, mitarbeiterData, schichtplanData] = await Promise.all([
          LivingAppsService.getSchichttypen(),
          LivingAppsService.getMitarbeiter(),
          LivingAppsService.getSchichtplan(),
        ]);
        setSchichttypen(schichttypenData);
        setMitarbeiter(mitarbeiterData);
        setSchichtplan(schichtplanData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const schichttypenMap = useMemo(() => {
    const m = new Map<string, Schichttypen>();
    schichttypen.forEach(r => m.set(r.record_id, r));
    return m;
  }, [schichttypen]);

  const mitarbeiterMap = useMemo(() => {
    const m = new Map<string, Mitarbeiter>();
    mitarbeiter.forEach(r => m.set(r.record_id, r));
    return m;
  }, [mitarbeiter]);

  return { schichttypen, setSchichttypen, mitarbeiter, setMitarbeiter, schichtplan, setSchichtplan, loading, error, fetchAll, schichttypenMap, mitarbeiterMap };
}