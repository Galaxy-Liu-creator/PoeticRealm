import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import {openCurtainForm} from './entry-navigation.mjs';

// Run only against an isolated test database or the project's new Docker database.
const origin = process.env.UI_ORIGIN || 'http://127.0.0.1:5186';
const output = process.env.UI_OUTPUT || 'output/page-session/browser';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const report = { complete: false, checks: [], errors: [], username: 'sqa_' + Date.now().toString().slice(-9) };
const check = label => { report.checks.push(label); console.log('PASS ' + label); };
context.on('page', page => page.on('pageerror', error => report.errors.push(error.message)));
const page = await context.newPage();
const ready = async page => { await page.locator('#app[data-initialized=true][data-ready=ready]').waitFor(); };
const logged = async page => { await page.locator('body[data-page=home] #app[data-auth=authenticated]').waitFor(); await ready(page); };
const credential = page => page.evaluate(() => JSON.parse(sessionStorage.getItem('poetic-realm.tab-session.v1')));
try {
  await page.goto(origin + '/#/poems/fengqiao'); await ready(page);
  assert(page.url().endsWith('#/account'));
  assert(await page.locator('.curtain-closed').isVisible());
  assert.equal(await page.locator('.auth-tools a, .guest-link').count(), 0);
  await page.evaluate(() => { location.hash = '/favorites'; });
  await page.locator('body[data-page=account]').waitFor();
  assert.equal(await page.locator('.favorites-page,.home-page,.poem-page').count(), 0);
  check('fresh opens and private deep links show the curtain; no home or guest bypass');

  await openCurtainForm(page,'register');
  await page.locator('body[data-page=register] form').waitFor();
  await page.locator('[name=username]').fill(report.username);
  await page.locator('[name=password]').fill('Testpass123!');
  await page.locator('[name=confirmation]').fill('Testpass123!');
  await page.locator('[name=agreement]').check();
  await page.locator('[type=submit]').click();
  await page.locator('body[data-page=login]').waitFor();
  await page.locator('.form-feedback').filter({ hasText: '注册成功' }).waitFor();
  assert.equal(await page.locator('[name=username]').inputValue(), report.username);
  check('registration returns to login without granting access');
  await page.locator('[name=password]').fill('Testpass123!');
  await page.locator('[name=remember]').check();
  await page.locator('[type=submit]').click(); await logged(page);
  let first = await credential(page);
  assert.equal(first.token.length, 43); assert.equal(first.lease.length, 43);
  assert(!await page.evaluate(() => JSON.stringify(localStorage).includes('Testpass123!')));
  const cookie = (await context.cookies()).find(cookie => cookie.name === 'POETIC_REMEMBER');
  assert(cookie?.httpOnly); assert.equal(cookie.sameSite, 'Lax');
  assert(cookie.expires > Date.now() / 1000 + 29 * 86400);
  check('explicit login issues a tab token; 30-day credential is HttpOnly and stores no password');

  const cookieSession = await context.request.get(origin + '/api/v1/auth/session');
  assert.equal((await cookieSession.json()).authenticated, false);
  assert.equal((await context.request.get(origin + '/api/v1/me')).status(), 401);
  check('remembered and CSRF cookies alone cannot authenticate protected APIs');

  await page.locator('[data-poem=fengqiao] [data-favorite]').click();
  await page.locator('[data-poem=fengqiao] .enter-button').click();
  await page.locator('body[data-page=poem]').waitFor();
  await page.reload(); await ready(page);
  assert(page.url().endsWith('#/account'));
  assert.equal(await page.locator('#app').getAttribute('data-auth'), 'authenticated');
  const refreshed = await credential(page);
  assert.notEqual(refreshed.lease, first.lease);
  assert.equal((await context.request.get(origin + '/api/v1/me', { headers: { 'X-POETIC-TOKEN': refreshed.token } })).status(), 200);
  await page.evaluate(() => { location.hash = '/poems/fengqiao'; });
  await page.locator('body[data-page=poem]').waitFor();
  assert.equal(await page.locator('.poem-toolbar [data-favorite]').getAttribute('aria-pressed'), 'true');
  for (const route of ['favorites', 'profile']) {
    await page.evaluate(route => { location.hash = '/' + route; }, route);
    await page.locator(`body[data-page=${route}]`).waitFor();
    await page.reload(); await ready(page); assert(page.url().endsWith('#/account'));
    assert.equal(await page.locator('#app').getAttribute('data-auth'), 'authenticated');
    await page.evaluate(route => { location.hash = '/' + route; }, route);
    await page.locator(`body[data-page=${route}]`).waitFor();
  }
  first = await credential(page);
  check('reload returns to the curtain while preserving identity, reload lease and account data');

  const second = await context.newPage(); await second.goto(origin); await ready(second);
  assert(second.url().endsWith('#/account'));await openCurtainForm(second);
  await second.locator('form[data-remembered=true]').waitFor();
  assert(second.url().endsWith('#/login'));
  assert.equal(await second.locator('[name=username]').inputValue(), report.username);
  assert.equal(await second.locator('[name=password]').inputValue(), '');
  assert.equal(await second.locator('[name=password]').getAttribute('placeholder'), '••••••••');
  assert.equal(await second.evaluate(() => sessionStorage.getItem('poetic-realm.tab-session.v1')), null);
  await second.screenshot({ path: output + '/remembered-login.png' });
  await second.locator('[type=submit]').click(); await logged(second);
  const secondAccess = await credential(second); assert.notEqual(secondAccess.token, first.token);
  assert.equal((await context.request.get(origin + '/api/v1/me', { headers: { 'X-POETIC-TOKEN': first.token } })).status(), 200);
  check('new tab starts at curtain, then pre-fills remembered state and waits for login click to issue its own token');

  const popupWait = page.waitForEvent('popup');
  await page.evaluate(url => { window.open(url, '_blank'); }, origin + '/#/favorites');
  const popup = await popupWait; await ready(popup);
  assert(popup.url().endsWith('#/account'));
  assert.equal(await popup.evaluate(() => sessionStorage.getItem('poetic-realm.tab-session.v1')), null);
  assert.equal((await context.request.get(origin + '/api/v1/me', { headers: { 'X-POETIC-TOKEN': first.token } })).status(), 200);
  await popup.close();
  check('opener-cloned sessionStorage cannot bypass login or revoke the original tab');

  // Trigger the same pagehide handler used by a real closing document, then close it.
  // Browser automation's Target.close is not guaranteed to dispatch pagehide.
  const closing = await credential(second);
  const released = second.waitForResponse(response => response.url().endsWith('/api/v1/auth/release'));
  await second.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false })));
  assert.equal((await released).status(), 204);
  assert.equal((await context.request.get(origin + '/api/v1/me', { headers: { 'X-POETIC-TOKEN': closing.token } })).status(), 401);
  await second.close();
  const reopened = await context.newPage(); await reopened.goto(origin); await ready(reopened);
  assert(reopened.url().endsWith('#/account'));await openCurtainForm(reopened);
  await reopened.locator('form[data-remembered=true]').waitFor();
  assert(reopened.url().endsWith('#/login'));
  await reopened.waitForTimeout(16_000);
  assert.equal((await context.request.get(origin + '/api/v1/me', { headers: { 'X-POETIC-TOKEN': closing.token } })).status(), 401);
  const expiredReload = await context.request.get(origin + '/api/v1/auth/session', { headers: { 'X-POETIC-TOKEN': closing.token, 'X-POETIC-LEASE': closing.lease } });
  assert.equal((await expiredReload.json()).authenticated, false);
  assert.equal((await context.request.get(origin + '/api/v1/me', { headers: { 'X-POETIC-TOKEN': first.token } })).status(), 200);
  check('pagehide immediately revokes access; the reload capability expires; reopening requires login');

  await reopened.locator('[name=remember]').uncheck();
  await reopened.locator('[type=submit]').click(); await logged(reopened);
  assert(!(await context.cookies()).some(cookie => cookie.name === 'POETIC_REMEMBER'));
  await reopened.evaluate(() => { location.hash = '/profile'; });
  await reopened.locator('[data-logout]').click(); await reopened.locator('body[data-page=account]').waitFor();
  assert.equal(await reopened.evaluate(() => sessionStorage.getItem('poetic-realm.tab-session.v1')), null);
  await reopened.evaluate(() => { location.hash = '/'; }); await reopened.locator('body[data-page=account]').waitFor();
  check('unchecking remembered login revokes its persistent credential; logout clears access and guards Back');

  await openCurtainForm(reopened);
  await reopened.locator('[name=username]').fill(report.username);
  await reopened.locator('[name=password]').fill('Testpass123!');
  await reopened.locator('[type=submit]').click(); await logged(reopened);
  const revoked = await credential(reopened);
  const csrf = await (await context.request.get(origin + '/api/v1/auth/csrf')).json();
  assert.equal((await context.request.post(origin + '/api/v1/auth/logout', { headers: { 'X-POETIC-TOKEN': revoked.token, [csrf.headerName]: csrf.token } })).status(), 204);
  await reopened.evaluate(() => window.dispatchEvent(new Event('focus')));
  await reopened.locator('body[data-page=account]').waitFor();
  check('server-side token revocation returns the active document to the curtain');
  assert.deepEqual(report.errors, []); report.complete = true;
} catch (error) {
  report.failure = { message: error.message, url: page.url(), page: await page.locator('body').getAttribute('data-page'), feedback: await page.locator('.form-feedback').textContent().catch(() => null), sceneFailure:await page.locator('.realm-transition').getAttribute('data-failure').catch(()=>null) };
  await page.screenshot({ path: output + '/failure.png' }); throw error;
} finally {
  await context.close(); await browser.close();
  await writeFile(output + '/session-verification.json', JSON.stringify(report, null, 2) + '\n');
}
