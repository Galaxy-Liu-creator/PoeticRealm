import type { LibraryStore } from '../../stores/LibraryStore';
import { escapeHTML as esc } from './html';
import { artwork } from './artwork';

export function openProfileEditor(store: LibraryStore, saved: () => void): void {
  const dialog = document.createElement('dialog');
  dialog.className = 'profile-editor paper-panel';
  dialog.setAttribute('aria-labelledby', 'editor-title');
  const original = store.data.profile;
  let avatar = original.avatar;
  let image: ImageBitmap | undefined;
  let selection = 0;
  let closed = false;
  dialog.innerHTML = `<form><div class="panel-heading"><h2 id="editor-title">编辑资料</h2><button type="button" data-cancel aria-label="取消编辑">×</button></div>
    <div class="avatar-editor"><div class="avatar-preview"><canvas width="256" height="256" hidden aria-label="头像裁切预览"></canvas><div class="avatar" style="${artwork.avatar}"></div></div><div><label class="file-label">选择头像<input type="file" accept="image/jpeg,image/png,image/webp"></label><button class="text-button" type="button" data-reset>恢复默认</button><small>JPEG / PNG / WebP，最大 5 MiB<br>方形预览将保存为圆形头像</small></div></div>
    <label class="field crop-control" hidden>头像缩放<input type="range" min="1" max="3" step=".05" value="1"></label>
    <label class="field">昵称<input name="name" value="${esc(original.name)}" required maxlength="24"></label>
    <label class="field">简介<textarea name="bio" maxlength="80" rows="2">${esc(original.bio)}</textarea></label>
    <label class="field">性别<select name="gender">${['', '女', '男', '其他'].map((gender) => `<option value="${gender}" ${original.gender === gender ? 'selected' : ''}>${gender || '未设置'}</option>`).join('')}</select></label>
    <p class="form-feedback" role="status"></p><div class="editor-actions"><button type="button" class="outline-button" data-cancel>取消</button><button type="submit" class="solid-button">保存资料</button></div></form>`;
  const canvas = dialog.querySelector('canvas')!;
  const context = canvas.getContext('2d')!;
  const placeholder = dialog.querySelector<HTMLElement>('.avatar-preview .avatar')!;
  const feedback = dialog.querySelector<HTMLElement>('.form-feedback')!;
  const submit = dialog.querySelector<HTMLButtonElement>('[type=submit]')!;
  const range = dialog.querySelector<HTMLInputElement>('[type=range]')!;
  const draw = (): void => {
    if (!image) return;
    const side = Math.min(image.width, image.height) / Number(range.value);
    context.clearRect(0, 0, 256, 256);
    context.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, 256, 256);
    avatar = canvas.toDataURL('image/webp', .85);
    canvas.hidden = false; placeholder.hidden = true;
  };
  const load = async (file: Blob): Promise<ImageBitmap> => {
    const bitmap = await createImageBitmap(file);
    if (bitmap.width * bitmap.height > 16_000_000) { bitmap.close(); throw new Error('图片不得超过1600万像素'); }
    return bitmap;
  };
  if (avatar) {
    placeholder.style.backgroundImage = `url('${avatar}')`;
    placeholder.style.backgroundSize = 'cover';
    placeholder.style.backgroundPosition = 'center';
  }
  dialog.querySelector<HTMLInputElement>('[type=file]')!.onchange = async (event) => {
    const token = ++selection;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    feedback.textContent = '';
    submit.disabled = true;
    try {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('请选择 JPEG、PNG 或 WebP 图片');
      if (file.size > 5 * 1024 * 1024) throw new Error('图片大小不得超过5 MiB');
      const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
      const isJPEG = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      const isPNG = [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n);
      const isWebP = String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
      if (!(isJPEG || isPNG || isWebP)) throw new Error('文件内容不是有效的头像图片');
      const next = await load(file);
      if (closed || token !== selection) { next.close(); return; }
      image?.close(); image = next; range.value = '1';
      dialog.querySelector<HTMLElement>('.crop-control')!.hidden = false;
      draw();
    } catch (error) {
      if (!closed && token === selection) feedback.textContent = error instanceof Error ? error.message : '图片无法解码，请重新选择';
    } finally { if (!closed && token === selection) submit.disabled = false; input.value = ''; }
  };
  range.oninput = draw;
  dialog.querySelector<HTMLButtonElement>('[data-reset]')!.onclick = () => {
    ++selection; image?.close(); image = undefined; avatar = '';
    canvas.hidden = true; placeholder.hidden = false;
    placeholder.setAttribute('style', artwork.avatar);
    dialog.querySelector<HTMLElement>('.crop-control')!.hidden = true;
    submit.disabled = false;
  };
  dialog.querySelectorAll<HTMLButtonElement>('[data-cancel]').forEach((button) => { button.onclick = () => dialog.close(); });
  dialog.querySelector('form')!.onsubmit = (event) => {
    event.preventDefault();
    const data = new FormData(event.target as HTMLFormElement);
    const name = String(data.get('name') ?? '').trim();
    if (!name) { feedback.textContent = '请输入昵称'; return; }
    store.data.profile = { name, bio: String(data.get('bio') ?? '').trim(), gender: String(data.get('gender') ?? ''), avatar };
    store.save(); dialog.close(); saved();
  };
  dialog.addEventListener('close', () => { closed = true; ++selection; image?.close(); dialog.remove(); }, { once: true });
  document.body.append(dialog); dialog.showModal();
}
