import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MealPlanner from './MealPlanner';
import { apiClient } from '../helpers/auth';
import toast from 'react-hot-toast';

jest.mock('../helpers/auth', () => ({ apiClient: { get: jest.fn(), put: jest.fn() } }));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));
const api = apiClient as jest.Mocked<typeof apiClient>;
const blank = () => ({ meals: {}, breakfast: '', lunch: '', backup: '', shopping: [] });
beforeEach(() => {
    jest.clearAllMocks();
    api.get.mockResolvedValue({ data: { plan: blank(), revision: 0 } });
    api.put.mockResolvedValue({ data: { revision: 1 } });
});

test('shows seven dateless days with ideas above the fields and repeats a dinner', async () => {
    render(<MealPlanner />);
    await screen.findByRole('button', { name: 'Beans on toast' });
    expect(screen.getAllByPlaceholderText(/e.g. pasta/)).toHaveLength(7);
    expect(screen.queryByLabelText('Start date')).toBeNull();
    expect(screen.getByRole('button', { name: 'Beans on toast' }).compareDocumentPosition(screen.getByLabelText('Day 1')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Beans on toast' }));
    const dinners = screen.getAllByPlaceholderText(/e.g. pasta/) as HTMLInputElement[];
    expect(dinners).toHaveLength(7);
    fireEvent.click(screen.getAllByRole('button', { name: /Repeat previous dinner/ })[0]);
    expect(dinners[1].value).toBe('Beans on toast');
    expect(dinners[2].value).toBe('');
    expect(screen.getByText('2 of 7 planned')).toBeTruthy();
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/api/meal-planner', expect.objectContaining({ revision: 0 })));
});

test('changes each row weekday independently and saves without losing meals', async () => {
    api.get.mockResolvedValue({ data: { plan: { ...blank(), startDay: 1, dayWeekdays: { 'day-3': 6 }, meals: { 'day-1': 'Pasta' } }, revision: 2 } });
    render(<MealPlanner />);
    expect((await screen.findByLabelText('Day 1') as HTMLInputElement).value).toBe('Pasta');
    expect(screen.queryByLabelText('Start day')).toBeNull();
    expect(screen.getAllByRole('combobox')).toHaveLength(7);
    expect((screen.getByLabelText('Day 1 weekday') as HTMLSelectElement).value).toBe('1');
    expect((screen.getByLabelText('Day 3 weekday') as HTMLSelectElement).value).toBe('6');
    fireEvent.change(screen.getByLabelText('Day 1 weekday'), { target: { value: '5' } });
    expect((screen.getByLabelText('Day 1') as HTMLInputElement).value).toBe('Pasta');
    expect((screen.getByLabelText('Day 2 weekday') as HTMLSelectElement).value).toBe('2');
    fireEvent.change(screen.getByLabelText('Day 2 weekday'), { target: { value: '6' } });
    fireEvent.click(screen.getByRole('button', { name: 'Beans on toast' }));
    expect((screen.getByLabelText('Day 2') as HTMLInputElement).value).toBe('Beans on toast');
    expect(screen.getByText('Need an idea? Add one to Sunday:')).toBeTruthy();
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/api/meal-planner', expect.objectContaining({ plan: expect.objectContaining({ dayWeekdays: { 'day-1': 5, 'day-2': 6, 'day-3': 6 }, meals: { 'day-1': 'Pasta', 'day-2': 'Beans on toast' } }) })));
});

test('loads stable day slots and adds ideas without replacing existing meals', async () => {
    api.get.mockResolvedValue({ data: { plan: { ...blank(), meals: { 'day-1': 'Pasta' } }, revision: 2 } });
    render(<MealPlanner />);
    await screen.findByRole('button', { name: 'Beans on toast' });
    fireEvent.click(screen.getByRole('button', { name: 'Beans on toast' }));
    fireEvent.click(screen.getByRole('button', { name: 'Soup and bread' }));
    expect((screen.getByLabelText('Day 1') as HTMLInputElement).value).toBe('Pasta');
    expect((screen.getByLabelText('Day 2') as HTMLInputElement).value).toBe('Beans on toast');
    expect((screen.getByLabelText('Day 3') as HTMLInputElement).value).toBe('Soup and bread');
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/api/meal-planner', expect.objectContaining({ revision: 2, plan: expect.objectContaining({ meals: { 'day-1': 'Pasta', 'day-2': 'Beans on toast', 'day-3': 'Soup and bread' } }) })));
});

test('carries the latest seven dated dinners into day slots and preserves older entries', async () => {
    const meals = Object.fromEntries(Array.from({ length: 8 }, (_, index) => [`2027-01-0${index + 1}`, `Dinner ${index + 1}`]));
    api.get.mockResolvedValue({ data: { plan: { ...blank(), meals }, revision: 3 } });
    render(<MealPlanner />);
    expect((await screen.findByLabelText('Day 1') as HTMLInputElement).value).toBe('Dinner 2');
    expect((screen.getByLabelText('Day 7') as HTMLInputElement).value).toBe('Dinner 8');
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/api/meal-planner', expect.objectContaining({ plan: expect.objectContaining({ meals: expect.objectContaining({ ...meals, 'day-1': 'Dinner 2', 'day-7': 'Dinner 8' }) }) })));
});

test('loads the account plan and saves backup, breakfast and shopping checks', async () => {
    api.get.mockResolvedValue({ data: { plan: { ...blank(), backup: 'Frozen pizza' }, revision: 4 } });
    render(<MealPlanner />);
    await screen.findByRole('button', { name: 'Add to next empty day' });
    fireEvent.click(screen.getByRole('button', { name: 'Add to next empty day' }));
    fireEvent.change(screen.getByLabelText('Usual breakfast'), { target: { value: 'Cereal' } });
    fireEvent.click(screen.getByText('Shopping list'));
    fireEvent.change(screen.getByLabelText('Add an item'), { target: { value: 'Bread' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Bread' }));
    expect(screen.getByText('0 to get')).toBeTruthy();
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/api/meal-planner', expect.objectContaining({ revision: 4, plan: expect.objectContaining({ breakfast: 'Cereal', backup: 'Frozen pizza', shopping: [expect.objectContaining({ name: 'Bread', checked: true })] }) })));
    fireEvent.click(screen.getByRole('button', { name: 'Remove Bread' }));
    expect(screen.queryByRole('checkbox', { name: 'Bread' })).toBeNull();
});

test('does not save an empty plan after loading fails and allows retry', async () => {
    api.get.mockRejectedValueOnce(new Error('Offline'));
    render(<MealPlanner />);
    await screen.findByRole('alert');
    expect(api.put).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByRole('button', { name: 'Beans on toast' });
    expect(api.put).not.toHaveBeenCalled();
});

test('retains unsaved changes and retries a failed save', async () => {
    api.put.mockRejectedValueOnce(new Error('Offline'));
    render(<MealPlanner />);
    fireEvent.click(await screen.findByRole('button', { name: 'Soup and bread' }));
    const retryButton = await screen.findByRole('button', { name: 'Retry saving' });
    expect(toast.error).toHaveBeenCalledWith('Failed to save meal plan. Please try again.', { id: 'meal-plan-save' });
    expect(toast.success).not.toHaveBeenCalled();
    fireEvent.click(retryButton);
    await waitFor(() => expect(api.put).toHaveBeenCalledTimes(2));
    expect((screen.getAllByPlaceholderText(/e.g. pasta/)[0] as HTMLInputElement).value).toBe('Soup and bread');
});

test('shows save feedback only after an edit has been saved', async () => {
    let finish: (value: any) => void = () => {};
    api.put.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    render(<MealPlanner />);
    await screen.findByLabelText('Day 1');
    expect(screen.queryByText('Saved to your account. Available on your other devices.')).toBeNull();
    expect(toast.success).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Day 1'), { target: { value: 'Pasta' } });
    await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('status').textContent).toBe('Saving your changes…');
    expect(toast.success).not.toHaveBeenCalled();
    finish({ data: { revision: 1 } });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Meal plan saved.', { id: 'meal-plan-save' }));
    expect(screen.queryByRole('status')).toBeNull();
});

test('serializes saves and keeps edits made during an in-flight request', async () => {
    let finish: (value: any) => void = () => {};
    api.put.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    render(<MealPlanner />);
    fireEvent.click(await screen.findByRole('button', { name: 'Soup and bread' }));
    await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByLabelText('Your go-to meal'), { target: { value: 'Toast' } });
    finish({ data: { revision: 1 } });
    await waitFor(() => expect(api.put).toHaveBeenCalledTimes(2));
    expect(api.put.mock.calls[1][1]).toEqual(expect.objectContaining({ revision: 1, plan: expect.objectContaining({ backup: 'Toast' }) }));
});

test('offers reload rather than overwriting another device on conflict', async () => {
    api.put.mockRejectedValueOnce({ response: { status: 409 } });
    render(<MealPlanner />);
    fireEvent.click(await screen.findByRole('button', { name: 'Beans on toast' }));
    await screen.findByRole('button', { name: /Reload saved plan/ });
    expect(screen.getByRole('status').textContent).toContain('another device');
    expect(api.put).toHaveBeenCalledTimes(1);
});

