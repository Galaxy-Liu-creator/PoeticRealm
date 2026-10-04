// Isolate layout/guest regressions from a live database. Real auth is checked by verify-auth.mjs.
export async function guestAuth(context) {
  await context.route('**/api/v1/auth/*', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/session')) {
      await route.fulfill({ json: { authenticated: false, user: null } });
    } else if (path.endsWith('/csrf')) {
      await route.fulfill({ json: { headerName: 'X-CSRF-TOKEN', token: 'guest-ui-fixture' } });
    } else {
      await route.fulfill({ status: 503, json: { code: 'TEST_SERVICE_UNAVAILABLE', message: 'Intentional UI fixture' } });
    }
  });
}
