import { AccountApi, type Device } from '../../api/account';
import { AuthApi, type AuthUser } from '../../api/auth';
import { type LibraryStore } from '../../stores/LibraryStore';
import { LoginMemory } from '../../stores/LoginMemory';
import { escapeHTML as esc } from './html';
import { artwork } from './artwork';
import { profileIcon as icon } from './profileIcons';
import background from '../../assets/ui/profile-editor-background-v1.png';
import {confirmPaper,paperOrnaments} from './PaperPopup';
import type { LibraryData } from '../../stores/LibraryStore';
import { openProfileSearch } from './ProfileSearch';
import { profileOverview, profileFavorites, profileVisits } from './ProfileActivity';
import { findPoem } from '../../content/catalog';

const tabs = [
  ['overview', '我的诗境', 'home', '于山水诗境中，收藏你的足迹。'],
  ['favorites', '我的收藏', 'star', '一卷中烟霞，朝夕可对。'],
  ['visits', '阅读足迹', 'footprint', '重访来时山水，续读心中诗篇。'],
  ['basic', '个人资料', 'user', '完善你的身份信息，让山河记住你。'],
  ['security', '账号安全', 'shield', '保护账号安全，管理密码与登录状态。'],
  ['privacy', '隐私设置', 'eye', '管理公开范围、个人数据与隐私权限。'],
  ['preferences', '偏好设置', 'sliders', '自定义你的浏览体验与界面偏好。'],
] as const;
const options = (entries: string[][], value: string): string => entries.map(([key, label]) => `<option value="${key}" ${key === value ? 'selected' : ''}>${label}</option>`).join('');
const toggle = (name: string, value: boolean, words = false): string => `<label class="editor-switch ${words ? 'with-words' : ''}"><input type="checkbox" name="${name}" ${value ? 'checked' : ''} aria-label="${name}"><span class="switch-track"></span>${words ? '<span class="switch-word"></span>' : ''}</label>`;
const heading = (label: string): string => `<h3 class="editor-section-title">${label}</h3>`;
const row = (glyph: string, title: string, copy: string, control: string, extra = ''): string => `<div class="editor-setting-row ${extra}">${icon(glyph)}<div class="editor-setting-copy"><strong>${title}</strong><small>${copy}</small></div><div class="editor-setting-control">${control}</div></div>`;
const select = (name: string, entries: string[][], value: string): string => `<select name="${name}" aria-label="${name}">${options(entries, value)}</select>`;
const passwordFields = ['currentPassword', 'password', 'confirmation'] as const;

export interface ProfileEditorController { dispose(): void; confirmLeave(): Promise<boolean> }

export function mountProfileEditor(dialog: HTMLElement, store: LibraryStore, user: AuthUser, saved: () => void,
  notify: (message: string) => void, preview: (preferences: LibraryData['preferences']) => void): ProfileEditorController {
  const api = new AccountApi();
  const draft = structuredClone(store.data);
  const p = draft.preferences, privacy = draft.privacy, original = draft.profile;
  dialog.style.setProperty('--editor-art', `url("${background}")`);
  let avatar = original.avatar, bitmap: ImageBitmap | undefined;
  let selection = 0, closed = false, busy = false, uploading = false, remembered = false, rememberLoaded = false;
  let changingPassword = false;
  let devices: Device[] = [];
  const children = new Set<HTMLDialogElement>();
  dialog.innerHTML = `<div class="editor-shell">
    <aside class="editor-sidebar"><div class="editor-brand"><strong>诗境 · 一卷山河</strong></div>
      <div class="editor-identity"><div class="avatar" data-side-avatar style="${artwork.avatar}"></div><div><strong data-side-name>${esc(original.name)}</strong><small>诗境旅人 · 已登录</small></div></div>
      <nav class="editor-tabs" role="tablist" aria-label="个人中心栏目" aria-orientation="vertical">${tabs.map(([id, title, glyph], i) => `${i === 3 ? '<span class="editor-nav-divider" role="presentation"></span>' : ''}<button type="button" role="tab" id="editor-tab-${id}" aria-controls="editor-panel-${id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-tab="${id}">${icon(glyph)}<span>${title}</span>${icon('chevron')}</button>`).join('')}</nav>
      <div class="editor-sidebar-actions"><button type="button" data-find-profile>${icon('search')}查找诗友</button><button type="button" data-logout>${icon('logout')}退出登录</button></div>
      <div class="editor-sidebar-note"><p>循诗入境，展卷见山河</p><small>© 诗境·一卷山河</small></div>
    </aside>
    <form class="editor-main" novalidate><header class="editor-header"><div><h1 id="editor-title">个人中心</h1><p data-subtitle>${tabs[0][3]}</p></div><span class="editor-header-location" data-location>我的诗境</span></header>
    <div class="editor-body">
      ${['overview', 'favorites', 'visits'].map(id => `<section role="tabpanel" id="editor-panel-${id}" aria-labelledby="editor-tab-${id}" data-panel="${id}" ${id === 'overview' ? '' : 'hidden'}></section>`).join('')}
      <section role="tabpanel" id="editor-panel-basic" aria-labelledby="editor-tab-basic" data-panel="basic" hidden>
        ${heading('基本资料')}<div class="editor-avatar-row"><div class="editor-avatar"><div class="avatar" data-main-avatar style="${artwork.avatar}"></div><canvas width="256" height="256" hidden aria-label="头像裁切预览"></canvas></div><div class="editor-avatar-copy"><strong>个人头像</strong><p>支持 JPEG / PNG / WebP，最大 5 MiB。<br>上传后可裁剪为圆形头像。如不满意，也可以恢复系统默认头像。</p><div class="editor-avatar-actions"><label class="editor-button primary">${icon('upload')}上传新头像<input type="file" accept="image/jpeg,image/png,image/webp" aria-label="上传新头像"></label><button class="editor-button" type="button" data-reset>恢复默认</button></div><label class="editor-crop" hidden>头像缩放<input type="range" min="1" max="3" step=".05" value="1"></label></div></div>
        <div class="editor-fields"><label>昵称<div class="editor-nickname"><input name="name" value="${esc(original.name)}" maxlength="24" autocomplete="nickname" required><button type="button" data-clear-name aria-label="清空昵称">×</button></div></label><label><span class="editor-label-line">账号<small>用于登录</small></span><input value="${esc(user.username)}" readonly aria-label="登录账号"></label><label>性别${select('gender', [['', '未设置'], ['男', '男'], ['女', '女'], ['其他', '其他']], original.gender)}</label><label>生日<span class="editor-date"><input type="date" name="birthday" value="${esc(original.birthday || user.birthday || '')}" max="${new Date().toLocaleDateString('en-CA')}" aria-label="生日"><span data-date-display aria-hidden="true"></span><svg class="profile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="1"/><path d="M3 9h18M7 2v5m10-5v5M7 13h2m3 0h2m3 0h1M7 17h2m3 0h2"/></svg></span></label><label class="editor-bio">个人简介<textarea name="bio" maxlength="60">${esc(original.bio)}</textarea><small data-count></small></label></div>
        <div class="editor-basic-security">${heading('账号与安全')}<div class="editor-card-grid"><button type="button" class="editor-account-card" data-open-security><span class="editor-card-icon">${icon('lock')}</span><span><strong>修改密码</strong><small>建议定期更新，保护账号安全。</small></span>${icon('chevron')}</button><button type="button" class="editor-account-card" data-devices><span class="editor-card-icon">${icon('monitor')}</span><span><strong>登录状态管理</strong><small>管理当前账号的登录设备与状态。</small></span>${icon('chevron')}</button></div></div>
      </section>
      <section role="tabpanel" id="editor-panel-security" aria-labelledby="editor-tab-security" data-panel="security" hidden>
        <div class="editor-password-heading">${heading('登录密码')}<button type="button" class="editor-button" data-enable-password aria-expanded="false" aria-controls="editor-password-fields">修改密码</button><button type="button" class="editor-button" data-cancel-password hidden>取消修改密码</button></div><p class="editor-password-note" data-password-note>需要更新登录密码时，点击“修改密码”。</p><fieldset class="editor-passwords" id="editor-password-fields" disabled hidden>${[['currentPassword', '原密码', '请输入当前密码'], ['password', '新密码', '请输入新密码'], ['confirmation', '确认新密码', '请再次输入新密码']].map(([name, label, placeholder]) => `<div class="editor-password-row"><label for="editor-${name}">${label}</label><div><div class="editor-password-input"><input id="editor-${name}" name="${name}" type="password" maxlength="${name === 'currentPassword' ? 128 : 20}" autocomplete="${name === 'currentPassword' ? 'current-password' : 'new-password'}" placeholder="${placeholder}"><button type="button" data-reveal="${name}" aria-label="显示${label}">${icon('eye')}</button></div>${name === 'password' ? '<div class="editor-strength"><span></span><span></span><span></span><small>密码强度：<b data-strength>待输入</b></small></div><p class="editor-password-help">建议使用 8–20 位字符，包含字母、数字和特殊符号。</p>' : ''}</div></div>`).join('')}</fieldset>
        <div class="editor-login-section">${heading('登录与验证')}<div class="editor-card-grid login-cards">
          <div class="editor-account-card"><span class="editor-card-icon">${icon('sliders')}</span><span><strong>30 天内记住我</strong><small>在此设备上记住登录凭据，<br>下次打开仍需点击登录。</small></span>${toggle('remember', false)}</div>
          <button type="button" class="editor-account-card" data-devices><span class="editor-card-icon">${icon('monitor')}</span><span><strong>当前登录设备</strong><small data-device>正在读取…</small><small>位置未记录</small></span>${icon('chevron')}</button>
          <div class="editor-account-card"><span class="editor-card-icon">${icon('clock')}</span><span><strong>最近登录时间</strong><small data-login-time>正在读取…</small><small data-login-agent></small></span></div>
          <div class="editor-account-card"><span class="editor-card-icon">${icon('phone')}</span><span><strong>退出其他设备</strong><small>将其他已登录的设备全部退出，确保账号安全。</small></span><button type="button" class="editor-button compact" data-revoke>立即退出</button></div>
        </div></div>
      </section>
      <section role="tabpanel" id="editor-panel-privacy" aria-labelledby="editor-tab-privacy" data-panel="privacy" hidden>
        ${heading('公开范围')}<div class="editor-settings-box privacy-ranges">${[
          ['users', '个人主页可见范围', '设置其他用户能否查看你的个人主页。', 'profileVisibility'],
          ['star', '收藏可见范围', '设置其他用户能否查看你的收藏内容。', 'favoritesVisibility'],
          ['footprint', '足迹可见范围', '设置其他用户能否查看你的浏览足迹。', 'visitsVisibility'],
        ].map(([glyph, title, copy, key]) => row(glyph, title, copy, `<div class="editor-visibility-select">${icon(privacy[key as 'profileVisibility'] === 'everyone' ? 'globe' : 'lock')}${select(key, [['everyone', '所有人可见'], ['private', '仅自己可见']], privacy[key as 'profileVisibility'])}</div>`)).join('')}${row('search', '允许他人通过账号搜索我', '关闭后，其他用户将无法通过账号搜索到你。', toggle('searchable', privacy.searchable))}</div>
        <div class="editor-profile-links"><a href="#/profiles/${encodeURIComponent(user.username)}">查看已保存的主页 →</a><small data-privacy-state></small></div>
        <div class="editor-data-section">${heading('数据与隐私')}<div class="editor-settings-box privacy-data">${row('chart', '个性化推荐数据授权', '授权后，精选推荐会结合你的收藏与最近浏览调整顺序。', toggle('personalization', privacy.personalization))}${row('clock', '浏览记录保存', '开启后，将自动保存你的浏览记录，用于提供更好的浏览体验。', toggle('saveHistory', privacy.saveHistory))}${row('file', '数据导出', '导出已保存的个人资料、收藏与浏览记录。请先保存本页修改。', `<button type="button" data-export aria-label="导出个人数据">${icon('chevron')}</button>`)}${row('trash', '注销账号 / 清空历史', '永久注销账号或清空所有历史数据，此操作不可恢复。', `<button type="button" data-danger aria-label="注销账号或清空历史">${icon('chevron')}</button>`, 'editor-danger')}</div></div>
      </section>
      <section role="tabpanel" id="editor-panel-preferences" aria-labelledby="editor-tab-preferences" data-panel="preferences" hidden>
        ${heading('界面体验')}<div class="editor-settings-box editor-preferences-box">${[
          ['moon', '深色模式', '切换深色主题，获得更舒适的夜间阅读体验。', 'dark'],
          ['sparkle', '动态效果', '启用页面动态效果，提升交互体验的流畅感。', 'motion'],
          ['play', '水墨转场动画', '在页面切换时使用水墨风格的过渡动画。', 'transitions'],
          ['music', '背景音乐', '开启后将在浏览时自动播放古风背景音乐。', 'music'],
          ['volume', '音效', '开启后保留按钮点击、翻页等操作音效。', 'sound'],
        ].map(([glyph, title, copy, key]) => row(glyph, title, copy, toggle(key, p[key as 'dark'], true))).join('')}${row('text', '字号大小', '调整诗词正文与界面文字的显示大小。', `<div class="editor-segments">${[['small', '小'], ['normal', '标准'], ['large', '大']].map(([value, text]) => `<label><input type="radio" name="fontSize" value="${value}" ${p.fontSize === value ? 'checked' : ''}><span>${text}</span></label>`).join('')}</div>`)}</div>
        <div class="editor-content-section">${heading('内容偏好')}<div class="editor-settings-box editor-preferences-box content-preferences">${row('book', '精选诗词推荐', '根据你的兴趣，推荐可能感兴趣的诗词内容。', toggle('recommend', p.recommend, true))}${row('home', '默认进入页面', '设置登录后默认进入的页面。', select('startPage', [['home', '首页'], ['favorites', '我的收藏'], ['profile', '个人中心']], p.startPage))}${row('sort', '默认排序方式', '设置诗词列表的默认排序规则。', select('sort', [['default', '按收录顺序（默认）'], ['title', '按诗词名称'], ['recent', '按最近浏览']], p.sort))}${row('palette', '主题风格', '选择你喜欢的整体视觉风格。', select('theme', [['ink', '水墨雅致（默认）'], ['night', '夜读水墨']], p.theme))}</div></div>
      </section>
    </div><footer class="editor-footer"><p class="editor-feedback" role="status" aria-live="polite" tabindex="-1"></p><button type="button" class="editor-button" data-retry-settings hidden>重新读取</button><button type="button" class="editor-button" data-cancel>撤销修改</button><button type="submit" class="editor-button primary">保存修改</button></footer></form></div>`;
  const form = dialog.querySelector<HTMLFormElement>('.editor-main')!;
  const feedback = dialog.querySelector<HTMLElement>('.editor-feedback')!;
  const field = (name: string): HTMLInputElement => form.elements.namedItem(name) as HTMLInputElement;
  field('dark').checked = p.dark || p.theme === 'night';
  field('theme').value = field('dark').checked ? 'night' : 'ink';
  const recommendation = dialog.querySelector<HTMLElement>('[name=recommend]')!.closest('.editor-setting-row')!.querySelector('small')!;
  const reflectPermissions = (): void => {
    dialog.querySelector('[data-privacy-state]')!.textContent = field('profileVisibility').value === 'private'
      ? '当前主页仅自己可见。设为所有人可见并允许搜索后，诗友可通过账号找到你。'
      : field('searchable').checked ? '保存后，诗友可通过账号搜索你的公开主页。' : '保存后，诗友可通过主页链接访问；账号搜索已关闭。';
    recommendation.textContent = !field('recommend').checked ? '精选推荐已关闭，诗词按所选排序展示。'
      : !field('personalization').checked ? '需先在隐私设置中开启个性化推荐数据授权。'
      : field('sort').value !== 'default' ? '切换为按收录顺序后，将优先排列收藏与常读的诗词。' : '将结合收藏与最近浏览，为总览调整诗词展示顺序。';
  };
  reflectPermissions();
  const dateDisplay = (): void => { dialog.querySelector('[data-date-display]')!.textContent = field('birthday').value || '未设置'; };
  field('birthday').oninput = dateDisplay; dateDisplay();
  form.querySelectorAll<HTMLInputElement>('[type=checkbox]').forEach(input => {
    input.setAttribute('aria-label', input.closest('.editor-setting-row')?.querySelector('strong')?.textContent || '30 天内记住我');
  });
  form.querySelectorAll<HTMLSelectElement>('select').forEach(input => {
    const title = input.closest('.editor-setting-row')?.querySelector('strong')?.textContent;
    if (title) input.setAttribute('aria-label', title);
  });
  const selectTab = (id: string): void => {
    const tab = tabs.find(tab => tab[0] === id);
    if (!tab) return;
    dialog.dataset.tab = id;
    dialog.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(button => { const active = button.dataset.tab === id; button.setAttribute('aria-selected', String(active)); button.tabIndex = active ? 0 : -1; });
    dialog.querySelectorAll<HTMLElement>('[data-panel]').forEach(panel => { panel.hidden = panel.dataset.panel !== id; });
    dialog.querySelector('[data-subtitle]')!.textContent = tab[3];
    dialog.querySelector('[data-location]')!.textContent = tab[1];
    dialog.querySelector('#editor-title')!.textContent = id === 'overview' ? '个人中心' : tab[1];
    dialog.querySelector('.editor-body')!.scrollTop = 0;
    reflectActions();
  };
  const refreshActivity = (): void => {
    dialog.querySelector('[data-panel=overview]')!.innerHTML = profileOverview(store.data, user);
    dialog.querySelector('[data-panel=favorites]')!.innerHTML = profileFavorites(store.data);
    dialog.querySelector('[data-panel=visits]')!.innerHTML = profileVisits(store.data);
  };
  const reflectAvatar = (): void => {
    for (const element of dialog.querySelectorAll<HTMLElement>('[data-main-avatar],[data-side-avatar]')) {
      element.setAttribute('style', artwork.avatar);
      if (avatar) Object.assign(element.style, { backgroundImage: `url("${avatar}")`, backgroundSize: 'cover', backgroundPosition: 'center' });
    }
  };
  const disabled = (): void => {
    const submit = form.querySelector<HTMLButtonElement>('[type=submit]')!;
    submit.disabled = busy || uploading || !dirty();
    submit.textContent = uploading ? '正在处理头像…' : busy ? '正在保存…' : '保存修改';
    dialog.setAttribute('aria-busy', String(busy || uploading));
    dialog.querySelector<HTMLElement>('.editor-body')!.inert = busy;
    form.querySelectorAll<HTMLButtonElement>('[data-cancel],[data-retry-settings]').forEach(control => { control.disabled = busy || uploading; });
    reflectActions();
  };
  const run = async (action: () => Promise<void>): Promise<void> => {
    if (busy || closed) return;
    busy = true; feedback.textContent = ''; disabled();
    try { await action(); } catch (error) { if (!closed) { feedback.textContent = error instanceof Error ? error.message : '操作失败，请重试'; feedback.focus({preventScroll:true}); } }
    finally { busy = false; if (!closed) disabled(); }
  };
  const clearHistory = async (): Promise<void> => {
    await api.clearHistory();
    if (closed) return;
    store.data.visits = []; store.save(); refreshActivity();
    feedback.textContent = '浏览足迹已清空';
  };
  dialog.addEventListener('click', event => {
    const target = event.target as Element;
    const tab = target.closest<HTMLElement>('[data-center-tab]');
    if (tab) { selectTab(tab.dataset.centerTab!); dialog.querySelector<HTMLButtonElement>(`[data-tab="${tab.dataset.centerTab}"]`)?.focus(); return; }
    const favorite = target.closest<HTMLElement>('[data-center-favorite]');
    if (favorite) {
      const id = favorite.dataset.centerFavorite!;
      void run(async () => {
        const next = structuredClone(store.data);
        next.favorites = next.favorites.filter(value => value !== id);
        const result = await api.save(next);
        if (closed) return;
        store.data = result.library; store.save(); refreshActivity();
        dialog.querySelector<HTMLButtonElement>('[data-tab=favorites]')!.focus({ preventScroll: true });
        notify(`已取消收藏《${findPoem(id)!.title}》`);
      });
      return;
    }
    if (target.closest('[data-center-clear]')) {
      void (async () => {
        if (busy || !await confirmPaper('确认永久清空此账号的浏览足迹？资料与收藏会保留。', dialog) || closed) return;
        await run(clearHistory);
        if (!closed) dialog.querySelector<HTMLButtonElement>('[data-tab=visits]')!.focus({ preventScroll: true });
      })();
    }
  });
  const secondary = (title: string, content: string): HTMLDialogElement => {
    const child = document.createElement('dialog'); child.className = 'profile-confirm paper-dialog';
    child.setAttribute('aria-label',title);
    child.innerHTML = `${paperOrnaments()}<h3>${title}</h3>${content}`;
    children.add(child); child.addEventListener('close', () => { children.delete(child); child.remove(); });
    child.querySelectorAll<HTMLButtonElement>('[data-close]').forEach(button => { button.onclick = () => child.close(); });
    document.body.append(child); child.showModal(); return child;
  };
  const agent = (value: string): string => {
    const platform = /Windows/.test(value) ? 'Windows' : /Android/.test(value) ? 'Android' : /iPhone|iPad/.test(value) ? 'iOS' : /Macintosh/.test(value) ? 'macOS' : /Linux/.test(value) ? 'Linux' : '未知系统';
    const match = value.match(/(Edg|Firefox|Chrome|Version)\/([\d.]+)/);
    return `${platform} · ${match ? ({ Edg: 'Edge', Version: 'Safari' }[match[1]] || match[1]) + ' ' + match[2].split('.')[0] : '未知浏览器'}`;
  };
  const time = (value: string): string => new Date(value).toLocaleString('zh-CN', { hour12: false });
  const loadDevices = async (): Promise<void> => {
    devices = await api.devices(); if (closed) return;
    const current = devices.find(device => device.current);
    dialog.querySelector('[data-device]')!.textContent = current ? agent(current.agent) : agent(navigator.userAgent);
    dialog.querySelector('[data-login-time]')!.textContent = devices.length ? time(devices[0].signedInAt) : '暂无记录';
    dialog.querySelector('[data-login-agent]')!.textContent = devices.length ? agent(devices[0].agent) : '';
  };
  dialog.querySelector<HTMLButtonElement>('[data-find-profile]')!.onclick = () => {
    const child = openProfileSearch(); children.add(child);
    child.addEventListener('close', () => children.delete(child), {once:true});
  };
  for (const button of dialog.querySelectorAll<HTMLButtonElement>('[data-tab]')) button.onclick = () => selectTab(button.dataset.tab!);
  dialog.querySelector('.editor-tabs')!.addEventListener('keydown', event => {
    const key = (event as KeyboardEvent).key;
    if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(key)) return;
    event.preventDefault(); const buttons = [...dialog.querySelectorAll<HTMLButtonElement>('[data-tab]')];
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = key === 'Home' ? 0 : key === 'End' ? buttons.length - 1 : (index + (key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length;
    selectTab(buttons[next].dataset.tab!); buttons[next].focus();
  });
  const setPasswordEditing = (enabled: boolean): void => {
    changingPassword = enabled;
    const fields = dialog.querySelector<HTMLFieldSetElement>('#editor-password-fields')!;
    fields.disabled = !enabled; fields.hidden = !enabled;
    const begin = dialog.querySelector<HTMLButtonElement>('[data-enable-password]')!;
    begin.hidden = enabled; begin.setAttribute('aria-expanded', String(enabled));
    dialog.querySelector<HTMLElement>('[data-cancel-password]')!.hidden = !enabled;
    dialog.querySelector<HTMLElement>('[data-password-note]')!.hidden = enabled;
    for (const name of passwordFields) {
      field(name).value = ''; field(name).type = 'password';
      const reveal = dialog.querySelector<HTMLButtonElement>(`[data-reveal="${name}"]`)!;
      reveal.setAttribute('aria-pressed', 'false');
      reveal.setAttribute('aria-label', `显示${name === 'currentPassword' ? '原密码' : name === 'password' ? '新密码' : '确认新密码'}`);
    }
    field('password').dispatchEvent(new Event('input'));
    if (enabled) field('currentPassword').focus();
    disabled();
  };
  dialog.querySelector<HTMLButtonElement>('[data-enable-password]')!.onclick = () => setPasswordEditing(true);
  dialog.querySelector<HTMLButtonElement>('[data-cancel-password]')!.onclick = () => { setPasswordEditing(false); feedback.textContent = dirty() ? '有修改尚未保存' : ''; };
  dialog.querySelector<HTMLButtonElement>('[data-open-security]')!.onclick = () => { selectTab('security'); setPasswordEditing(true); };
  dialog.querySelectorAll<HTMLButtonElement>('[data-devices]').forEach(button => { button.onclick = () => void run(async () => {
    await loadDevices(); if (closed) return;
    secondary('登录状态管理', `<p>以下是当前账号有效的页面登录状态。关闭页面后，对应令牌会失效。</p><ul>${devices.map(device => `<li><strong>${esc(agent(device.agent))}${device.current ? ' · 当前页面' : ''}</strong><small>登录：${esc(time(device.signedInAt))}<br>最近活动：${esc(time(device.lastSeenAt))}</small></li>`).join('') || '<li>暂无其他登录设备</li>'}</ul><div class="confirm-actions"><button class="editor-button" data-close>关闭</button></div>`);
  }); });
  dialog.querySelector<HTMLButtonElement>('[data-revoke]')!.onclick = async () => {
    if (busy || !await confirmPaper('退出此账号的其他页面和设备？当前页面会继续登录。',dialog) || closed) return;
    void run(async () => { await api.revokeOthers(field('remember').checked); remembered = field('remember').checked; new LoginMemory().update(user.username, remembered); await loadDevices(); feedback.textContent = '其他设备已退出'; });
  };
  dialog.querySelectorAll<HTMLButtonElement>('[data-reveal]').forEach(button => { button.onclick = () => { const input = field(button.dataset.reveal!); input.type = input.type === 'password' ? 'text' : 'password'; button.setAttribute('aria-pressed', String(input.type === 'text')); button.setAttribute('aria-label', `${input.type === 'text' ? '隐藏' : '显示'}${input.name === 'currentPassword' ? '原密码' : input.name === 'password' ? '新密码' : '确认新密码'}`); }; });
  field('password').oninput = () => {
    const password = field('password').value, types = [/[A-Za-z]/, /\d/, /[^A-Za-z0-9]/].filter(regex => regex.test(password)).length;
    const strength = password.length >= 8 ? types : password ? 1 : 0;
    dialog.querySelector<HTMLElement>('[data-strength]')!.textContent = ['待输入', '弱', '中等', '强'][strength];
    dialog.querySelector('.editor-strength')!.setAttribute('data-level', String(strength));
  };
  const count = (): void => { dialog.querySelector('[data-count]')!.textContent = `${field('bio').value.length} / 60`; };
  field('bio').addEventListener('input', count); count();
  field('name').addEventListener('input', () => { dialog.querySelector('[data-side-name]')!.textContent = field('name').value || user.username; });
  dialog.querySelector<HTMLButtonElement>('[data-clear-name]')!.onclick = () => { field('name').value = ''; field('name').dispatchEvent(new Event('input')); field('name').focus(); };
  const canvas = dialog.querySelector('canvas')!, range = dialog.querySelector<HTMLInputElement>('[type=range]')!;
  const draw = (): void => {
    if (!bitmap) return;
    const side = Math.min(bitmap.width, bitmap.height) / Number(range.value);
    canvas.getContext('2d')!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 256, 256);
    avatar = canvas.toDataURL('image/webp', .85); reflectAvatar();
  };
  range.oninput = draw;
  dialog.querySelector<HTMLInputElement>('[type=file]')!.onchange = async event => {
    const input = event.target as HTMLInputElement, file = input.files?.[0], token = ++selection;
    if (!file) return;
    uploading = true; disabled(); feedback.textContent = '';
    try {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('请选择 JPEG、PNG 或 WebP 图片');
      if (file.size > 5 * 1024 * 1024) throw new Error('图片大小不得超过 5 MiB');
      const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
      const valid = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 || [137,80,78,71,13,10,26,10].every((n, i) => bytes[i] === n) || String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP';
      if (!valid) throw new Error('文件内容不是有效的头像图片');
      const next = await createImageBitmap(file);
      if (next.width * next.height > 16_000_000) { next.close(); throw new Error('图片不得超过 1600 万像素'); }
      if (closed || selection !== token) { next.close(); return; }
      bitmap?.close(); bitmap = next; range.value = '1'; dialog.querySelector<HTMLElement>('.editor-crop')!.hidden = false; draw();
    } catch (error) { if (!closed && selection === token) feedback.textContent = error instanceof Error ? error.message : '图片无法解码'; }
    finally { if (!closed && selection === token) { uploading = false; disabled(); } input.value = ''; }
  };
  dialog.querySelector<HTMLButtonElement>('[data-reset]')!.onclick = () => { ++selection; bitmap?.close(); bitmap = undefined; avatar = ''; uploading = false; dialog.querySelector<HTMLElement>('.editor-crop')!.hidden = true; reflectAvatar(); disabled(); };
  dialog.querySelectorAll<HTMLSelectElement>('.editor-visibility-select select').forEach(input => { input.onchange = () => { input.previousElementSibling!.outerHTML = icon(input.value === 'everyone' ? 'globe' : 'lock'); }; });
  dialog.querySelector<HTMLButtonElement>('[data-export]')!.onclick = () => void run(async () => {
    const data = await api.export(); if (closed) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `诗境-${user.username}-${new Date().toISOString().slice(0,10)}.json`; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000); feedback.textContent = '个人数据已导出';
  });
  dialog.querySelector<HTMLButtonElement>('[data-danger]')!.onclick = () => {
    const choice = secondary('管理账号与历史数据', '<p>清空历史会保留资料与收藏。注销账号将永久删除此账号、资料、收藏和历史记录。</p><div class="confirm-actions"><button class="editor-button" data-clear-history>清空浏览历史</button><button class="editor-button danger" data-delete-account>注销账号</button><button class="editor-button" data-close>取消</button></div>');
    choice.querySelector<HTMLButtonElement>('[data-clear-history]')!.onclick = async () => {
      if (!await confirmPaper('确认永久清空此账号的浏览历史？',choice) || closed || !choice.open) return;
      choice.close(); void run(clearHistory);
    };
    choice.querySelector<HTMLButtonElement>('[data-delete-account]')!.onclick = () => {
      choice.close();
      const confirm = secondary('永久注销账号', `<p>请输入当前密码，并输入账号 <strong>${esc(user.username)}</strong> 确认注销。此操作不可恢复。</p><form><label>当前密码<input type="password" name="deletePassword" autocomplete="current-password" required></label><label>确认账号<input name="deleteConfirmation" autocomplete="off" required></label><p class="confirm-feedback" role="status"></p><div class="confirm-actions"><button class="editor-button" type="button" data-close>取消</button><button class="editor-button danger" type="submit">永久注销</button></div></form>`);
      confirm.querySelector<HTMLFormElement>('form')!.onsubmit = async event => {
        event.preventDefault(); const button = confirm.querySelector<HTMLButtonElement>('[type=submit]')!;
        if (button.disabled) return; button.disabled = true;
        try { const data = new FormData(event.target as HTMLFormElement); await api.delete(String(data.get('deletePassword')), String(data.get('deleteConfirmation'))); try { localStorage.removeItem(store.key); } catch { /* The server has deleted the account. */ } notify('账号已注销'); }
        catch (error) { confirm.querySelector('.confirm-feedback')!.textContent = error instanceof Error ? error.message : '注销失败'; }
        finally { button.disabled = false; }
      };
    };
  };
  form.onsubmit = event => {
    event.preventDefault(); if (busy || uploading || !dirty()) return;
    void run(async () => {
      const data = new FormData(form), next = structuredClone(store.data);
      const name = String(data.get('name') || '').trim();
      if (!name) { selectTab('basic'); field('name').focus(); throw new Error('请输入昵称'); }
      if (field('birthday').validity.badInput || field('birthday').validity.rangeOverflow) { selectTab('basic'); field('birthday').focus(); throw new Error('请填写有效的生日，日期不能晚于今天'); }
      next.profile = { name, gender: String(data.get('gender') || ''), bio: String(data.get('bio') || '').trim(), birthday: String(data.get('birthday') || ''), avatar };
      for (const key of ['dark','motion','transitions','music','sound','recommend'] as const) next.preferences[key] = field(key).checked;
      for (const key of ['fontSize','startPage','sort','theme'] as const) Object.assign(next.preferences, { [key]: data.get(key) });
      for (const key of ['searchable','personalization','saveHistory'] as const) next.privacy[key] = field(key).checked;
      for (const key of ['profileVisibility','favoritesVisibility','visitsVisibility'] as const) Object.assign(next.privacy, { [key]: data.get(key) });
      if (!next.privacy.saveHistory) {
        if (store.data.visits.length && !await confirmPaper('关闭浏览记录保存将清空已保存的历史，确认继续？',dialog)) throw new Error('已取消关闭浏览记录保存');
        if (closed) return;
        next.visits = [];
      }
      const old = changingPassword ? field('currentPassword').value : '', password = changingPassword ? field('password').value : '';
      if (changingPassword && (old || password || field('confirmation').value)) {
        selectTab('security');
        if (!old || password.length < 8 || password.length > 20 || [/[A-Za-z]/, /\d/, /[^A-Za-z0-9]/].filter(regex => regex.test(password)).length < 2) throw new Error('请输入原密码及 8–20 位、至少包含两类字符的新密码');
        if (password !== field('confirmation').value) throw new Error('两次输入的新密码不一致');
      }
      if (!rememberLoaded) throw new Error('登录凭据状态尚未读取，请稍后重试');
      const result = await api.save(next); if (closed) return;
      store.data = result.library; store.save();
      preview(store.data.preferences);
      if (field('remember').checked !== remembered) {
        try { await api.remember(field('remember').checked); remembered = field('remember').checked; new LoginMemory().update(user.username,remembered); }
        catch (error) { throw new Error(`资料与设置已保存，登录凭据更新失败：${error instanceof Error ? error.message : '请重试'}`); }
      }
      if (password) {
        try { await api.password(old, password); }
        catch (error) { throw new Error(`资料与设置已保存，密码未修改：${error instanceof Error ? error.message : '请重试'}`); }
        notify('密码已修改，请使用新密码重新登录'); return;
      }
      baseline = snapshot(); refreshActivity(); feedback.textContent = '资料与设置已保存'; saved();
    });
  };
  const readPreferences = (): LibraryData['preferences'] => {
    const next = { ...p };
    for (const key of ['dark','motion','transitions','music','sound','recommend'] as const) next[key] = field(key).checked;
    for (const key of ['fontSize','startPage','sort','theme'] as const) Object.assign(next, { [key]: field(key).value });
    return next;
  };
  const snapshot = (): string => JSON.stringify([...new FormData(form)].filter(([key,value]) => key !== 'remember' && !passwordFields.some(name => name === key) && typeof value === 'string')) + avatar;
  let baseline = snapshot();
  const dirty = (): boolean => baseline !== snapshot() || rememberLoaded && field('remember').checked !== remembered || changingPassword && passwordFields.some(name => !!field(name).value);
  const reflectActions = (): void => {
    const changed = dirty();
    const activity = ['overview', 'favorites', 'visits'].includes(dialog.dataset.tab || 'overview');
    dialog.dataset.dirty = String(changed);
    dialog.dataset.activity = String(activity);
    dialog.querySelectorAll<HTMLButtonElement>('[data-cancel],[type=submit]').forEach(button => { button.hidden = activity && !changed; });
    dialog.querySelector<HTMLButtonElement>('[data-cancel]')!.disabled = busy || uploading || !changed;
  };
  form.addEventListener('input', () => { feedback.textContent = dirty() ? '有修改尚未保存' : ''; disabled(); });
  form.addEventListener('change', event => {
    const target = event.target as HTMLInputElement;
    if (target.name === 'dark') field('theme').value = target.checked ? 'night' : 'ink';
    if (target.name === 'theme') field('dark').checked = target.value === 'night';
    reflectPermissions();
    if (target.name in p) { preview(readPreferences()); feedback.textContent = '正在预览，保存后应用到账号'; }
    disabled();
  });
  const beforeUnload = (event: BeforeUnloadEvent): void => { if (dirty()) { event.preventDefault(); event.returnValue = ''; } };
  window.addEventListener('beforeunload', beforeUnload);
  dialog.querySelector<HTMLButtonElement>('[data-cancel]')!.onclick = async () => {
    if (busy || uploading || !await confirmPaper('撤销本页尚未保存的修改？', dialog) || closed) return;
    ++selection; bitmap?.close(); bitmap = undefined; avatar = store.data.profile.avatar;
    dialog.querySelector<HTMLElement>('.editor-crop')!.hidden = true;
    for (const [name, value] of Object.entries(store.data.profile)) if (name !== 'avatar') field(name).value = value;
    for (const [name, value] of Object.entries({ ...store.data.preferences, ...store.data.privacy })) {
      if (typeof value === 'boolean') field(name).checked = value;
      else field(name).value = value;
    }
    field('dark').checked = store.data.preferences.dark || store.data.preferences.theme === 'night';
    field('theme').value = field('dark').checked ? 'night' : 'ink';
    field('remember').checked = remembered;
    setPasswordEditing(false);
    field('name').dispatchEvent(new Event('input'));
    count(); dateDisplay(); reflectAvatar(); reflectPermissions();
    preview(store.data.preferences); baseline = snapshot(); feedback.textContent = '未保存的修改已撤销'; disabled();
  };
  refreshActivity(); selectTab('overview'); reflectAvatar(); disabled();
  void loadDevices().catch(() => { if (!closed) dialog.querySelector('[data-device]')!.textContent = '暂时无法读取'; });
  const retry = dialog.querySelector<HTMLButtonElement>('[data-retry-settings]')!;
  field('remember').disabled = true;
  const loadRemembered = async (): Promise<void> => {
    retry.hidden = true;
    try {
      const value = await new AuthApi().remembered();
      if (closed) return;
      remembered = value.remembered && value.username === user.username; rememberLoaded = true;
      field('remember').checked = remembered; field('remember').disabled = false;
      feedback.textContent = dirty() ? '有修改尚未保存' : '';
    } catch (error) { if (!closed) { retry.hidden = false; feedback.textContent = error instanceof Error ? error.message : '登录凭据读取失败，请重试'; } }
  };
  retry.onclick = () => void loadRemembered(); void loadRemembered();
  return {
    async confirmLeave() {
      if (busy || uploading) { notify(uploading ? '头像正在处理，请稍候' : '正在保存，请稍候'); return false; }
      if (children.size) { children.forEach(child => child.close()); }
      return !dirty() || await confirmPaper('还有修改尚未保存，确认放弃修改并离开？', dialog);
    },
    dispose() {
      closed = true; ++selection; bitmap?.close();
      dialog.dispatchEvent(new Event('close')); children.forEach(child => child.close());
      window.removeEventListener('beforeunload', beforeUnload);
    },
  };
}
