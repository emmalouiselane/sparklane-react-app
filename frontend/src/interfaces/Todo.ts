export interface Todo {
  _id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  date?: string;
  time?: string;
  tag?: string;
  sortOrder?: number | null;
  createdAt: string;
  updatedAt: string;
}