import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { apiClient } from './helpers/auth';
import { useAuthContext } from './contexts/AuthContext';

jest.mock('./helpers/auth', () => ({ apiClient: { get: jest.fn(), put: jest.fn() } }));
jest.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }: any) => children,
  useAuthContext: jest.fn(),
}));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() }, Toaster: () => null }));
jest.mock('./components/Header', () => () => null);
jest.mock('./components/Footer', () => () => null);
jest.mock('./pages/homepage', () => () => <p>Home content</p>);

const api = apiClient as jest.Mocked<typeof apiClient>;
const auth = useAuthContext as jest.Mock;
const blank = () => ({ meals: {}, breakfast: '', lunch: '', backup: '', shopping: [] });
const account = (id: string) => ({ user: { id, enabledModules: ['meal-planner'] }, isAuthenticated: true, loading: false, error: null, checkAuthStatus: jest.fn(), setError: jest.fn() });

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  auth.mockReturnValue(account('owner'));
  api.get.mockResolvedValue({ data: { plan: blank(), revision: 0 } });
  api.put.mockResolvedValue({ data: { revision: 1 } });
});

test('continues saving and retains the plan when navigating to another module', async () => {
  let finish: (value: any) => void = () => {};
  api.put.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Meal Planner' }));
  fireEvent.change(await screen.findByLabelText('Day 1'), { target: { value: 'Pasta' } });
  fireEvent.click(screen.getByRole('button', { name: 'Home' }));
  expect(screen.queryByRole('heading', { name: 'Meal planner' })).toBeNull();
  await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole('button', { name: 'Meal Planner', hidden: false }));
  fireEvent.change(screen.getByLabelText('Your go-to meal'), { target: { value: 'Toast' } });
  fireEvent.click(screen.getByRole('button', { name: 'Home' }));
  await act(async () => finish({ data: { revision: 1 } }));
  await waitFor(() => expect(api.put).toHaveBeenCalledTimes(2));
  expect(api.put.mock.calls[1][1]).toEqual(expect.objectContaining({ revision: 1, plan: expect.objectContaining({ backup: 'Toast', meals: { 'day-1': 'Pasta' } }) }));
  fireEvent.click(screen.getByRole('button', { name: 'Meal Planner', hidden: false }));
  expect((screen.getByLabelText('Day 1') as HTMLInputElement).value).toBe('Pasta');
  expect(api.get).toHaveBeenCalledTimes(1);
});

test('clears the retained meal plan when the signed-in account changes', async () => {
  const view = render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Meal Planner' }));
  fireEvent.change(await screen.findByLabelText('Day 1'), { target: { value: 'Private dinner' } });
  auth.mockReturnValue(account('other-owner'));
  view.rerender(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Meal Planner' }));
  expect((await screen.findByLabelText('Day 1') as HTMLInputElement).value).toBe('');
  expect(api.get).toHaveBeenCalledTimes(2);
  expect(api.put).not.toHaveBeenCalled();
});
