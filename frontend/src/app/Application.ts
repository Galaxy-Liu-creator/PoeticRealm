import { parseRoute, type Route } from './Router';
import { findPoem } from '../content/catalog';
import { LibraryStore, normalizeLibrary, STORE_KEY, type LibraryData } from '../stores/LibraryStore';
import { LoginMemory } from '../stores/LoginMemory';
import { AuthStore } from '../stores/AuthStore';
import { AGREEMENT_VERSION } from '../api/auth';
import { AUTH_EXPIRED, tabSession } from '../api/TabSession';
import { AccountApi } from '../api/account';
import { AudioPreferences } from '../systems/AudioPreferences';
import { openAuthPolicy } from '../ui/components/AuthPolicy';
import { navigation } from '../ui/components/Navigation';
import { artwork } from '../ui/components/artwork';
import { homePage } from '../ui/pages/Home';
import { favoritesPage } from '../ui/pages/Favorites';
import { profilePage } from '../ui/pages/Profile';
import { poemPage } from '../ui/pages/Poem';
import { accountPage, entryPage } from '../ui/pages/Account';
import { mountProfileEditor, type ProfileEditorController } from '../ui/components/ProfileEditor';
import { publicProfilePage, mountPublicProfile } from '../ui/pages/PublicProfile';
import { openProfileSearch } from '../ui/components/ProfileSearch';
import { CurtainReveal } from '../transition/CurtainReveal';
import { curtainPanels } from '../transition/CurtainDrape';
import { listPageSize } from '../ui/components/Pagination';
import { MotionLoop } from '../systems/motion/MotionLoop';
import { OverviewMotion } from '../systems/motion/OverviewMotion';
import { RealmReveal, type RealmId } from '../transition/RealmReveal';
import { PageReturn } from '../transition/PageReturn';
import {isLivePoem,preparePoemScene,type LivePoemScene} from '../scenes/preparePoemScene';
import { AudioEngine } from '../systems/audio/AudioEngine';
import {PoemReveal} from '../ui/PoemReveal';
import {paperNotice} from '../ui/components/PaperPopup';
import '../ui/styles/application.css';
import '../ui/styles/account.css';
import '../ui/styles/typography.css';
import '../ui/styles/motion.css';
import '../ui/styles/profile-editor.css';
import '../ui/styles/fengqiao-scene.css';
import '../ui/styles/paper-popup.css';
import '../ui/styles/poem-scroll.css';

export class Application {
  private store = new LibraryStore();
  private loginMemory = new LoginMemory();
  private auth = new AuthStore();
  private accountApi = new AccountApi();
  private audio = new AudioPreferences();
  private hydration: Promise<void> = Promise.resolve();
  private syncing: Promise<void> = Promise.resolve();
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
  private pageReturn = new PageReturn(this.motionLoop);
  private heartbeat?: number;
  private liveScene?: LivePoemScene;
  private sceneLoading?: AbortController;
  private sceneStarted = false;
  private poemReveal?: PoemReveal;
  private stopReading?: () => void;
  private readingPath = '';
  private readingStart = 0;
  private profileEditor?: ProfileEditorController;
  private editorPreferences?: LibraryData['preferences'];
  private get preferences(): LibraryData['preferences'] { return this.editorPreferences ?? this.store.data.preferences; }
  constructor(private root: HTMLElement) {}
  start(): void {
    // Each document opens on the closed curtain; form navigation stays in this document.
    this.route = parseRoute('#/account');
    history.replaceState(null, '', '#/account');
    document.documentElement.style.setProperty('--paper-art', `url('${artwork.paper}')`);
    this.root.addEventListener('click', this.onClick);
    this.root.addEventListener('pointerdown', this.onSceneInteract);
    this.root.addEventListener('wheel', this.onSceneInteract, {passive:true});
    this.root.addEventListener('input', this.onLoginInput);
    this.root.addEventListener('change', this.onChange);
    this.root.addEventListener('submit', this.onSubmit);
    window.addEventListener('hashchange', this.onRoute);
    window.addEventListener('storage', this.onStorage);
    window.addEventListener('resize', this.onResize);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.motion.addEventListener('change', this.onVisibility);
    this.guardRoute();
    this.render();
    // Separate from the preserved P0 __POETIC__ API; no query params steal UI routes.
    Object.assign(window, { __POETIC_MOTION__: {
      pause: () => this.motionLoop.pause(), play: () => this.motionLoop.play(),
      seek: (t: number) => this.motionLoop.seek(t), transition: (p: number) => this.realmReveal.seek(p),
      return: (p: number) => this.pageReturn.seek(p),
      cancel: () => { this.realmReveal.cancel(); this.pageReturn.cancel(); },
    } });
    this.auth.onChange = this.onIdentity;
    void this.auth.restore();
    window.addEventListener('focus', this.onFocus);
    window.addEventListener('pageshow', this.onPageShow);
    window.addEventListener(AUTH_EXPIRED, this.onExpired);
    this.heartbeat = window.setInterval(() => { if (this.auth.user && !document.hidden) void this.auth.restore(); }, 60_000);
    window.addEventListener('pagehide', (event) => {
      tabSession.release();
      if (event.persisted) return;
      this.disposed = true; this.auth.onChange = undefined;
      this.profileEditor?.dispose();
      this.observer?.disconnect(); this.reveal.cancel(); clearTimeout(this.noticeTimer);
      this.realmReveal.cancel(); this.pageReturn.cancel(); this.overviewMotion?.dispose(); this.motionLoop.dispose();
      this.audio.dispose();
      this.stopReading?.();this.sceneLoading?.abort();this.liveScene?.dispose();
      this.root.removeEventListener('pointerdown',this.onSceneInteract);
      this.root.removeEventListener('wheel',this.onSceneInteract);
      clearInterval(this.heartbeat); window.removeEventListener(AUTH_EXPIRED, this.onExpired);
      window.removeEventListener('hashchange', this.onRoute);
      window.removeEventListener('storage', this.onStorage);
      window.removeEventListener('resize', this.onResize);
      window.removeEventListener('focus', this.onFocus);
      window.removeEventListener('pageshow', this.onPageShow);
      document.removeEventListener('visibilitychange', this.onVisibility);
      this.motion.removeEventListener('change', this.onVisibility);
    });
  }
  private onExpired = (): void => { this.auth.expire(); };
  private onPageShow = (event: PageTransitionEvent): void => { if (event.persisted) void this.auth.restore(); };
  private guardRoute(): void {
    if (location.hash === '#/profile/edit') history.replaceState(null, '', '#/profile');
    if (!this.auth.user && !['account', 'login', 'register'].includes(this.route.page) && (!tabSession.current || this.auth.ready)) {
      this.route = parseRoute('#/account'); history.replaceState(null, '', '#/account');
    }
  }
  private onFocus = (): void => { void this.auth.restore(); };
  private onIdentity = (): void => {
    const user = this.auth.user;
    this.root.dataset.auth = user ? 'authenticated' : this.auth.available ? 'guest' : 'unavailable';
    const key = user ? STORE_KEY + '.account.' + user.id : STORE_KEY;
    const changed = key !== this.store.key;
    if (changed) {
      this.profileEditor?.dispose(); this.profileEditor = undefined;
      this.store = new LibraryStore(undefined, key, user ? { name: user.username, gender: user.gender, birthday: user.birthday || '' } : undefined);
      this.listPages.favorites = 1;
      this.hydration = user ? this.hydrateLibrary(this.store) : Promise.resolve();
    }
    const visited = this.pendingVisits.length > 0;
    this.pendingVisits.splice(0).forEach((id) => this.store.visit(id));
    const before = this.route.path; this.guardRoute();
    const initial = this.root.dataset.initialized !== 'true'; this.root.dataset.initialized = 'true';
    if (initial || before !== this.route.path || ((changed || visited) && !['login', 'register'].includes(this.route.page))) {
      if (initial && this.route.page === 'poem') this.recordVisit(this.route.id);
      this.render();
    }
  };
  private async hydrateLibrary(store: LibraryStore): Promise<void> {
    const revision = store.revision;
    const before = structuredClone(store.data);
    try {
      const result = await this.accountApi.settings();
      if (this.disposed || this.store !== store) return;
      if (result.library) {
        const remote = normalizeLibrary(result.library), changed = store.revision !== revision;
        if (changed) {
          const local = store.data;
          remote.favorites = [...new Set([...remote.favorites.filter(id => !(before.favorites.includes(id) && !local.favorites.includes(id))), ...local.favorites.filter(id => !before.favorites.includes(id))])];
          remote.visits = [...local.visits.filter(visit => !before.visits.some(old => old.id === visit.id && old.at === visit.at)), ...remote.visits].slice(0,50);
          for (const key of ['profile','preferences','privacy'] as const) if (JSON.stringify(local[key]) !== JSON.stringify(before[key])) Object.assign(remote, { [key]: local[key] });
          if (!remote.privacy.saveHistory) remote.visits = [];
        }
        store.data = remote; store.save();
        if (changed) await this.accountApi.save(store.data);
        if (!document.querySelector('.profile-editor') && !['login', 'register'].includes(this.route.page)) this.render();
      } else await this.accountApi.save(store.data);
    } catch (error) { if (!this.disposed && this.store === store && this.auth.user) this.notify(error instanceof Error ? error.message : '账号资料同步失败'); }
  }
  private syncLibrary(): void {
    const store = this.store;
    if (!this.auth.user) return;
    this.syncing = this.syncing.then(async () => {
      await this.hydration;
      if (this.store === store && !this.disposed && this.auth.user) await this.accountApi.save(structuredClone(store.data));
    }).catch(error => { if (this.store === store && !this.disposed) this.notify(error instanceof Error ? error.message : '账号资料同步失败'); });
  }
  private recordVisit(id: string): void {
    if (!this.auth.ready) this.pendingVisits.push(id);
    else { this.store.visit(id); this.syncLibrary(); }
  }
  private onStorage = (event: StorageEvent): void => {
    if (event.key !== this.store.key) return;
    try { this.store.data = normalizeLibrary(event.newValue ? JSON.parse(event.newValue) : null); if (!this.profileEditor) this.render(); }
    catch { this.notify('另一窗口的本机资料无法读取。'); }
  };
  private onResize = (): void => {
    this.fitScene();
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
    document.body.classList.toggle('no-motion', this.motion.matches || !this.preferences.motion);
    document.body.classList.toggle('page-hidden', document.hidden);
    if ((this.motion.matches || !this.preferences.motion) && this.revealing) this.reveal.cancel();
    this.reveal.setHidden(document.hidden);
    this.overviewMotion?.setEnabled(!this.motion.matches && this.preferences.motion);
    this.realmReveal.setReduced(this.motion.matches || !this.preferences.motion || !this.preferences.transitions);
    this.pageReturn.setReduced(this.motion.matches || !this.preferences.motion || !this.preferences.transitions);
    this.liveScene?.api.setReduced(this.motion.matches || !this.preferences.motion);
    this.liveScene?.audio?.setHidden(document.hidden);
    this.poemReveal?.setReduced(this.motion.matches || !this.preferences.motion);
  };
  private onRoute = (): void => {
    if (location.hash === '#/profile/edit') history.replaceState(null, '', '#/profile');
    const next = parseRoute(location.hash);
    this.realmReveal.cancel();
    if (this.pageReturn.active) this.pageReturn.cancel();
    if (next.path === this.route.path) return;
    if (this.profileEditor) {
      const editor = this.profileEditor;
      void editor.confirmLeave().then(accepted => {
        if (this.profileEditor !== editor || parseRoute(location.hash).path !== next.path) return;
        if (accepted) this.commitRoute(next);
        else history.replaceState(null, '', '#' + this.route.path);
      });
      return;
    }
    if (this.auth.user && this.route.page === 'poem' && next.page === 'home') { this.returnToOverview(false); return; }
    this.commitRoute(next);
  };
  private commitRoute(next: Route): void {
    if (this.route.page === 'home') this.homeScroll = scrollY;
    this.previous = this.route.path;
    if (this.route.page === 'poem') this.homePoem = this.route.id;
    if (this.revealing) this.reveal.cancel();
    this.route = next;
    this.guardRoute(); next = this.route;
    if (next.page === 'poem') this.recordVisit(next.id);
    this.render();
    window.scrollTo(0, next.page === 'home' ? this.homeScroll : 0);
    const focus = next.page === 'home' && this.homePoem
      ? this.root.querySelector<HTMLElement>(`[data-poem="${this.homePoem}"] .enter-button`)
      : this.root.querySelector<HTMLElement>('#main');
    focus?.focus({ preventScroll: true });
  }
  private returnToOverview(push: boolean): void {
    if (this.pageReturn.active) return;
    const sourcePath = this.route.path;
    const destination = parseRoute('#/');
    const markup = navigation(destination) + homePage(this.store, this.listPages.home, this.pageSize);
    let frozen: ReturnType<LivePoemScene['freeze']> | undefined;
    try {frozen=this.liveScene?.freeze();}catch{this.notify('当前画面捕获失败，请重试。');return;}
    void this.pageReturn.play(this.root, markup, this.homeScroll, this.motion.matches || !this.store.data.preferences.motion || !this.store.data.preferences.transitions,frozen?.frame).then(complete => {
      if (this.disposed || this.route.path !== sourcePath) return;
      if (complete) {
        if (push) history.pushState(null, '', '#/');
        this.commitRoute(destination);
      } else if (!push && parseRoute(location.hash).page === 'home') this.commitRoute(destination);
      else frozen?.resume();
    });
  }
  private render(): void {
    this.profileEditor?.dispose(); this.profileEditor = undefined; this.editorPreferences = undefined;
    document.querySelectorAll<HTMLDialogElement>('.profile-search-dialog').forEach(dialog => dialog.close());
    const scrollState=this.route.page==='poem'&&this.readingPath===this.route.path?this.poemReveal?.scroll?.snapshot():undefined;
    this.guardRoute();
    this.realmReveal.cancel();
    this.pageReturn.cancel();
    this.overviewMotion?.dispose(); this.overviewMotion = undefined;
    this.observer?.disconnect();
    this.stopReading?.();this.stopReading=undefined;this.poemReveal=undefined;
    clearTimeout(this.noticeTimer);
    const route = this.route;
    this.sceneLoading?.abort();this.sceneLoading=undefined;
    const liveId=route.page==='poem'&&isLivePoem(route.id)&&this.auth.user?route.id:undefined;
    const live=!!liveId;
    if(this.liveScene && this.liveScene.id!==liveId){this.liveScene.dispose();this.liveScene=undefined;this.sceneStarted=false;Object.assign(window,{__POETIC_SCENE__:undefined});}
    if(this.liveScene)this.liveScene.canvas.remove();
    if(live)this.liveScene?.audio?.setMuted(!this.store.data.preferences.sound);
    document.body.dataset.page = route.page;
    document.body.classList.toggle('dark', this.store.data.preferences.dark || this.store.data.preferences.theme === 'night');
    document.body.dataset.fontSize = this.store.data.preferences.fontSize;
    this.audio.update(this.store.data.preferences, !!this.auth.user && !live);
    this.onVisibility();
    if (!this.auth.ready && tabSession.current && this.route.page !== 'account') {
      this.root.innerHTML = '<main class="empty-state page-width" role="status">正在验证本次登录…</main>'; return;
    }
    let content: string;
    switch (route.page) {
      case 'home': content = homePage(this.store, this.listPages.home, this.pageSize); break;
      case 'favorites': content = favoritesPage(this.store, this.listPages.favorites, this.pageSize); break;
      case 'profile': content = profilePage(); break;
      case 'public-profile': content = publicProfilePage(); break;
      case 'poem': content = poemPage(findPoem(route.id)!, this.store); break;
      case 'account': content = entryPage(); break;
      case 'login': case 'register': content = accountPage(route.page === 'register', this.store.data.preferences.dark); break;
      default: content = '<main id="main" class="empty-state page-width" tabindex="-1"><h1>未找到这页诗境</h1><p>这首诗或页面暂未收录。</p><a class="enter-button" href="#/">返回诗词总览 →</a></main>';
    }
    this.root.innerHTML = `<a class="skip-link" href="#main">跳至正文</a>${['account', 'login', 'register'].includes(route.page) ? '' : navigation(route)}${content}<div class="notifications"><div class="storage-warning paper-popup" role="status" ${this.store.warning ? '' : 'hidden'}>${paperNotice(this.store.warning)}</div><div class="toast paper-popup" role="status" aria-live="polite" hidden>${paperNotice('')}</div></div>`;
    if (route.page === 'profile' && this.auth.user) {
      const host = this.root.querySelector<HTMLElement>('.profile-editor')!, store = this.store, user = this.auth.user;
      void Promise.all([this.hydration, this.syncing]).then(() => {
        if (!host.isConnected || this.disposed || this.store !== store) return;
        this.profileEditor = mountProfileEditor(host, store, user, () => {
          this.editorPreferences = undefined;
          this.notify('资料与设置已保存');
        }, message => this.notify(message), preferences => {
          this.editorPreferences = preferences;
          document.body.classList.toggle('dark', preferences.dark || preferences.theme === 'night');
          document.body.dataset.fontSize = preferences.fontSize;
          this.audio.update(preferences, true); this.onVisibility();
        });
      });
    }
    if (route.page === 'public-profile') mountPublicProfile(this.root.querySelector('[data-public-profile]')!, route.username);
    this.fitScene();
    if (this.store.warning) this.scheduleNoticeDismissal();
    if(route.page==='poem'){
      if(this.readingPath!==route.path){this.readingStart=this.motionLoop.clock.time;this.readingPath=route.path;}
      this.poemReveal=new PoemReveal(this.root,scrollState);
      this.poemReveal.setReduced(this.motion.matches || !this.store.data.preferences.motion);
      if(!live){
        const reveal=this.poemReveal;
        const sample=(t:number):void=>reveal.seek(t-this.readingStart);
        sample(this.motionLoop.clock.time);
        this.stopReading=this.motionLoop.subscribe(()=>!this.motion.matches&&this.store.data.preferences.motion&&this.motionLoop.clock.time-this.readingStart<reveal.duration,sample);
      }
    }else this.readingPath='';
    if(live){if(this.liveScene)this.attachPoemScene();else void this.loadPoemScene();}
    if (route.page === 'login') {
      const remembered = this.loginMemory.read();
      this.root.querySelector<HTMLInputElement>('[name=remember]')!.checked = Boolean(remembered);
      this.root.querySelector<HTMLInputElement>('[name=username]')!.value = remembered?.username ?? '';
      if (this.auth.ready) void this.fillRememberedLogin(this.root.querySelector<HTMLFormElement>('[data-account-form]')!);
    }
    if (route.page === 'home' || route.page === 'favorites') {
      this.listPages[route.page] = Number(this.root.querySelector<HTMLInputElement>('[data-list-page]')?.value || 1);
    }
    document.title = `${route.page === 'poem' ? findPoem(route.id)!.title : route.page === 'public-profile' ? '诗友主页' : ({ home: '诗词总览', favorites: '我的收藏', profile: '个人中心', account: '循诗入境', login: '欢迎回境', register: '创建账号', missing: '未找到页面' })[route.page]} · 诗境`;
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
  private fitScene(target=this.root): void {
    const header=target.querySelector('.navigation');
    const style=document.documentElement.style;
    if(!header){
      for(const name of ['--notice-left','--notice-width','--notice-header-height'])style.removeProperty(name);
      return;
    }
    const height=header.getBoundingClientRect().height;
    target.style.setProperty('--scene-header-height',height+'px');
    const reading=target.querySelector<HTMLElement>('.poem-reading');
    const fullscreen=target.querySelector<HTMLElement>('[data-fullscreen]');
    if(reading&&fullscreen){
      // The scroll shares the toolbar's right edge across window and text sizes.
      const scrollWidth=Math.max(0,fullscreen.getBoundingClientRect().right-reading.getBoundingClientRect().left);
      reading.style.setProperty('--poem-scroll-max-width',scrollWidth+'px');
    }
    const brand=header.querySelector('.brand-group')!.getBoundingClientRect();
    const links=header.querySelector('nav')!.getBoundingClientRect();
    // Reserve the actual free space between brand and links, including cloud ornaments.
    const left=brand.right+32,width=Math.max(0,links.left-32-left);
    style.setProperty('--notice-left',left+'px');
    style.setProperty('--notice-width',width+'px');
    style.setProperty('--notice-header-height',height+'px');
  }
  private attachPoemScene(): void {
    const scene=this.liveScene;if(!scene)return;
    const canvas=this.root.querySelector('[data-scene-canvas]');if(canvas!==scene.canvas)canvas?.replaceWith(scene.canvas);
    this.root.querySelector<HTMLElement>('.poem-scene-status')!.textContent='';
    this.root.querySelector<HTMLButtonElement>('[data-scene-retry]')!.hidden=true;
    this.poemReveal?.seek(scene.engine.clock.time);
    this.stopReading=scene.engine.onUpdate(t=>this.poemReveal?.seek(t));
    if(!this.sceneStarted){scene.enter();this.sceneStarted=true;}
    this.root.querySelector<HTMLButtonElement>('[data-scene-pause]')!.textContent=scene.engine.clock.playing?'暂停':'播放';
    this.root.querySelector<HTMLButtonElement>('[data-scene-sound]')!.textContent=scene.audio?.details().state==='running'&&!scene.audio.details().muted?'静音':'开启声音';
    Object.assign(window,{__POETIC_SCENE__:{...scene.api,ready:true,id:scene.id,seek:(t:number)=>scene.engine.seek(t),pause:()=>scene.engine.clock.pause(),play:()=>scene.engine.clock.play(),state:()=>({t:scene.engine.clock.time,playing:scene.engine.clock.playing,...scene.engine.stats})}});
  }
  private async loadPoemScene(): Promise<void> {
    this.sceneLoading?.abort();const controller=this.sceneLoading=new AbortController();
    let canvas=this.root.querySelector<HTMLCanvasElement>('[data-scene-canvas]');if(!canvas)return;
    if(canvas.dataset.failed==='true'){const replacement=canvas.cloneNode(false) as HTMLCanvasElement;delete replacement.dataset.failed;canvas.replaceWith(replacement);canvas=replacement;}
    const id=this.route.page==='poem'&&isLivePoem(this.route.id)?this.route.id:undefined;if(!id)return;
    const audio=new AudioEngine(id);audio.setMuted(!this.store.data.preferences.sound);
    const status=this.root.querySelector<HTMLElement>('.poem-scene-status')!;status.innerHTML=paperNotice('正在展开诗境…','',true);
    try {
      const scene=await preparePoemScene(id,canvas,{signal:controller.signal,reduced:this.motion.matches||!this.store.data.preferences.motion,audio});
      if(controller.signal.aborted||!canvas.isConnected){scene.dispose();return;}
      this.liveScene=scene;this.sceneStarted=false;this.attachPoemScene();
    } catch(error) {
      audio.dispose();if(controller.signal.aborted||!status.isConnected)return;
      canvas.dataset.failed='true';
      status.innerHTML=paperNotice('诗境加载失败，请重试。');this.root.querySelector<HTMLButtonElement>('[data-scene-retry]')!.hidden=false;
    }
  }
  private async fillRememberedLogin(form: HTMLFormElement): Promise<void> {
    try {
      const saved = await this.auth.remembered();
      if (!form.isConnected || form.dataset.passwordMode === 'true' || !saved.remembered || !saved.username) return;
      form.dataset.remembered = 'true';
      const username = form.querySelector<HTMLInputElement>('[name=username]')!;
      username.value = saved.username; username.readOnly = false;
      const password = form.querySelector<HTMLInputElement>('[name=password]')!;
      password.value = ''; password.required = false; password.readOnly = false; password.placeholder = '••••••••';
      form.querySelector<HTMLInputElement>('[name=remember]')!.checked = true;
      form.querySelector<HTMLButtonElement>('[data-password]')!.disabled = true;
    } catch { /* Normal password login remains available if the hint service is offline. */ }
  }
  private notify(message: string): void {
    const toast = this.root.querySelector<HTMLElement>('.toast');
    if (toast) {
      toast.querySelector('[data-popup-message]')!.textContent = message; toast.hidden = false;
    }
    const warning = this.root.querySelector<HTMLElement>('.storage-warning');
    if (warning) { warning.querySelector('[data-popup-message]')!.textContent = this.store.warning; warning.hidden = !this.store.warning; }
    this.scheduleNoticeDismissal();
  }
  private scheduleNoticeDismissal(): void {
    clearTimeout(this.noticeTimer);
    this.noticeTimer=window.setTimeout(()=>{
      this.root.querySelectorAll<HTMLElement>('.notifications>.paper-popup').forEach(notice=>notice.hidden=true);
    },1500);
  }
  private onSceneInteract = (event: Event): void => {
    if((event.target as Element).matches('[data-scene-canvas]'))this.poemReveal?.scroll?.shelve();
  };
  private onClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement;
    if(target.closest('[data-scroll-toggle]')){
      if(this.poemReveal?.scroll?.toggle())this.liveScene?.api.setView('CAM_enter');
      return;
    }
    const view=target.closest<HTMLElement>('[data-scene-view]');
    if(view&&this.liveScene){this.liveScene.api.setView(view.dataset.sceneView!);this.poemReveal?.scroll?.setView(view.dataset.sceneView!);return;}
    if(target.closest('[data-scene-replay]')&&this.liveScene){const scene=this.liveScene;this.poemReveal?.scroll?.reset();scene.engine.clock.pause();scene.engine.seek(0);scene.api.setView('CAM_enter');if(!this.motion.matches&&this.store.data.preferences.motion)scene.engine.clock.play();this.root.querySelector<HTMLButtonElement>('[data-scene-pause]')!.textContent=scene.engine.clock.playing?'暂停':'播放';return;}
    if(target.closest('[data-scene-pause]')&&this.liveScene){this.liveScene.engine.clock.toggle();target.closest('button')!.textContent=this.liveScene.engine.clock.playing?'暂停':'播放';return;}
    if(target.closest('[data-scene-sound]')&&this.liveScene?.audio){const audio=this.liveScene.audio;const mute=audio.details().state==='running'&&!audio.details().muted;audio.setMuted(mute);this.store.data.preferences.sound=!mute;this.store.save();this.syncLibrary();const button=target.closest('button')!;void audio.unlock().then(()=>{if(button.isConnected)button.textContent=audio.details().state==='running'&&!audio.details().muted?'静音':'开启声音';});return;}
    if(target.closest('[data-scene-retry]')){void this.loadPoemScene();return;}
    const home = target.closest<HTMLAnchorElement>('a[href="#/"]');
    if (this.route.page === 'poem' && (home || target.closest('[data-back]')) && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0) {
      event.preventDefault(); this.returnToOverview(true); return;
    }
    const entry = target.closest<HTMLAnchorElement>('a[href^="#/poems/"]');
    if (entry && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0) {
      const destination = parseRoute(entry.hash);
      if (destination.page === 'poem' && destination.path !== this.route.path) {
        event.preventDefault();
        if (this.realmReveal.active) return;
        const sourcePath=this.route.path;
        const poem=findPoem(destination.id)!;
        const markup=navigation(destination)+poemPage(poem,this.store);
        const sceneId=isLivePoem(destination.id)?destination.id:undefined;
        let prepared: LivePoemScene | undefined;
        let sound=sceneId?new AudioEngine(sceneId):undefined;
        sound?.setMuted(!this.store.data.preferences.sound);void sound?.unlock();
        let attempts=0;
        const prepareScene=async(target:HTMLElement,signal:AbortSignal)=>{
          this.fitScene(target);
          if(!sceneId)return;
          if(attempts++){prepared?.dispose();sound?.dispose();sound=new AudioEngine(sceneId);sound.setMuted(!this.store.data.preferences.sound);void sound.unlock();const old=target.querySelector<HTMLCanvasElement>('[data-scene-canvas]')!;old.replaceWith(old.cloneNode(false));}
          const scene=await preparePoemScene(sceneId,target.querySelector<HTMLCanvasElement>('[data-scene-canvas]')!,{signal,reduced:this.motion.matches||!this.store.data.preferences.motion,audio:sound!});
          if(signal.aborted){scene.dispose();throw new DOMException('入境取消','AbortError');}
          prepared=scene;target.querySelector<HTMLElement>('.poem-scene-status')!.textContent='';
        };
        this.overviewMotion?.setSuspended(true);
        void this.realmReveal.play(this.root,destination.id as RealmId,markup,artwork.scenes[destination.id]!,this.motion.matches || !this.store.data.preferences.motion || !this.store.data.preferences.transitions,prepareScene,sceneId==='baidicheng'?90000:sceneId?45000:10000).then(complete=>{
          if (complete && !this.disposed && this.route.path===sourcePath) {
            if(prepared){this.liveScene?.dispose();this.liveScene=prepared;this.sceneStarted=false;}
            history.pushState(null,'','#'+destination.path);this.onRoute();
          } else {prepared?.dispose();sound?.dispose();}
        }).finally(()=>{this.fitScene();this.overviewMotion?.setSuspended(false);});
        return;
      }
    }
    const logout = target.closest<HTMLButtonElement>('[data-logout]');
    if (logout && !logout.disabled) {
      logout.disabled = true;
      void (async () => {
        if (this.profileEditor && !await this.profileEditor.confirmLeave()) return;
        await this.auth.logout();
        if (!this.disposed) { this.render(); this.notify('已退出登录，请登录后继续'); }
      })().catch((error) => {
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
      this.syncLibrary();
      this.render();
      const focus = this.root.querySelector<HTMLElement>(`[data-favorite="${id}"]`) ?? this.root.querySelector<HTMLElement>('.cancel-favorite, .empty-state a, #main');
      focus?.focus({ preventScroll: true });
      this.notify(`${active ? '已收藏' : '已取消收藏'}《${findPoem(id)!.title}》${this.store.warning ? '；仅在本次会话保留' : ''}`);
      return;
    }
    if (target.closest('[data-profile-search]')) { openProfileSearch(); return; }
    const back = target.closest('[data-back]');
    if (back && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
      location.hash = this.route.page === 'poem' || this.previous === this.route.path ? '/' : this.previous;
    }
    if (target.closest('[data-notes]')) {
      const panel = this.root.querySelector<HTMLElement>('#poem-notes')!;
      panel.hidden = !panel.hidden;
      if(!panel.hidden)this.poemReveal?.scroll?.shelve();
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
        if(this.route.path===targetPath && !this.root.contains(document.activeElement))
          this.root.querySelector<HTMLElement>('[name=username]')?.focus({ preventScroll: true });
      });
    }
    if (target.closest('.skip-link')) { event.preventDefault(); this.root.querySelector<HTMLElement>('#main')?.focus(); }
  };
  private onLoginInput = (event: Event): void => {
    const input = event.target as HTMLInputElement;
    if (this.route.page !== 'login' || !input.matches('[name=username], [name=password]')) return;
    const form = input.closest<HTMLFormElement>('[data-account-form]');
    if (!form) return;
    delete form.dataset.remembered; form.dataset.passwordMode = 'true';
    const password = form.querySelector<HTMLInputElement>('[name=password]')!;
    password.required = true; password.placeholder = '请输入密码';
    form.querySelector<HTMLButtonElement>('[data-password]')!.disabled = false;
  };
  private onChange = (event: Event): void => {
    const input = event.target as HTMLInputElement;
    if (this.route.page === 'login' && input.matches('[name=remember], [name=username]')) {
      this.saveLoginMemory(input.closest<HTMLFormElement>('form')!);
    }
    if (input.matches('[name=birthday]')) input.dataset.empty = String(!input.value);
    if (input.matches('[data-list-page]')) { this.jumpPage(input, false); return; }
    const key = input.dataset.preference;
    if (key === 'dark' || key === 'motion' || key === 'recommend') {
      this.store.data.preferences[key] = input.checked;
      if (key === 'dark') this.store.data.preferences.theme = input.checked ? 'night' : 'ink';
      this.store.save(); this.syncLibrary(); this.onVisibility();
      document.body.classList.toggle('dark', this.store.data.preferences.dark || this.store.data.preferences.theme === 'night');
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
    feedback.textContent = register ? '正在创建账号…' : '';
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
        if (form.dataset.remembered === 'true') await this.auth.loginRemembered(data.get('remember') === 'on');
        else await this.auth.login(username, String(data.get('password') ?? ''), data.get('remember') === 'on');
        await this.hydration;
        if (this.disposed) return;
        if (form.isConnected) {
          if (['scene', 'debug', 't', 'q'].some(key => new URLSearchParams(location.search).has(key))) { location.reload(); return; }
          location.hash = ({ home: '/', favorites: '/favorites', profile: '/profile' })[this.store.data.preferences.startPage]; this.onRoute(); this.notify('欢迎回到诗境');
        }
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
