import { AuthApi } from './api/auth';
import { AUTH_EXPIRED, initializeTabSession, tabSession } from './api/TabSession';
initializeTabSession();
const query = new URLSearchParams(location.search);
const debug = ['scene', 'debug', 't', 'q'].some((key) => query.has(key));
const auth = new AuthApi();
// Preserve the P0 experiment behind its existing explicit debug parameters.
if (debug && (await auth.session().catch(() => ({ authenticated: false }))).authenticated) {
  document.body.classList.add(['fengqiao','jiangxue'].includes(query.get('lab') ?? '') ? 'sample-lab' : 'legacy');
  window.addEventListener('pagehide', () => tabSession.release());
  const restore = () => { void auth.session().then(session => { if (!session.authenticated) location.replace(location.pathname + '#/login'); }).catch(() => {}); };
  window.addEventListener('focus', restore);
  window.addEventListener('pageshow', event => { if (event.persisted) restore(); });
  window.setInterval(() => { if (!document.hidden) restore(); }, 60_000);
  window.addEventListener(AUTH_EXPIRED, () => { location.replace(location.pathname + '#/login'); });
  if (query.get('lab') === 'fengqiao') void import('./labs/fengqiao');
  else if (query.get('lab') === 'jiangxue') void import('./labs/jiangxue');
  else void import('./legacy');
} else {
  void import('./app/Application').then(({ Application }) => {
    new Application(document.querySelector<HTMLElement>('#app')!).start();
  });
}
