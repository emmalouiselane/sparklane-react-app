import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Homepage from './homepage';
jest.mock('../components/UpcomingAgenda', () => () => <div>Events content</div>);
jest.mock('../components/TodoList', () => () => <div>Tasks content</div>);
jest.mock('../components/RecurringRoutines', () => () => <div>Routines content</div>);

test('switches between events and routines while keeping tasks visible', async () => {
  render(<Homepage routinesEnabled />);
  expect(screen.getByText('Events content')).toBeTruthy();
  fireEvent.click(screen.getByRole('tab', { name: 'Recurring Routines' }));
  expect(screen.getByText('Routines content')).toBeTruthy();
  await waitFor(() => expect(screen.queryByText('Events content')).toBeNull());
  expect(screen.getByText('Tasks content')).toBeTruthy();
  fireEvent.click(screen.getByRole('tab', { name: 'Upcoming Events' }));
  expect(screen.getByText('Events content')).toBeTruthy();
});

test('disabled module offers account settings instead of loading routines', () => {
  const openSettings = jest.fn();
  render(<Homepage routinesEnabled={false} onOpenModuleSettings={openSettings} />);
  fireEvent.click(screen.getByRole('tab', { name: 'Recurring Routines' }));
  expect(screen.queryByText('Routines content')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Manage modules' }));
  expect(openSettings).toHaveBeenCalledTimes(1);
});

test('opens the saved default tab and still allows manual switching', () => {
  render(<Homepage routinesEnabled defaultHomepageTab="routines" />);
  expect(screen.getByRole('tab', { name: 'Recurring Routines' }).getAttribute('aria-selected')).toBe('true');
  expect(screen.getByText('Routines content')).toBeTruthy();
  fireEvent.click(screen.getByRole('tab', { name: 'Upcoming Events' }));
  expect(screen.getByRole('tab', { name: 'Upcoming Events' }).getAttribute('aria-selected')).toBe('true');
});
