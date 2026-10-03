import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiClient } from '../helpers/auth';

export type ShoppingItem = { id: string; name: string; checked: boolean };
export type Plan = { meals: Record<string, string>; startDay?: number; dayWeekdays?: Record<string, number>; breakfast: string; lunch: string; backup: string; shopping: ShoppingItem[] };
const emptyPlan = (): Plan => ({ meals: {}, breakfast: '', lunch: '', backup: '', shopping: [] });

function toSevenDayPlan(plan: Plan): Plan {
    if (Object.keys(plan.meals).some(key => /^day-[1-7]$/.test(key))) return plan;
    const datedMeals = Object.entries(plan.meals).filter(([key]) => /^\d{4}-\d{2}-\d{2}$/.test(key)).sort(([a], [b]) => a.localeCompare(b)).slice(-7);
    if (!datedMeals.length) return plan;
    // Keep dated entries so older dinners are preserved when adopting the dateless planner.
    return { ...plan, meals: { ...plan.meals, ...Object.fromEntries(datedMeals.map(([, meal], index) => [`day-${index + 1}`, meal])) } };
}

export function useMealPlan() {
    const [plan, setPlan] = useState<Plan>(emptyPlan);
    const [savedPlan, setSavedPlan] = useState<Plan | null>(null);
    const [revision, setRevision] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [reload, setReload] = useState(0);

    useEffect(() => {
        let active = true;
        setLoading(true);
        setLoadError(false);
        apiClient.get('/api/meal-planner').then(({ data }: { data: { plan: Plan; revision: number } }) => {
            if (!active) return;
            setPlan(toSevenDayPlan(data.plan));
            setSavedPlan(data.plan);
            setRevision(data.revision);
            setSaveError('');
        }).catch(() => { if (active) setLoadError(true); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [reload]);

    // Serialize saves so typing during a request cannot send older data after newer data.
    useEffect(() => {
        if (loading || loadError || saving || saveError || !savedPlan || plan === savedPlan) return;
        const snapshot = plan;
        const timer = window.setTimeout(() => {
            setSaving(true);
            apiClient.put('/api/meal-planner', { plan: snapshot, revision }).then(({ data }: { data: { revision: number } }) => {
                setSavedPlan(snapshot);
                setRevision(data.revision);
                toast.success('Meal plan saved.', { id: 'meal-plan-save' });
            }).catch((error: any) => {
                setSaveError(error.response?.status === 409 ? 'conflict' : 'failed');
                toast.error(error.response?.status === 409
                    ? 'Your meal plan changed on another device. Reload the saved plan before trying again.'
                    : 'Failed to save meal plan. Please try again.', { id: 'meal-plan-save' });
            }).finally(() => setSaving(false));
        }, 400);
        return () => window.clearTimeout(timer);
    }, [plan, savedPlan, revision, loading, loadError, saving, saveError]);

    const unsaved = savedPlan !== null && plan !== savedPlan;
    useEffect(() => {
        if (!unsaved) return;
        const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [unsaved]);

    return { plan, setPlan, loading, loadError, saving, saveError, unsaved,
        retrySave: () => setSaveError(''), reloadPlan: () => setReload(value => value + 1) };
}
