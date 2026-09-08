import { shouldServeFrontend } from './frontend-fallback';

describe('shouldServeFrontend', () => {
  it('serves the application shell for the public root without an Accept header', () => {
    expect(
      shouldServeFrontend({
        method: 'GET',
        path: '/',
        headers: {},
      }),
    ).toBe(true);
  });

  it('serves the application shell for the public root with a wildcard Accept header', () => {
    expect(
      shouldServeFrontend({
        method: 'GET',
        path: '/',
        headers: { accept: '*/*' },
      }),
    ).toBe(true);
  });

  it('keeps explicit JSON requests to the root out of the frontend fallback', () => {
    expect(
      shouldServeFrontend({
        method: 'GET',
        path: '/',
        headers: { accept: 'application/json' },
      }),
    ).toBe(false);
  });

  it('keeps non-root requests without an Accept header out of the frontend fallback', () => {
    expect(
      shouldServeFrontend({
        method: 'GET',
        path: '/unknown-api-route',
        headers: {},
      }),
    ).toBe(false);
  });

  it('keeps non-navigation API requests out of the frontend fallback', () => {
    expect(
      shouldServeFrontend({
        method: 'GET',
        path: '/unknown-api-route',
        headers: { accept: 'application/json' },
      }),
    ).toBe(false);
  });

  it('serves client-side routes requested as HTML documents', () => {
    expect(
      shouldServeFrontend({
        method: 'GET',
        path: '/login',
        headers: { accept: 'text/html,application/xhtml+xml' },
      }),
    ).toBe(true);
  });

  it('does not serve the application shell for non-GET requests', () => {
    expect(
      shouldServeFrontend({
        method: 'POST',
        path: '/',
        headers: { accept: 'text/html' },
      }),
    ).toBe(false);
  });
});
