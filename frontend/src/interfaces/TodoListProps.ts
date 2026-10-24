export interface TodoListProps {
  heading?: string;
  eyebrow?: string;
  subtitle?: string;
  inlineEditing?: boolean;
  showAddButton?: boolean;
  includeCalendarEvents?: boolean;
  selectedDate?: string;
  pageModuleId?: string;
  onManageTasks?: () => void;
}