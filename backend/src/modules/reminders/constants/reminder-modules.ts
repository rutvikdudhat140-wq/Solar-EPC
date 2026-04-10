export const REMINDER_MODULES = [
  'dashboard',
  'crm',
  'tasks',
  'intelligence',
  'survey',
  'design',
  'documentation',
  'procurement',
  'inventory',
  'projects',
  'logistics',
  'installation',
  'commissioning',
  'finance',
  'service',
  'compliance',
  'hrm',
  'admin',
  'settings',
] as const;

export type ReminderModuleId = typeof REMINDER_MODULES[number];

export const REMINDER_MODULE_ALIASES: Record<string, ReminderModuleId> = {
  sales: 'crm',
  project: 'projects',
};

export const normalizeReminderModule = (value?: string): ReminderModuleId | string => {
  const normalized = String(value || 'dashboard').trim().toLowerCase();
  return REMINDER_MODULE_ALIASES[normalized] || normalized;
};
