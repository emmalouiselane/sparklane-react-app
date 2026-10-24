import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Homepage from '../pages/homepage';

jest.mock('../components/todo-list', () => () => <div>Tasks content</div>);
jest.mock('../components/recurring-routines', () => () => <div>Habits content</div>);
jest.mock('../hooks/use-meal-plan', () => ({
  useMealPlan: () => ({ plan: { meals: {}, breakfast: '', lunch: '', backup: '', shopping: [] }, loading: false, loadError: false, reloadPlan: jest.fn() }),
}));

beforeEach(() => window.localStorage.clear());

test('shows the Today dashboard with priorities and the Little by little habits card', () => {
  render(<Homepage routinesEnabled />);

  expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
  expect(screen.getByText('Tasks content')).toBeTruthy();
  expect(screen.getByText('Habits content')).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Today’s priorities' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Little by little' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Meals & Home' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'How are you feeling today?' })).toBeTruthy();
});

test('offers module settings when optional modules are disabled', () => {
  const openSettings = jest.fn();
  render(<Homepage enabledModuleCount={0} onOpenModuleSettings={openSettings} />);

  expect(screen.queryByText('Habits content')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Manage modules' }));
  fireEvent.click(screen.getByRole('button', { name: 'Enable habits' }));
  fireEvent.click(screen.getByRole('button', { name: 'Enable in settings' }));
  expect(openSettings).toHaveBeenCalledTimes(3);
});

test('links into week and wellness sections and saves the mood check-in', () => {
  const selectModule = jest.fn();
  render(<Homepage userId="planner-owner" mealsEnabled onSelectModule={selectModule} />);

  fireEvent.click(screen.getByRole('button', { name: 'My week' }));
  fireEvent.click(screen.getByRole('button', { name: 'Open meals & home' }));
  fireEvent.click(screen.getByRole('button', { name: 'Open wellness' }));
  fireEvent.click(screen.getByRole('button', { name: 'Good' }));

  expect(selectModule.mock.calls).toEqual([[ 'my-week' ], [ 'meal-planner' ], [ 'wellness' ]]);
  expect(JSON.parse(window.localStorage.getItem('sparklane_wellness_checkin:planner-owner') || '{}').mood).toBe('Good');
});
