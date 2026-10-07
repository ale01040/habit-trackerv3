export const HABIT_ICONS = [
  'sparkles',
  'droplet',
  'coffee',
  'moon',
  'bed',
  'sun',
  'alarm-clock',
  'book-open',
  'headphones',
  'notebook-pen',
  'pencil',
  'newspaper',
  'mail',
  'brain',
  'heart-pulse',
  'activity',
  'dumbbell',
  'bike',
  'footprints',
  'mountain',
  'waves-horizontal',
  'apple',
  'salad',
  'utensils',
  'pill',
  'languages',
  'graduation-cap',
  'glasses',
  'music',
  'code',
  'laptop',
  'briefcase',
  'wallet',
  'piggy-bank',
  'leaf',
  'sprout',
  'flower-2',
  'face-slightly-smiling',
  'hand-heart',
  'smartphone',
  'tv',
  'cigarette-off',
  'wine-off',
  'bath',
  'target',
  'timer',
  'flame',
  'calendar-check',
] as const;

export type HabitIcon = (typeof HABIT_ICONS)[number];

export const DEFAULT_ICON: HabitIcon = 'sparkles';

export function isHabitIcon(value: string): value is HabitIcon {
  return (HABIT_ICONS as readonly string[]).includes(value);
}

export function toPascalCase(name: string): string {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}
