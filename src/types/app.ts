// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Schichttypen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    kuerzel?: string;
    beginn_uhrzeit?: string;
    ende_uhrzeit?: string;
    schicht_beschreibung?: string;
    schicht_name?: string;
  };
}

export interface Mitarbeiter {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    abteilung?: string;
    position?: string;
    telefon?: string;
    email?: string;
    verfuegbare_tage?: LookupValue[];
    bemerkung?: string;
  };
}

export interface Schichtplan {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    datum?: string; // Format: YYYY-MM-DD oder ISO String
    mitarbeiter_auswahl?: string; // applookup -> URL zu 'Mitarbeiter' Record
    schicht_auswahl?: string; // applookup -> URL zu 'Schichttypen' Record
    bereich?: string;
    status?: LookupValue;
    notizen?: string;
  };
}

export const APP_IDS = {
  SCHICHTTYPEN: '69df926d7bf4060710232839',
  MITARBEITER: '69df92688713553ff17e8819',
  SCHICHTPLAN: '69df926d7b996073fe6bfa01',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'mitarbeiter': {
    verfuegbare_tage: [{ key: "dienstag", label: "Dienstag" }, { key: "mittwoch", label: "Mittwoch" }, { key: "donnerstag", label: "Donnerstag" }, { key: "freitag", label: "Freitag" }, { key: "samstag", label: "Samstag" }, { key: "sonntag", label: "Sonntag" }, { key: "montag", label: "Montag" }],
  },
  'schichtplan': {
    status: [{ key: "geplant", label: "Geplant" }, { key: "bestaetigt", label: "Bestätigt" }, { key: "abgesagt", label: "Abgesagt" }, { key: "offen", label: "Offen" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'schichttypen': {
    'kuerzel': 'string/text',
    'beginn_uhrzeit': 'string/text',
    'ende_uhrzeit': 'string/text',
    'schicht_beschreibung': 'string/textarea',
    'schicht_name': 'string/text',
  },
  'mitarbeiter': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'abteilung': 'string/text',
    'position': 'string/text',
    'telefon': 'string/tel',
    'email': 'string/email',
    'verfuegbare_tage': 'multiplelookup/checkbox',
    'bemerkung': 'string/textarea',
  },
  'schichtplan': {
    'datum': 'date/date',
    'mitarbeiter_auswahl': 'applookup/select',
    'schicht_auswahl': 'applookup/select',
    'bereich': 'string/text',
    'status': 'lookup/select',
    'notizen': 'string/textarea',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateSchichttypen = StripLookup<Schichttypen['fields']>;
export type CreateMitarbeiter = StripLookup<Mitarbeiter['fields']>;
export type CreateSchichtplan = StripLookup<Schichtplan['fields']>;