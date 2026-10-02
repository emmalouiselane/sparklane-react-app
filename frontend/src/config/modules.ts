export const OPTIONAL_MODULES = [
  { id: 'recurring-routines', label: 'Recurring Routines' },
  { id: 'monthly-budget', label: 'Monthly Budget' },
  { id: 'time-logs', label: 'Time Logs' },
  { id: 'meal-planner', label: 'Meal Planner' },
] as const;

export type OptionalModuleId = typeof OPTIONAL_MODULES[number]['id'];

export function isOptionalModuleId(value: string): value is OptionalModuleId {
  return OPTIONAL_MODULES.some((module) => module.id === value);
}
