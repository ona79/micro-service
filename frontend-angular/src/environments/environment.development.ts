export const environment = {
  production: false,
  apiBaseUrl: '/api',
  demo: (globalThis as Record<string, unknown>)['DEMO'] === true || (globalThis as Record<string, unknown>)['DEMO'] === 'true',
};
