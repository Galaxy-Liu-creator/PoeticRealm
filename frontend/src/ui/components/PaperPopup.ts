import {escapeHTML} from './html';

/** Original SVG cloud flourishes, drawn for the supplied paper-scroll reference. */
export function paperOrnaments(): string {
  const cloud = '<path d="M76 22C62 22 60 13 47 15c-8-14-29-10-32 2C4 15-4 24 4 29c7 4 20-2 17-8-2-5-11-2-10 2M76 23c-21 0-18 12-34 9-15-3-20 3-33 7 17 1 23-2 27 4-13-1-17 5-7 8 11 3 19-4 28-3 8 1 19 4 25-2-12 0-17-4-14-7 3-3 11-1 12-6M47 17c-10-4-19 1-18 7 0 5 10 6 12 2 2-4-4-6-6-2M55 29c-7-5-15-1-12 3"/>';
  return ['left','right'].map(side => `<svg class="paper-cloud paper-cloud-${side}" viewBox="0 0 84 60" fill="#ecddbf" stroke="#c9aa76" stroke-width="1.1" aria-hidden="true" focusable="false">${cloud}</svg>`).join('');
}
export function paperNotice(message: string, actions = '', loading = false): string {
  return `${paperOrnaments()}<svg class="paper-ink-ring" ${loading?'data-spinning':''} viewBox="0 0 64 64" aria-hidden="true" focusable="false"><path d="M48 11C31-3 6 10 7 33c0 24 28 34 46 17C71 33 53 5 32 6" fill="none" stroke="#324b4b" stroke-width="7" stroke-linecap="butt"/><path d="M14 48C-1 25 15 6 33 7" fill="none" stroke="#ceb588" stroke-width="5"/><path d="M54 22c8 15-4 35-20 35" fill="none" stroke="#71817a" stroke-width="2"/></svg><span data-popup-message>${escapeHTML(message)}</span>${actions?`<div class="paper-popup-actions">${actions}</div>`:''}`;
}

/** Styled native dialog keeps focus trapping, Escape, and safe cancellation on owner close. */
export function confirmPaper(message: string, owner: HTMLElement): Promise<boolean> {
  const active = (): boolean => owner.isConnected && (!(owner instanceof HTMLDialogElement) || owner.open);
  if (!active() || document.querySelector('.paper-question')) return Promise.resolve(false);
  const dialog = document.createElement('dialog');
  dialog.className = 'paper-dialog paper-question';
  dialog.setAttribute('aria-label', '确认操作');
  dialog.setAttribute('aria-describedby','paper-question-message');
  dialog.innerHTML = `${paperOrnaments()}<p id="paper-question-message">${escapeHTML(message)}</p><div class="paper-popup-actions"><button type="button" data-answer="cancel" autofocus>取消</button><button type="button" data-answer="confirm">确认</button></div>`;
  return new Promise(resolve => {
    let finished = false;
    const finish = (accepted: boolean): void => {
      if (finished) return; finished = true;
      owner.removeEventListener('close', cancel);
      if (dialog.open) dialog.close(); dialog.remove(); resolve(accepted && active());
    };
    const cancel = (): void => finish(false);
    owner.addEventListener('close', cancel, {once:true});
    dialog.addEventListener('cancel', event => {event.preventDefault();cancel();});
    dialog.addEventListener('close', cancel, {once:true});
    dialog.querySelector('[data-answer=cancel]')!.addEventListener('click', cancel);
    dialog.querySelector('[data-answer=confirm]')!.addEventListener('click', () => finish(true));
    document.body.append(dialog); dialog.showModal();
  });
}
