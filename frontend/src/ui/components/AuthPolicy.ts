export function openAuthPolicy(): void {
  if (document.querySelector('.auth-policy')) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'auth-policy profile-editor paper-panel';
  dialog.setAttribute('aria-labelledby', 'auth-policy-title');
  dialog.innerHTML = `<h2 id="auth-policy-title">开发测试约定与数据说明</h2>
    <p>版本：2026-10-02-dev。本项目目前供开发测试，请使用测试账号和非真实个人资料。此说明用于当前测试流程，正式发布前将另行提供正式协议与隐私政策。</p>
    <p>注册会向项目后端发送用户名、密码以及选填的生日和性别。后端保存账号及密码哈希，不保存明文密码。登录使用浏览器会话 Cookie；选择“30天内记住我”会额外保存可撤销的持久登录凭证。</p>
    <p>昵称、头像、收藏、浏览记录和偏好目前只保存在当前浏览器，按游客与账号分别保存，不自动上传或导入游客资料。清除浏览器存储会删除这些本机资料。用户名记忆不保存密码。</p>
    <p>目前没有邮件验证或密码找回。请勿使用其他网站的密码，不要在公共设备勾选持久登录；测试结束时退出账号。</p>
    <button type="button" class="solid-button">关闭说明</button>`;
  dialog.querySelector('button')!.onclick = () => dialog.close();
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  document.body.append(dialog); dialog.showModal();
}
