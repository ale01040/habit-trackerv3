import type { DateStr, Habit, Weekday } from '../domain/types';

export const PASSWORD_MIN = 8;

export interface User {
  id: string;
  email: string;
}

export interface CheckinRow {
  habitId: string;
  date: DateStr;
}

export interface NewHabit {
  name: string;
  description: string | null;
  icon: string;
  weekdays: readonly Weekday[];
}

export interface HabitPatch {
  name?: string;
  description?: string | null;
  icon?: string;
}

/** Contratto comune a backend in memoria e Supabase (spec §4). */
export interface Backend {
  readonly kind: 'memory' | 'supabase';
  getUser(): Promise<User | null>;
  onAuthChange(listener: (user: User | null) => void): () => void;
  signUp(email: string, password: string): Promise<User>;
  signIn(email: string, password: string): Promise<User>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  listHabits(): Promise<Habit[]>;
  listCheckins(): Promise<CheckinRow[]>;
  createHabit(input: NewHabit, today: DateStr): Promise<string>;
  updateHabit(id: string, patch: HabitPatch): Promise<void>;
  updateSchedule(id: string, weekdays: readonly Weekday[], today: DateStr): Promise<void>;
  archiveHabit(id: string, today: DateStr): Promise<void>;
  reactivateHabit(id: string, weekdays: readonly Weekday[], today: DateStr): Promise<void>;
  reorderHabits(ids: readonly string[]): Promise<void>;
  addCheckin(habitId: string, date: DateStr): Promise<void>;
  removeCheckin(habitId: string, date: DateStr): Promise<void>;
}
