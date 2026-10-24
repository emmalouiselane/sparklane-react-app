export const REQUIRED_MODULES = [
  { id: 'home', label: 'Today' },
  { id: 'my-week', label: 'My week' },
] as const;

export const OPTIONAL_MODULES = [
  { id: 'recurring-routines', label: 'Habits' },
  { id: 'monthly-budget', label: 'Monthly Budget' },
  { id: 'meal-planner', label: 'Meals & Home' },
  { id: 'time-logs', label: 'Time Logs' },
] as const;

export const TOGGLEABLE_MODULES = [
  { id: 'wellness', label: 'Wellness' },
  ...OPTIONAL_MODULES,
] as const;

export const SIDEBAR_MODULES = [...REQUIRED_MODULES, ...TOGGLEABLE_MODULES] as const;

export type SidebarModuleId = typeof SIDEBAR_MODULES[number]['id'];
export type OptionalModuleId = typeof OPTIONAL_MODULES[number]['id'];
export type ToggleableModuleId = typeof TOGGLEABLE_MODULES[number]['id'];

export function withRequiredModules(enabledModules: SidebarModuleId[]): SidebarModuleId[] {
  const enabled = new Set(enabledModules);
  REQUIRED_MODULES.forEach((module) => enabled.add(module.id));
  return SIDEBAR_MODULES.map((module) => module.id).filter((moduleId) => enabled.has(moduleId));
}

export function isSidebarModuleId(value: string): value is SidebarModuleId {
  return SIDEBAR_MODULES.some((module) => module.id === value);
}

export function isOptionalModuleId(value: string): value is OptionalModuleId {
  return OPTIONAL_MODULES.some((module) => module.id === value);
}
