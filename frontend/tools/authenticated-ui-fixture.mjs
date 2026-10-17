// Isolated identity fixture for visual motion tests. Real authentication is tested separately.
import {openCurtainForm} from './entry-navigation.mjs';
const token = 't'.repeat(43), lease = 'l'.repeat(43);
const user = { id: 99001, username: 'motion_fixture', birthday: null, gender: '', createdAt: '2026-10-05T00:00:00Z' };
export async function authenticatedUi(context) {
  await context.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const authorized = route.request().headers()['x-poetic-token'] === token;
    let payload;
    if (path.endsWith('/csrf')) payload = { headerName: 'X-CSRF-TOKEN', token: 'fixture-csrf' };
    else if (path.endsWith('/remembered')) payload = { remembered: false, username: null };
    else if (path.endsWith('/login')) payload = { authenticated: true, user, token, lease };
    else if (path.endsWith('/session')) payload = { authenticated: authorized, user: authorized ? user : null, lease: authorized ? lease : null };
    else if (path.endsWith('/release')) { await route.fulfill({ status: 204 }); return; }
    else { await route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"Visual fixture: endpoint unavailable"}' }); return; }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
  });
}
export async function openAuthenticatedPage(page, url) {
  await page.goto(url);
  await page.locator('#app[data-initialized=true]').waitFor();
  if (['account','login'].includes(await page.locator('body').getAttribute('data-page'))) {
    await openCurtainForm(page);
    await page.locator('[name=username]').fill('motion_fixture');
    await page.locator('[name=password]').fill('Fixturepass123!');
    await page.locator('[type=submit]').click();
  }
  await page.locator('body[data-page=home] #app[data-ready=ready]').waitFor();
  const hash = new URL(url).hash;
  if (hash && hash !== '#/') await page.evaluate(hash => { location.hash = hash; }, hash);
}
