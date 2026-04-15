import type { Schichtplan } from './app';

export type EnrichedSchichtplan = Schichtplan & {
  mitarbeiter_auswahlName: string;
  schicht_auswahlName: string;
};
