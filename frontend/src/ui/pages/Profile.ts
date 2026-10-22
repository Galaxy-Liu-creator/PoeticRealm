import { artwork } from '../components/artwork';

export function profilePage(): string {
  return `<div class="landscape-page profile-center-page"><div class="landscape-background" style="${artwork.homePaper}" aria-hidden="true"></div>
    <main id="main" class="profile-editor" tabindex="-1" aria-labelledby="editor-title"><p class="editor-loading" role="status">正在展开你的诗境…</p></main></div>`;
}
