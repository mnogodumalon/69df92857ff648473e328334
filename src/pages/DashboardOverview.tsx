import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichSchichtplan } from '@/lib/enrich';
import type { EnrichedSchichtplan } from '@/types/enriched';
import type { Schichtplan } from '@/types/app';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { IconAlertCircle, IconTool, IconRefresh, IconCheck, IconPlus, IconPencil, IconTrash, IconChevronLeft, IconChevronRight, IconCalendar } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { SchichtplanDialog } from '@/components/dialogs/SchichtplanDialog';
import { AI_PHOTO_SCAN } from '@/config/ai-features';
import { addDays, startOfWeek, format, isSameDay, isToday } from 'date-fns';
import { de } from 'date-fns/locale';

const APPGROUP_ID = '69df92857ff648473e328334';
const REPAIR_ENDPOINT = '/claude/build/repair';

const WOCHENTAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

const STATUS_COLORS: Record<string, string> = {
  bestaetigt: 'bg-green-100 text-green-800 border-green-200',
  geplant: 'bg-blue-100 text-blue-800 border-blue-200',
  offen: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  abgesagt: 'bg-red-100 text-red-800 border-red-200',
};

const STATUS_DOT: Record<string, string> = {
  bestaetigt: 'bg-green-500',
  geplant: 'bg-blue-500',
  offen: 'bg-yellow-500',
  abgesagt: 'bg-red-500',
};

export default function DashboardOverview() {
  const {
    schichttypen, mitarbeiter, schichtplan,
    schichttypenMap, mitarbeiterMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedSchichtplan = enrichSchichtplan(schichtplan, { mitarbeiterMap, schichttypenMap });

  const [weekOffset, setWeekOffset] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<EnrichedSchichtplan | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EnrichedSchichtplan | null>(null);
  const [prefillDate, setPrefillDate] = useState<string | undefined>(undefined);

  const weekStart = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 1 });
    return addDays(base, weekOffset * 7);
  }, [weekOffset]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const schichtByDay = useMemo(() => {
    const map = new Map<string, EnrichedSchichtplan[]>();
    weekDays.forEach(d => map.set(format(d, 'yyyy-MM-dd'), []));
    enrichedSchichtplan.forEach(s => {
      const key = s.fields.datum ?? '';
      if (map.has(key)) map.get(key)!.push(s);
    });
    return map;
  }, [enrichedSchichtplan, weekDays]);

  const handleCreate = (date?: string) => {
    setEditRecord(null);
    setPrefillDate(date);
    setDialogOpen(true);
  };

  const handleEdit = (record: EnrichedSchichtplan) => {
    setEditRecord(record);
    setPrefillDate(undefined);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await LivingAppsService.deleteSchichtplanEntry(deleteTarget.record_id);
    setDeleteTarget(null);
    fetchAll();
  };

  const handleSubmit = async (fields: Schichtplan['fields']) => {
    if (editRecord) {
      await LivingAppsService.updateSchichtplanEntry(editRecord.record_id, fields);
    } else {
      await LivingAppsService.createSchichtplanEntry(fields);
    }
    fetchAll();
  };

  const defaultValues = useMemo(() => {
    if (editRecord) return editRecord.fields;
    if (prefillDate) return { datum: prefillDate };
    return undefined;
  }, [editRecord, prefillDate]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  return (
    <div className="space-y-6">
      {/* Workflow Navigation */}
      <div>
        <a
          href="#/intents/schichteinsatzplanung"
          className="flex items-center gap-4 bg-card border border-border border-l-4 border-l-primary rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow no-underline"
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <IconCalendar size={20} className="text-primary" stroke={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-foreground truncate">Schichteinsatzplanung</div>
            <div className="text-sm text-muted-foreground truncate">Schichttyp wählen, Datum festlegen und mehrere Mitarbeiter auf einmal einplanen</div>
          </div>
          <IconChevronRight size={18} className="text-muted-foreground flex-shrink-0" stroke={1.5} />
        </a>
      </div>
      {/* Week Planner */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-foreground text-base">Wochenplan</h2>
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {format(weekStart, 'd. MMM', { locale: de })} – {format(addDays(weekStart, 6), 'd. MMM yyyy', { locale: de })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)} className="hidden sm:flex text-xs">
              Heute
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(o => o - 1)}>
              <IconChevronLeft size={16} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(o => o + 1)}>
              <IconChevronRight size={16} />
            </Button>
            <Button size="sm" onClick={() => handleCreate()} className="gap-1">
              <IconPlus size={14} className="shrink-0" />
              <span className="hidden sm:inline">Schicht</span>
            </Button>
          </div>
        </div>

        {/* Calendar Grid — desktop */}
        <div className="hidden md:grid grid-cols-7 divide-x divide-border">
          {weekDays.map((day, idx) => {
            const key = format(day, 'yyyy-MM-dd');
            const daySchichten = schichtByDay.get(key) ?? [];
            const today = isToday(day);
            return (
              <div key={key} className="min-h-[220px] flex flex-col">
                {/* Day header */}
                <div
                  className={`px-2 py-2 text-center border-b border-border cursor-pointer hover:bg-accent/50 transition-colors ${today ? 'bg-primary/5' : ''}`}
                  onClick={() => handleCreate(key)}
                  title="Neue Schicht für diesen Tag"
                >
                  <div className="text-xs text-muted-foreground">{WOCHENTAGE[idx]}</div>
                  <div className={`text-sm font-semibold mt-0.5 w-7 h-7 mx-auto flex items-center justify-center rounded-full ${today ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>
                    {format(day, 'd')}
                  </div>
                </div>
                {/* Shifts */}
                <div className="flex-1 p-1.5 space-y-1 overflow-y-auto max-h-[300px]">
                  {daySchichten.length === 0 ? (
                    <button
                      className="w-full h-8 rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center mt-1"
                      onClick={() => handleCreate(key)}
                    >
                      <IconPlus size={12} />
                    </button>
                  ) : (
                    daySchichten.map(s => (
                      <ShiftCard key={s.record_id} shift={s} onEdit={handleEdit} onDelete={setDeleteTarget} />
                    ))
                  )}
                  {daySchichten.length > 0 && (
                    <button
                      className="w-full h-6 rounded border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center text-xs"
                      onClick={() => handleCreate(key)}
                    >
                      <IconPlus size={10} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile: vertical list of days */}
        <div className="md:hidden divide-y divide-border">
          {weekDays.map((day, idx) => {
            const key = format(day, 'yyyy-MM-dd');
            const daySchichten = schichtByDay.get(key) ?? [];
            const today = isToday(day);
            return (
              <div key={key} className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${today ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                      {format(day, 'd')}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{WOCHENTAGE[idx]}, {format(day, 'd. MMM', { locale: de })}</div>
                      <div className="text-xs text-muted-foreground">{daySchichten.length} Schicht{daySchichten.length !== 1 ? 'en' : ''}</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCreate(key)}>
                    <IconPlus size={14} />
                  </Button>
                </div>
                {daySchichten.length > 0 && (
                  <div className="space-y-1.5 pl-10">
                    {daySchichten.map(s => (
                      <ShiftCard key={s.record_id} shift={s} onEdit={handleEdit} onDelete={setDeleteTarget} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Schichttypen Overview */}
      {schichttypen.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-4">
          <h3 className="font-semibold text-sm text-foreground mb-3">Schichttypen</h3>
          <div className="flex flex-wrap gap-2">
            {schichttypen.map(st => (
              <div key={st.record_id} className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-1.5 text-sm">
                <span className="font-semibold text-primary">{st.fields.kuerzel}</span>
                <span className="text-muted-foreground">{st.fields.schicht_name}</span>
                {st.fields.beginn_uhrzeit && st.fields.ende_uhrzeit && (
                  <span className="text-xs text-muted-foreground">{st.fields.beginn_uhrzeit}–{st.fields.ende_uhrzeit}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dialogs */}
      <SchichtplanDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditRecord(null); setPrefillDate(undefined); }}
        onSubmit={handleSubmit}
        defaultValues={defaultValues}
        mitarbeiterList={mitarbeiter}
        schichttypenList={schichttypen}
        enablePhotoScan={AI_PHOTO_SCAN['Schichtplan']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Schicht löschen"
        description={`Schicht von ${deleteTarget?.mitarbeiter_auswahlName || 'Mitarbeiter'} am ${deleteTarget?.fields.datum ? formatDate(deleteTarget.fields.datum) : ''} wirklich löschen?`}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function ShiftCard({
  shift,
  onEdit,
  onDelete,
}: {
  shift: EnrichedSchichtplan;
  onEdit: (s: EnrichedSchichtplan) => void;
  onDelete: (s: EnrichedSchichtplan) => void;
}) {
  const statusKey = shift.fields.status?.key ?? 'offen';
  const colorClass = STATUS_COLORS[statusKey] ?? STATUS_COLORS['offen'];
  const dotClass = STATUS_DOT[statusKey] ?? STATUS_DOT['offen'];

  return (
    <div className={`rounded-lg border px-2 py-1.5 text-xs ${colorClass} group`}>
      <div className="flex items-start justify-between gap-1 min-w-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 min-w-0">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />
            <span className="font-semibold truncate">{shift.schicht_auswahlName || 'Schicht'}</span>
          </div>
          {shift.mitarbeiter_auswahlName && (
            <div className="truncate text-current/80 mt-0.5 pl-2.5">{shift.mitarbeiter_auswahlName}</div>
          )}
          {shift.fields.bereich && (
            <div className="truncate text-current/70 pl-2.5">{shift.fields.bereich}</div>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            className="p-0.5 rounded hover:bg-black/10 transition-colors"
            onClick={() => onEdit(shift)}
            title="Bearbeiten"
          >
            <IconPencil size={11} />
          </button>
          <button
            className="p-0.5 rounded hover:bg-black/10 transition-colors"
            onClick={() => onDelete(shift)}
            title="Löschen"
          >
            <IconTrash size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-[320px] rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte lade die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktiere den Support.</p>}
    </div>
  );
}
