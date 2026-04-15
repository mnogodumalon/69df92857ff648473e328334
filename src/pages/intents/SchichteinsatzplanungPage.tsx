import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { SchichttypenDialog } from '@/components/dialogs/SchichttypenDialog';
import { MitarbeiterDialog } from '@/components/dialogs/MitarbeiterDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDashboardData } from '@/hooks/useDashboardData';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS } from '@/types/app';
import type { Schichttypen, Mitarbeiter } from '@/types/app';
import {
  IconCalendar,
  IconUsers,
  IconCheck,
  IconX,
  IconLoader2,
  IconPlus,
  IconRefresh,
} from '@tabler/icons-react';

const WIZARD_STEPS = [
  { label: 'Schichttyp' },
  { label: 'Datum & Bereich' },
  { label: 'Mitarbeiter' },
  { label: 'Anlegen' },
];

interface CreationResult {
  mitarbeiterId: string;
  name: string;
  success: boolean;
  error?: string;
}

export default function SchichteinsatzplanungPage() {
  const [searchParams] = useSearchParams();
  const initialStep = (() => {
    const s = parseInt(searchParams.get('step') ?? '', 10);
    return s >= 1 && s <= 4 ? s : 1;
  })();

  const [currentStep, setCurrentStep] = useState(initialStep);

  // Step 1
  const [selectedSchichttyp, setSelectedSchichttyp] = useState<Schichttypen | null>(null);
  const [schichttypenDialogOpen, setSchichttypenDialogOpen] = useState(false);

  // Step 2
  const [datum, setDatum] = useState('');
  const [bereich, setBereich] = useState('');
  const [datumError, setDatumError] = useState('');

  // Step 3
  const [selectedMitarbeiterIds, setSelectedMitarbeiterIds] = useState<Set<string>>(new Set());
  const [mitarbeiterDialogOpen, setMitarbeiterDialogOpen] = useState(false);

  // Step 4
  const [isCreating, setIsCreating] = useState(false);
  const [creationProgress, setCreationProgress] = useState(0);
  const [creationResults, setCreationResults] = useState<CreationResult[]>([]);
  const [creationDone, setCreationDone] = useState(false);

  const { schichttypen, mitarbeiter, loading, error, fetchAll } = useDashboardData();

  const handleStepChange = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  // Step 1 handlers
  const handleSelectSchichttyp = useCallback((id: string) => {
    const found = schichttypen.find(s => s.record_id === id) ?? null;
    setSelectedSchichttyp(found);
    setCurrentStep(2);
  }, [schichttypen]);

  const handleSchichttypenDialogSubmit = useCallback(async (fields: Schichttypen['fields']) => {
    await LivingAppsService.createSchichttypenEntry(fields);
    await fetchAll();
  }, [fetchAll]);

  // Step 2 handlers
  const handleWeiterToStep3 = useCallback(() => {
    if (!datum) {
      setDatumError('Bitte wähle ein Datum aus.');
      return;
    }
    setDatumError('');
    setCurrentStep(3);
  }, [datum]);

  // Step 3 handlers
  const toggleMitarbeiter = useCallback((id: string) => {
    setSelectedMitarbeiterIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleMitarbeiterDialogSubmit = useCallback(async (fields: Mitarbeiter['fields']) => {
    await LivingAppsService.createMitarbeiterEntry(fields);
    await fetchAll();
  }, [fetchAll]);

  // Step 4: create Schichtplan records
  const handleSchichtenAnlegen = useCallback(async () => {
    if (!selectedSchichttyp || !datum || selectedMitarbeiterIds.size === 0) return;

    setIsCreating(true);
    setCreationProgress(0);
    setCreationResults([]);
    setCreationDone(false);
    setCurrentStep(4);

    const selectedList = mitarbeiter.filter(m => selectedMitarbeiterIds.has(m.record_id));
    const results: CreationResult[] = [];

    for (let i = 0; i < selectedList.length; i++) {
      const ma = selectedList[i];
      const name = [ma.fields.vorname, ma.fields.nachname].filter(Boolean).join(' ') || 'Unbekannt';
      try {
        await LivingAppsService.createSchichtplanEntry({
          datum: datum,
          mitarbeiter_auswahl: createRecordUrl(APP_IDS.MITARBEITER, ma.record_id),
          schicht_auswahl: createRecordUrl(APP_IDS.SCHICHTTYPEN, selectedSchichttyp.record_id),
          bereich: bereich || undefined,
          status: 'geplant',
        });
        results.push({ mitarbeiterId: ma.record_id, name, success: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unbekannter Fehler';
        results.push({ mitarbeiterId: ma.record_id, name, success: false, error: msg });
      }
      setCreationProgress(i + 1);
      setCreationResults([...results]);
    }

    setIsCreating(false);
    setCreationDone(true);
  }, [selectedSchichttyp, datum, bereich, selectedMitarbeiterIds, mitarbeiter]);

  const handleReset = useCallback(() => {
    setSelectedSchichttyp(null);
    setDatum('');
    setBereich('');
    setDatumError('');
    setSelectedMitarbeiterIds(new Set());
    setCreationResults([]);
    setCreationDone(false);
    setCreationProgress(0);
    setIsCreating(false);
    setCurrentStep(1);
  }, []);

  // Derived
  const selectedMitarbeiterCount = selectedMitarbeiterIds.size;
  const totalToCreate = selectedMitarbeiterIds.size;

  return (
    <IntentWizardShell
      title="Schichteinsatzplanung"
      subtitle="Plane eine Schicht für mehrere Mitarbeiter gleichzeitig."
      steps={WIZARD_STEPS}
      currentStep={currentStep}
      onStepChange={handleStepChange}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* ─── Step 1: Schichttyp wählen ─── */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Schichttyp auswählen</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Wähle den Schichttyp, der für diese Planung verwendet werden soll.
            </p>
          </div>
          <EntitySelectStep
            items={schichttypen.map(s => ({
              id: s.record_id,
              title: s.fields.schicht_name ?? '(Kein Name)',
              subtitle: [s.fields.kuerzel, s.fields.beginn_uhrzeit && s.fields.ende_uhrzeit
                ? `${s.fields.beginn_uhrzeit} – ${s.fields.ende_uhrzeit}`
                : s.fields.beginn_uhrzeit ?? s.fields.ende_uhrzeit
              ].filter(Boolean).join(' | '),
            }))}
            onSelect={handleSelectSchichttyp}
            searchPlaceholder="Schichttyp suchen..."
            emptyText="Noch keine Schichttypen vorhanden."
            emptyIcon={<IconCalendar size={32} />}
            createLabel="Neuen Schichttyp anlegen"
            onCreateNew={() => setSchichttypenDialogOpen(true)}
            createDialog={
              <SchichttypenDialog
                open={schichttypenDialogOpen}
                onClose={() => setSchichttypenDialogOpen(false)}
                onSubmit={handleSchichttypenDialogSubmit}
              />
            }
          />
        </div>
      )}

      {/* ─── Step 2: Datum & Bereich ─── */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Datum & Bereich festlegen</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Lege das Datum und den optionalen Einsatzbereich fest.
            </p>
          </div>

          {/* Schichttyp Summary Card */}
          {selectedSchichttyp && (
            <div className="rounded-xl border bg-muted/40 p-4 flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <IconCalendar size={20} className="text-primary" stroke={2} />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">
                  {selectedSchichttyp.fields.schicht_name ?? '–'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {[
                    selectedSchichttyp.fields.kuerzel,
                    selectedSchichttyp.fields.beginn_uhrzeit && selectedSchichttyp.fields.ende_uhrzeit
                      ? `${selectedSchichttyp.fields.beginn_uhrzeit} – ${selectedSchichttyp.fields.ende_uhrzeit}`
                      : null,
                  ].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="datum">Datum <span className="text-destructive">*</span></Label>
              <Input
                id="datum"
                type="date"
                value={datum}
                onChange={e => {
                  setDatum(e.target.value);
                  if (e.target.value) setDatumError('');
                }}
                className={datumError ? 'border-destructive' : ''}
              />
              {datumError && (
                <p className="text-xs text-destructive">{datumError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bereich">Bereich / Abteilung</Label>
              <Input
                id="bereich"
                type="text"
                placeholder="z. B. Lager, Produktion, Kasse..."
                value={bereich}
                onChange={e => setBereich(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setCurrentStep(1)} className="flex-1">
              Zurück
            </Button>
            <Button onClick={handleWeiterToStep3} className="flex-1">
              Weiter
            </Button>
          </div>
        </div>
      )}

      {/* ─── Step 3: Mitarbeiter zuweisen ─── */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Mitarbeiter zuweisen</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Wähle alle Mitarbeiter aus, die diese Schicht erhalten sollen.
            </p>
          </div>

          {/* Live counter */}
          <div className="flex items-center gap-2 rounded-xl border bg-muted/40 px-4 py-3">
            <IconUsers size={18} className="text-primary shrink-0" stroke={2} />
            <span className="text-sm font-medium">
              {selectedMitarbeiterCount === 0
                ? 'Noch keine Mitarbeiter ausgewählt'
                : `${selectedMitarbeiterCount} Mitarbeiter ausgewählt`}
            </span>
          </div>

          {/* New employee button */}
          <Button
            variant="outline"
            onClick={() => setMitarbeiterDialogOpen(true)}
            className="w-full gap-2"
          >
            <IconPlus size={16} stroke={2} />
            Neuen Mitarbeiter anlegen
          </Button>

          <MitarbeiterDialog
            open={mitarbeiterDialogOpen}
            onClose={() => setMitarbeiterDialogOpen(false)}
            onSubmit={handleMitarbeiterDialogSubmit}
          />

          {/* Multi-select checklist */}
          {mitarbeiter.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <IconUsers size={32} className="mx-auto mb-3 opacity-30" stroke={1.5} />
              <p className="text-sm">Noch keine Mitarbeiter vorhanden.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {mitarbeiter.map(ma => {
                const isSelected = selectedMitarbeiterIds.has(ma.record_id);
                const name = [ma.fields.vorname, ma.fields.nachname].filter(Boolean).join(' ') || 'Unbekannt';
                const sub = [ma.fields.position, ma.fields.abteilung].filter(Boolean).join(' · ');
                return (
                  <button
                    key={ma.record_id}
                    type="button"
                    onClick={() => toggleMitarbeiter(ma.record_id)}
                    className={`w-full text-left flex items-center gap-3 p-4 rounded-xl border transition-colors overflow-hidden ${
                      isSelected
                        ? 'border-primary/50 bg-primary/5'
                        : 'bg-card hover:bg-accent hover:border-primary/20'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-primary border-primary'
                          : 'border-muted-foreground/40'
                      }`}
                    >
                      {isSelected && <IconCheck size={12} stroke={3} className="text-primary-foreground" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{name}</p>
                      {sub && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{sub}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setCurrentStep(2)} className="flex-1">
              Zurück
            </Button>
            <Button
              onClick={handleSchichtenAnlegen}
              disabled={selectedMitarbeiterCount === 0}
              className="flex-1"
            >
              Schichten planen
            </Button>
          </div>
        </div>
      )}

      {/* ─── Step 4: Anlegen & Zusammenfassung ─── */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Schichten anlegen</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Die Schichtplan-Einträge werden jetzt erstellt.
            </p>
          </div>

          {/* Progress while creating */}
          {isCreating && (
            <div className="rounded-xl border bg-muted/40 p-6 flex flex-col items-center gap-4">
              <IconLoader2 size={36} className="text-primary animate-spin" stroke={2} />
              <p className="text-sm font-medium text-center">
                Erstelle {creationProgress} von {totalToCreate} Schichten...
              </p>
              {/* Progress bar */}
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: totalToCreate > 0 ? `${(creationProgress / totalToCreate) * 100}%` : '0%' }}
                />
              </div>
            </div>
          )}

          {/* Results list */}
          {creationResults.length > 0 && (
            <div className="space-y-2">
              {creationResults.map(result => (
                <div
                  key={result.mitarbeiterId}
                  className={`flex items-center gap-3 p-4 rounded-xl border overflow-hidden ${
                    result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      result.success ? 'bg-green-100' : 'bg-red-100'
                    }`}
                  >
                    {result.success ? (
                      <IconCheck size={16} stroke={2.5} className="text-green-600" />
                    ) : (
                      <IconX size={16} stroke={2.5} className="text-red-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{result.name}</p>
                    {result.error && (
                      <p className="text-xs text-red-600 mt-0.5 truncate">{result.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Success summary */}
          {creationDone && (
            <div className="rounded-xl border bg-muted/40 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <IconCheck size={20} stroke={2.5} className="text-green-600 shrink-0" />
                <p className="font-semibold text-sm">
                  {creationResults.filter(r => r.success).length} von {creationResults.length} Schichten erfolgreich angelegt
                </p>
              </div>
              {selectedSchichttyp && (
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>
                    <span className="font-medium">Schichttyp:</span>{' '}
                    {selectedSchichttyp.fields.schicht_name ?? '–'}
                  </p>
                  <p>
                    <span className="font-medium">Datum:</span> {datum}
                  </p>
                  {bereich && (
                    <p>
                      <span className="font-medium">Bereich:</span> {bereich}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action buttons after completion */}
          {creationDone && (
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" onClick={handleReset} className="flex-1 gap-2">
                <IconRefresh size={16} stroke={2} />
                Weitere Schichten planen
              </Button>
              <Button asChild className="flex-1">
                <a href="#/schichtplan">Zum Schichtplan</a>
              </Button>
            </div>
          )}

          {/* Back button while still creating / before started */}
          {!creationDone && !isCreating && (
            <Button variant="outline" onClick={() => setCurrentStep(3)} className="w-full">
              Zurück
            </Button>
          )}
        </div>
      )}
    </IntentWizardShell>
  );
}
