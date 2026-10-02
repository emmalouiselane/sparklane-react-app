import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import RecurringRoutines from './RecurringRoutines';
import { apiClient } from '../helpers/auth';

jest.mock('../helpers/auth', () => ({ apiClient: { get: jest.fn(), patch: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));
const api = apiClient as jest.Mocked<typeof apiClient>;

test('yesterday’s completed step starts unchecked and saves today’s completion', async () => {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const routine = { _id: 'routine', title: 'Morning', days: [0, 1, 2, 3, 4, 5, 6], time: '08:30', steps: [{ _id: 'step', title: 'Pack lunch', completedOn: '2000-01-01' }] };
  api.get.mockResolvedValue({ data: { routines: [routine] } });
  api.patch.mockResolvedValue({ data: { routine: { ...routine, steps: [{ ...routine.steps[0], completedOn: today }] } } });
  render(<RecurringRoutines todayOnly />);
  const checkbox = await screen.findByRole('checkbox', { name: 'Pack lunch' });
  expect((checkbox as HTMLInputElement).checked).toBe(false);
  fireEvent.click(checkbox);
  await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/api/routines/routine/steps/step', { date: today, completed: true }));
  await screen.findByText('1 of 1 done today — all done!');
  expect((checkbox as HTMLInputElement).checked).toBe(true);
});

test('homepage view only shows today’s scheduled routines', async () => {
  const anotherDay = (new Date().getDay() + 1) % 7;
  api.get.mockResolvedValue({ data: { routines: [{ _id: 'later', title: 'Later routine', days: [anotherDay], time: '', steps: [] }] } });
  render(<RecurringRoutines todayOnly />);
  await screen.findByText(/No routines scheduled for today/);
  expect(screen.queryByText('Later routine')).toBeNull();
});
