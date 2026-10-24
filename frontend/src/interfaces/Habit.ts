export interface Habit {
  _id: string;
  name: string;
  days: boolean[];
  checkInDates?: string[] | null;
}