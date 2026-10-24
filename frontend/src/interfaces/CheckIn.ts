import { Mood } from "../pages/wellness";

export interface CheckIn { mood: Mood | null; note: string; }
export interface CheckInEntry extends CheckIn { _id: string; dateKey?: string; savedAt: string; }