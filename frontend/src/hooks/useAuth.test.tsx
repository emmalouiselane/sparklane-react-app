import { act, renderHook, waitFor } from '@testing-library/react';
import { useAuth } from './useAuth';
import { apiClient } from '../helpers/auth';

jest.mock('../helpers/auth', () => ({ apiClient: { get: jest.fn(), post: jest.fn() } }));

beforeEach(() => {
  jest.clearAllMocks();
  (apiClient.get as jest.Mock).mockResolvedValue({ data: { user: { id: 'owner' } } });
});

test('failed logout keeps the account visible and reports that the session did not end', async () => {
  (apiClient.post as jest.Mock).mockRejectedValue(new Error('Network failure'));
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const { result, rerender } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    const check = result.current.checkAuthStatus;
    rerender();
    expect(result.current.checkAuthStatus).toBe(check);
    await act(async () => result.current.handleLogout());
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.error).toBe('Logout failed. Please try again to end your session.');
  } finally { log.mockRestore(); }
});

test('confirmed logout clears the account', async () => {
  (apiClient.post as jest.Mock).mockResolvedValue({ data: {} });
  const { result } = renderHook(() => useAuth());
  await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
  await act(async () => result.current.handleLogout());
  expect(result.current.isAuthenticated).toBe(false);
  expect(result.current.user).toBeNull();
});
