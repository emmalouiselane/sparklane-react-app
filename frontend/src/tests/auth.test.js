import { apiClient } from '../helpers/auth';

// CRA's Jest setup needs Axios's CommonJS build; its interceptors and request
// handling remain real, with just the network adapter replaced below.
jest.mock('axios', () => jest.requireActual('axios/dist/browser/axios.cjs'));

const response = (config, data = {}) => ({ config, data, status: 200, statusText: 'OK', headers: {} });
let adapter;

beforeEach(() => {
  adapter = jest.fn(async config => response(config,
    config.url === '/auth/csrf' ? { csrfToken: 'current-session-token' } : { ok: true }
  ));
  apiClient.defaults.adapter = adapter;
});

test.each(['post', 'put', 'patch', 'delete'])('%s fetches and sends the session CSRF token with credentials', async method => {
  await apiClient.request({ method, url: '/api/budget/payments/payment-id' });
  expect(adapter.mock.calls.map(([config]) => config.url)).toEqual(['/auth/csrf', '/api/budget/payments/payment-id']);
  const [config] = adapter.mock.calls[1];
  expect(config.headers.get('X-CSRF-Token')).toBe('current-session-token');
  expect(config.withCredentials).toBe(true);
  expect(adapter.mock.calls[0][0].withCredentials).toBe(true);
});

test.each(['get', 'head', 'options'])('%s does not fetch a CSRF token', async method => {
  await apiClient.request({ method, url: '/api/budget' });
  expect(adapter).toHaveBeenCalledTimes(1);
  expect(adapter.mock.calls[0][0].url).toBe('/api/budget');
});

test('later writes fetch a fresh token so a replaced session does not reuse an old token', async () => {
  let session = 'first-session';
  adapter.mockImplementation(async config => response(config,
    config.url === '/auth/csrf' ? { csrfToken: session } : {}
  ));
  await apiClient.delete('/api/budget/payments/first');
  session = 'replacement-session';
  await apiClient.delete('/api/budget/payments/second');
  const deletes = adapter.mock.calls.map(([config]) => config).filter(config => config.method === 'delete');
  expect(deletes.map(config => config.headers.get('X-CSRF-Token'))).toEqual(['first-session', 'replacement-session']);
});

test('concurrent writes share one token fetch and all send its token', async () => {
  let completeTokenFetch;
  let startTokenFetch;
  const started = new Promise(resolve => { startTokenFetch = resolve; });
  adapter.mockImplementation(config => config.url === '/auth/csrf'
    ? new Promise(resolve => {
      completeTokenFetch = () => resolve(response(config, { csrfToken: 'shared-token' }));
      startTokenFetch();
    })
    : Promise.resolve(response(config))
  );
  const writes = [apiClient.delete('/api/budget/payments/first'), apiClient.patch('/api/budget/payments/second', { amount: 10 })];
  await started;
  expect(adapter).toHaveBeenCalledTimes(1);
  completeTokenFetch();
  await Promise.all(writes);
  expect(adapter).toHaveBeenCalledTimes(3);
  for (const [config] of adapter.mock.calls.slice(1)) {
    expect(config.headers.get('X-CSRF-Token')).toBe('shared-token');
  }
});

test('failed token fetch blocks deletion and a later attempt can recover', async () => {
  adapter.mockRejectedValueOnce(new Error('Network unavailable'));
  await expect(apiClient.delete('/api/budget/payments/payment-id')).rejects.toThrow('Network unavailable');
  expect(adapter).toHaveBeenCalledTimes(1);
  await apiClient.delete('/api/budget/payments/payment-id');
  expect(adapter).toHaveBeenCalledTimes(3);
});

test('an empty token response blocks deletion', async () => {
  adapter.mockImplementation(async config => response(config, {}));
  await expect(apiClient.delete('/api/budget/payments/payment-id')).rejects.toThrow('Unable to get a CSRF token');
  expect(adapter).toHaveBeenCalledTimes(1);
});
