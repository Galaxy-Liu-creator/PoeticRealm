import { AccountApi } from '../../api/account';
import { escapeHTML as esc } from './html';
import { paperOrnaments } from './PaperPopup';

export function openProfileSearch(): HTMLDialogElement {
  const dialog = document.createElement('dialog');
  dialog.className = 'profile-confirm profile-search-dialog paper-dialog';
  dialog.setAttribute('aria-labelledby', 'profile-search-title');
  dialog.innerHTML = `${paperOrnaments()}<h3 id="profile-search-title">查找诗友</h3><p>输入完整或部分账号，寻找愿意公开主页的诗友。</p>
    <form><label>诗友账号<input name="query" maxlength="16" required autocomplete="off" placeholder="请输入账号"></label><div class="confirm-actions"><button type="button" class="editor-button" data-close>关闭</button><button type="submit" class="editor-button primary">查找</button></div></form><p data-search-status role="status"></p><ul data-search-results></ul>`;
  const form = dialog.querySelector('form')!;
  const status = dialog.querySelector<HTMLElement>('[data-search-status]')!;
  const results = dialog.querySelector<HTMLElement>('[data-search-results]')!;
  let request = 0;
  form.onsubmit = async event => {
    event.preventDefault(); const id = ++request;
    const query = (form.elements.namedItem('query') as HTMLInputElement).value.trim();
    if (!query) { status.textContent = '请输入诗友账号'; return; }
    const button = form.querySelector<HTMLButtonElement>('[type=submit]')!;
    button.disabled = true; status.textContent = '正在查找…'; results.innerHTML = '';
    try {
      const profiles = await new AccountApi().search(query);
      if (!dialog.open || request !== id) return;
      status.textContent = profiles.length ? `找到 ${profiles.length} 位诗友` : '暂未找到公开的诗友，可更换账号重试。';
      results.innerHTML = profiles.map(profile => `<li><a href="#/profiles/${encodeURIComponent(profile.username)}"><strong>${esc(profile.name)} · ${esc(profile.username)}</strong><small>${esc(profile.bio || '这位诗友还未留下简介')}　查看主页 →</small></a></li>`).join('');
    } catch (error) { if (dialog.open && request === id) status.textContent = error instanceof Error ? error.message : '查找失败，请重试'; }
    finally { if (request === id) button.disabled = false; }
  };
  dialog.querySelector('[data-close]')!.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if ((event.target as Element).closest('a')) dialog.close(); });
  dialog.addEventListener('close', () => { ++request; dialog.remove(); }, {once:true});
  document.body.append(dialog); dialog.showModal();
  return dialog;
}
