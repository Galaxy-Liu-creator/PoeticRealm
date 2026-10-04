import { parseRoute, type Route } from './Router';
import { findPoem } from '../content/catalog';
import { LibraryStore, normalizeLibrary, STORE_KEY } from '../stores/LibraryStore';
import { LoginMemory } from '../stores/LoginMemory';
import { AuthStore } from '../stores/AuthStore';
import { AGREEMENT_VERSION } from '../api/auth';
import { openAuthPolicy } from '../ui/components/AuthPolicy';
import { navigation } from '../ui/components/Navigation';
import { artwork } from '../ui/components/artwork';
import { homePage } from '../ui/pages/Home';
import { favoritesPage } from '../ui/pages/Favorites';
import { profilePage } from '../ui/pages/Profile';
import { poemPage } from '../ui/pages/Poem';
import { accountPage, entryPage } from '../ui/pages/Account';
import { openProfileEditor } from '../ui/components/ProfileEditor';
import { CurtainReveal } from '../transition/CurtainReveal';
import { curtainPanels } from '../transition/CurtainDrape';
import { listPageSize } from '../ui/components/Pagination';
import { MotionLoop } from '../systems/motion/MotionLoop';
import { OverviewMotion } from '../systems/motion/OverviewMotion';
import { RealmReveal, type RealmId } from '../transition/RealmReveal';
import '../ui/styles/application.css';
import '../ui/styles/account.css';
import '../ui/styles/typography.css';
import '../ui/styles/motion.css';

export class Application {
  private store = new LibraryStore();
  private loginMemory = new LoginMemory();
  private auth = new AuthStore();
  private pendingVisits: string[] = [];
  private disposed = false;
  private route: Route = parseRoute(location.hash);
  private previous = '/';
  private homeScroll = 0;
  private homePoem = '';
  private listPages = { home: 1, favorites: 1 };
  private pageSize = listPageSize(innerWidth);
  private reveal = new CurtainReveal();
  private revealing = false;
  private motion = matchMedia('(prefers-reduced-motion: reduce)');
  private observer?: IntersectionObserver;
  private renderVersion = 0;
  private artworkReady: Promise<boolean> = Promise.resolve(true);
  private noticeTimer?: number;
  private motionLoop = new MotionLoop();
  private overviewMotion?: OverviewMotion;
  private realmReveal = new RealmReveal(this.motionLoop);
  constructor(private root: HTMLElement) {}
  start(): void {
    document.documentElement.style.setProperty('--paper-art', `url('${artwork.paper}')`);
    this.root.addEventListener('click', this.onClick);
    this.root.addEventListener('change', this.onChange);
    this.root.addEventListener('submit', this.onSubmit);
    window.addEventListener('hashchange', this.onRoute);
    window.addEventListener('storage', this.onStorage);
    window.addEventListener('resize', this.onResize);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.motion.addEventListener('change', this.onVisibility);
    if (this.route.page === 'poem') this.recordVisit(this.route.id);
    this.render();
    // Separate from the preserved P0 __POETIC__ API; no query params steal UI routes.
    Object.assign(window, { __POETIC_MOTION__: {
      pause: () => this.motionLoop.pause(), play: () => this.motionLoop.play(),
      seek: (t: number) => this.motionLoop.seek(t), transition: (p: number) => this.realmReveal.seek(p),
      cancel: () => this.realmReveal.cancel(),
    } });
    this.auth.onChange = this.onIdentity;
    void this.auth.restore();
    window.addEventListener('focus', this.onFocus);
    window.addEventListener('pagehide', (event) => {
      if (event.persisted) return;
      this.disposed = true; this.auth.onChange = undefined;
      this.observer?.disconnect(); this.reveal.cancel(); clearTimeout(this.noticeTimer);
      this.realmReveal.cancel(); this.overviewMotion?.dispose(); this.motionLoop.dispose();
      window.removeEventListener('hashchange', this.onRoute);
      window.removeEventListener('storage', this.onStorage);
      window.removeEventListener('resize', this.onResize);
      window.removeEventListener('focus', this.onFocus);
      document.removeEventListener('visibilitychange', this.onVisibility);
      this.motion.removeEventListener('change', this.onVisibility);
    }, { once: true });
  }
  private onFocus = (): void => { void this.auth.restore(); };
  private onIdentity = (): void => {
    const user = this.auth.user;
    this.root.dataset.auth = user ? 'authenticated' : this.auth.available ? 'guest' : 'unavailable';
    const key = user ? STORE_KEY + '.account.' + user.id : STORE_KEY;
    const changed = key !== this.store.key;
    if (changed) {
      document.querySelector<HTMLDialogElement>('.profile-editor')?.close();
      this.store = new LibraryStore(undefined, key, user ? { name: user.username, gender: user.gender } : undefined);
      this.listPages.favorites = 1;
    }
    const visited = this.pendingVisits.length > 0;
    this.pendingVisits.splice(0).forEach((id) => this.store.visit(id));
    if ((changed || visited) && !['login', 'register'].includes(this.route.page)) this.render();
  };
  private recordVisit(id: string): void {
    if (!this.auth.ready) this.pendingVisits.push(id);
    else this.store.visit(id);
  }
  private onStorage = (event: StorageEvent): void => {
    if (event.key !== this.store.key) return;
    try { this.store.data = normalizeLibrary(event.newValue ? JSON.parse(event.newValue) : null); this.render(); }
    catch { this.notify('另一窗口的本机资料无法读取。'); }
  };
  private onResize = (): void => {
    const size = listPageSize(innerWidth);
    if (size === this.pageSize) return;
    for (const key of ['home', 'favorites'] as const) {
      this.listPages[key] = Math.floor((this.listPages[key] - 1) * this.pageSize / size) + 1;
    }
    this.pageSize = size;
    if (this.route.page === 'home' || this.route.page === 'favorites') this.render();
  };
  private turnPage(page: number, focus: string): void {
    const key = this.route.page;
    if (key !== 'home' && key !== 'favorites') return;
    this.listPages[key] = page;
    this.render();
    this.root.querySelector<HTMLElement>('#main')?.scrollIntoView({ block: 'start' });
    const control = this.root.querySelector<HTMLElement>(focus);
    (control && !control.matches(':disabled') ? control : this.root.querySelector<HTMLElement>('[data-list-page]'))?.focus({ preventScroll: true });
  }
  private jumpPage(input: HTMLInputElement, focusInput = true): void {
    if (!input.isConnected) return;
    const key = this.route.page;
    if (key !== 'home' && key !== 'favorites') return;
    const value = input.value.trim().normalize('NFKC');
    if (!/^\d+$/.test(value)) {
      input.value = String(this.listPages[key]);
      if (value) this.notify(`请输入整数页码（1–${input.dataset.pageCount}）`);
      return;
    }
    const page = Math.max(1, Math.min(Number(input.dataset.pageCount), Number(value)));
    if (page === this.listPages[key]) { input.value = String(page); return; }
    this.turnPage(page, focusInput ? '[data-list-page]' : '#main');
  }
  private onVisibility = (): void => {
    document.body.classList.toggle('no-motion', this.motion.matches || !this.store.data.preferences.motion);
    document.body.classList.toggle('page-hidden', document.hidden);
    if ((this.motion.matches || !this.store.data.preferences.motion) && this.revealing) this.reveal.cancel();
    this.reveal.setHidden(document.hidden);
    this.overviewMotion?.setEnabled(!this.motion.matches && this.store.data.preferences.motion);
    this.realmReveal.setReduced(this.motion.matches || !this.store.data.preferences.motion);
  };
  private onRoute = (): void => {
    const next = parseRoute(location.hash);
    this.realmReveal.cancel();
    if (next.path === this.route.path) return;
    document.querySelector<HTMLDialogElement>('.profile-editor')?.close();
    if (this.route.page === 'home') this.homeScroll = scrollY;
    this.previous = this.route.path;
    if (this.route.page === 'poem') this.homePoem = this.route.id;
    if (this.revealing) this.reveal.cancel();
    this.route = next;
    if (next.page === 'poem') this.recordVisit(next.id);
    this.render();
    window.scrollTo(0, next.page === 'home' ? this.homeScroll : 0);
    const focus = next.page === 'home' && this.homePoem
      ? this.root.querySelector<HTMLElement>(`[data-poem="${this.homePoem}"] .enter-button`)
      : this.root.querySelector<HTMLElement>('#main');
    focus?.focus({ preventScroll: true });
  };
  private render(): void {
    this.realmReveal.cancel();
    this.overviewMotion?.dispose(); this.overviewMotion = undefined;
    this.observer?.disconnect();
    clearTimeout(this.noticeTimer);
    const route = this.route;
    document.body.dataset.page = route.page;
    document.body.classList.toggle('dark', this.store.data.preferences.dark);
    this.onVisibility();
    let content: string;
    switch (route.page) {
      case 'home': content = homePage(this.store, this.listPages.home, this.pageSize); break;
      case 'favorites': content = favoritesPage(this.store, this.listPages.favorites, this.pageSize); break;
      case 'profile': content = profilePage(this.store, this.auth.user); break;
      case 'poem': content = poemPage(findPoem(route.id)!, this.store); break;
      case 'account': content = entryPage(); break;
      case 'login': case 'register': content = accountPage(route.page === 'register', this.store.data.preferences.dark); break;
      default: content = '<main id="main" class="empty-state page-width" tabindex="-1"><h1>未找到这页诗境</h1><p>这首诗或页面暂未收录。</p><a class="enter-button" href="#/">返回诗词总览 →</a></main>';
    }
    this.root.innerHTML = `<a class="skip-link" href="#main">跳至正文</a>${['account', 'login', 'register'].includes(route.page) ? '' : navigation(route)}${content}<div class="storage-warning" role="status" ${this.store.warning ? '' : 'hidden'}></div><div class="toast" role="status" aria-live="polite" hidden></div>`;
    this.root.querySelector('.storage-warning')!.textContent = this.store.warning;
    if (route.page === 'login') {
      const remembered = this.loginMemory.read();
      this.root.querySelector<HTMLInputElement>('[name=remember]')!.checked = Boolean(remembered);
      this.root.querySelector<HTMLInputElement>('[name=username]')!.value = remembered?.username ?? '';
    }
    if (route.page === 'home' || route.page === 'favorites') {
      this.listPages[route.page] = Number(this.root.querySelector<HTMLInputElement>('[data-list-page]')?.value || 1);
    }
    document.title = `${route.page === 'poem' ? findPoem(route.id)!.title : ({ home: '诗词总览', favorites: '我的收藏', profile: '个人中心', account: '循诗入境', login: '欢迎回境', register: '创建账号', missing: '未找到页面' })[route.page]} · 诗境`;
    const grid = this.root.querySelector('.poem-grid');
    if (grid) {
      this.observer = new IntersectionObserver(([entry]) => grid.classList.toggle('float-visible', entry?.isIntersecting ?? false));
      this.observer.observe(grid);
    }
    this.overviewMotion = new OverviewMotion(this.root, this.motionLoop);
    this.overviewMotion.setEnabled(!this.motion.matches && this.store.data.preferences.motion);
    // The entry and transition share the same closed fabric and reference shading.
    if (route.page === 'account') {
      this.root.querySelector('.curtain-closed')!.innerHTML = curtainPanels();
    }
    const version = ++this.renderVersion;
    this.root.dataset.ready = 'loading';
    const sources = new Set<string>([artwork.paper]);
    this.root.querySelectorAll<HTMLElement>('[style]').forEach((element) => {
      for (const match of element.getAttribute('style')!.matchAll(/url\('([^']+)'\)/g)) sources.add(match[1]!);
    });
    this.artworkReady = Promise.all(Array.from(sources, async (url) => {
      const image = new Image();
      image.src = url;
      try { await image.decode(); return true; }
      catch { this.notify('部分山水画面未能加载，请刷新重试。'); return false; }
    })).then((loaded) => {
      if (version === this.renderVersion) this.root.dataset.ready = 'ready';
      return loaded.every(Boolean);
    });
  }
  private notify(message: string): void {
    const toast = this.root.querySelector<HTMLElement>('.toast');
    if (toast) {
      toast.textContent = message; toast.hidden = false;
      clearTimeout(this.noticeTimer);
      this.noticeTimer = window.setTimeout(() => { toast.hidden = true; }, 4000);
    }
    const warning = this.root.querySelector<HTMLElement>('.storage-warning');
    if (warning) { warning.textContent = this.store.warning; warning.hidden = !this.store.warning; }
  }
  private onClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement;
    const entry = target.closest<HTMLAnchorElement>('a[href^="#/poems/"]');
    if (entry && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0) {
      const destination = parseRoute(entry.hash);
      if (destination.page === 'poem' && destination.path !== this.route.path) {
        event.preventDefault();
        if (this.realmReveal.active) return;
        const sourcePath=this.route.path;
        const poem=findPoem(destination.id)!;
        const markup=navigation(destination)+poemPage(poem,this.store);
        this.overviewMotion?.setSuspended(true);
        void this.realmReveal.play(this.root,destination.id as RealmId,markup,artwork.scenes[destination.id]!,this.motion.matches || !this.store.data.preferences.motion).then(complete=>{
          if (complete && !this.disposed && this.route.path===sourcePath) {
            history.pushState(null,'','#'+destination.path);this.onRoute();
          }
        }).finally(()=>this.overviewMotion?.setSuspended(false));
        return;
      }
    }
    const logout = target.closest<HTMLButtonElement>('[data-logout]');
    if (logout && !logout.disabled) {
      logout.disabled = true;
      void this.auth.logout().then(() => {
        if (!this.disposed) { this.render(); this.notify('已退出登录，恢复游客本机资料'); }
      }).catch((error) => {
        if (!this.disposed) this.notify(error instanceof Error ? error.message : '退出失败，请重试');
      }).finally(() => { logout.disabled = false; });
      return;
    }
    const theme = target.closest<HTMLButtonElement>('[data-auth-theme]');
    if (theme) {
      this.store.data.preferences.dark = !this.store.data.preferences.dark;
      this.store.save();
      document.body.classList.toggle('dark', this.store.data.preferences.dark);
      theme.setAttribute('aria-pressed', String(this.store.data.preferences.dark));
      if (this.store.warning) this.notify(this.store.warning);
      return;
    }
    const step = target.closest<HTMLButtonElement>('[data-page-step]');
    if (step && !step.disabled && (this.route.page === 'home' || this.route.page === 'favorites')) {
      this.turnPage(this.listPages[this.route.page] + Number(step.dataset.pageStep), `[data-page-step="${step.dataset.pageStep}"]`);
      return;
    }
    const favorite = target.closest<HTMLElement>('[data-favorite]');
    if (favorite) {
      event.preventDefault();
      const id = favorite.dataset.favorite!;
      const active = this.store.toggle(id);
      this.render();
      const focus = this.root.querySelector<HTMLElement>(`[data-favorite="${id}"]`) ?? this.root.querySelector<HTMLElement>('.cancel-favorite, .empty-state a, #main');
      focus?.focus({ preventScroll: true });
      this.notify(`${active ? '已收藏' : '已取消收藏'}《${findPoem(id)!.title}》${this.store.warning ? '；仅在本次会话保留' : ''}`);
      return;
    }
    if (target.closest('[data-edit-profile]')) {
      openProfileEditor(this.store, () => { this.render(); this.root.querySelector<HTMLElement>('[data-edit-profile]')?.focus(); this.notify(this.store.warning || '资料已保存到当前浏览器'); });
    }
    const back = target.closest('[data-back]');
    if (back && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
      location.hash = this.route.page === 'poem' || this.previous === this.route.path ? '/' : this.previous;
    }
    if (target.closest('[data-notes]')) {
      const panel = this.root.querySelector<HTMLElement>('#poem-notes')!;
      panel.hidden = !panel.hidden;
      const toggle = this.root.querySelector<HTMLElement>('.poem-toolbar [data-notes]')!;
      toggle.setAttribute('aria-expanded', String(!panel.hidden));
      (panel.hidden ? toggle : panel.querySelector<HTMLElement>('button'))?.focus();
    }
    if (target.closest('[data-fullscreen]')) {
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => this.notify('无法退出全屏'));
      else void this.root.querySelector<HTMLElement>('.poem-page')!.requestFullscreen().catch(() => this.notify('当前浏览器无法进入全屏'));
    }
    const password = target.closest<HTMLButtonElement>('[data-password]');
    if (password) {
      const input = this.root.querySelector<HTMLInputElement>(`[name="${password.dataset.password}"]`)!;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      password.querySelector('.sr-only')!.textContent = show ? '隐藏' : '显示';
      password.setAttribute('aria-pressed', String(show));
      password.setAttribute('aria-label', `${show ? '隐藏' : '显示'}${password.dataset.password === 'confirmation' ? '确认密码' : '密码'}`);
    }
    if (target.closest('[data-auth-info]')) this.notify('密码找回尚未开放，请保管好你的测试账号密码。');
    if (target.closest('[data-auth-policy]')) openAuthPolicy();
    const curtain = target.closest<HTMLAnchorElement>('[data-curtain]');
    if (curtain && !event.ctrlKey && !event.metaKey && !event.shiftKey && event.button === 0) {
      event.preventDefault();
      if (this.revealing) return;
      const sourceCopy = this.root.querySelector('.entry-copy')!.outerHTML;
      const sourcePath = this.route.path;
      this.revealing = true;
      this.previous = this.route.path;
      this.route = parseRoute(curtain.hash);
      const targetPath = this.route.path;
      history.pushState(null, '', curtain.hash);
      this.render();
      void this.reveal.play(this.root, this.motion.matches || !this.store.data.preferences.motion, this.artworkReady, sourceCopy).then((result) => {
        if (result === 'failed' && this.route.path === targetPath) {
          history.replaceState(null, '', '#' + sourcePath);
          this.route = parseRoute('#' + sourcePath);
          this.render();
          this.notify('目标画面加载失败，请重新选择登录或注册以重试。');
        }
      }).finally(() => {
        this.revealing = false;
        this.root.querySelector<HTMLElement>('[name=username]')?.focus({ preventScroll: true });
      });
    }
    if (target.closest('.skip-link')) { event.preventDefault(); this.root.querySelector<HTMLElement>('#main')?.focus(); }
  };
  private onChange = (event: Event): void => {
    const input = event.target as HTMLInputElement;
    if (this.route.page === 'login' && input.matches('[name=remember], [name=username]')) {
      this.saveLoginMemory(input.closest<HTMLFormElement>('form')!);
    }
    if (input.matches('[name=birthday]')) input.dataset.empty = String(!input.value);
    if (input.matches('[data-list-page]')) { this.jumpPage(input, false); return; }
    const key = input.dataset.preference;
    if (key === 'dark' || key === 'motion') {
      this.store.data.preferences[key] = input.checked;
      this.store.save(); this.onVisibility();
      document.body.classList.toggle('dark', this.store.data.preferences.dark);
      this.notify(this.store.warning || '偏好已保存');
    }
  };
  private saveLoginMemory(form: HTMLFormElement): void {
    const username = form.querySelector<HTMLInputElement>('[name=username]')!.value;
    const remember = form.querySelector<HTMLInputElement>('[name=remember]')!.checked;
    if (!this.loginMemory.update(username, remember)) this.notify('浏览器无法保存“记住我”设置，请检查存储权限。');
  }
  private onSubmit = (event: SubmitEvent): void => {
    const form = event.target as HTMLFormElement;
    if (form.matches('[data-page-jump]')) {
      event.preventDefault();
      this.jumpPage(form.querySelector<HTMLInputElement>('[data-list-page]')!);
      return;
    }
    if (!form.matches('[data-account-form]')) return;
    event.preventDefault();
    const data = new FormData(form);
    const feedback = form.querySelector<HTMLElement>('.form-feedback')!;
    if (this.route.page === 'login') this.saveLoginMemory(form);
    if (this.route.page === 'register') {
      if (!/^[\p{L}\p{N}_]{4,16}$/u.test(String(data.get('username') ?? ''))) { feedback.textContent = '用户名需为4–16位中文、英文、数字或下划线'; return; }
      const password = String(data.get('password') ?? '');
      const types = [/[A-Za-z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((type) => type.test(password)).length;
      if (password.length < 8 || password.length > 20 || types < 2) { feedback.textContent = '密码需为8–20位，至少包含字母、数字和特殊字符中的两种'; return; }
      if (data.get('password') !== data.get('confirmation')) { feedback.textContent = '两次输入的密码不一致'; return; }
    }
    void this.submitAccount(form, data, feedback);
  };
  private async submitAccount(form: HTMLFormElement, data: FormData, feedback: HTMLElement): Promise<void> {
    if (form.dataset.busy === 'true') return;
    const register = this.route.page === 'register';
    const username = String(data.get('username') ?? '').trim();
    const submit = form.querySelector<HTMLButtonElement>('[type=submit]')!;
    form.dataset.busy = 'true'; form.setAttribute('aria-busy', 'true'); submit.disabled = true;
    feedback.textContent = register ? '正在创建账号…' : '正在登录…';
    try {
      if (register) {
        const user = await this.auth.register({ username, password: String(data.get('password') ?? ''),
          birthday: data.get('birthday') ? String(data.get('birthday')) : null,
          gender: String(data.get('gender') ?? ''), agreement: data.get('agreement') === 'on', agreementVersion: AGREEMENT_VERSION });
        if (this.disposed || !form.isConnected) return;
        location.hash = '/login'; this.onRoute();
        this.root.querySelector<HTMLInputElement>('[name=username]')!.value = user.username;
        this.root.querySelector<HTMLElement>('.form-feedback')!.textContent = '注册成功，请使用新账号登录。';
      } else {
        await this.auth.login(username, String(data.get('password') ?? ''), data.get('remember') === 'on');
        if (this.disposed) return;
        if (form.isConnected) { location.hash = '/profile'; this.onRoute(); this.notify('欢迎回到诗境'); }
        else this.render();
      }
    } catch (error) {
      if (!this.disposed && form.isConnected) feedback.textContent = error instanceof Error ? error.message : '提交失败，请重试';
    } finally {
      form.querySelectorAll<HTMLInputElement>('[name=password], [name=confirmation]').forEach((input) => { input.value = ''; });
      form.dataset.busy = 'false'; form.removeAttribute('aria-busy'); submit.disabled = false;
    }
  }
}
