import { artwork } from '../components/artwork';

const icon = (name: keyof typeof artwork.accountIcons): string =>
  `<span class="input-icon" style="${artwork.accountIcons[name]}" aria-hidden="true"></span>`;
const password = (label: string, name: string, register = false, hint = ''): string =>
  `<label class="field">${label}<span class="password-field auth-input">${icon('lock')}<input type="password" name="${name}" aria-label="${label}" required minlength="8" maxlength="20" autocomplete="${register ? 'new-password' : 'current-password'}" placeholder="${name === 'confirmation' ? '请再次输入密码' : '请输入密码'}"><button type="button" data-password="${name}" aria-label="显示${label}" aria-pressed="false"><span class="password-eye" style="${artwork.accountIcons.eye}" aria-hidden="true"></span><span class="sr-only">显示</span></button></span>${hint ? `<small>${hint}</small>` : ''}</label>`;

export function accountPage(register: boolean): string {
  const features = [['诗境漫游', '循诗而行，漫游千里山河'], ['水墨转场', '一卷展开，意境随行'], ['古诗意境', '唐风宋韵，诗画相生'], ['沉浸交互', '身临其境，与诗共鸣']];
  return `<main id="main" class="account-page" tabindex="-1" style="${artwork.accountScene}"><div class="auth-layout">
    <div class="account-motto" aria-hidden="true"><span>山河藏诗意，</span><span>一卷阅千年</span><i class="seal">诗境</i></div>
    <div class="account-intro"><h1>诗境·一卷山河</h1><p class="account-tagline">循诗入境，展卷见山河</p>
    <ul class="experience-list">${features.map(([title, description], index) => `<li><span class="experience-icon" style="${artwork.accountFeatures[index]}" aria-hidden="true"></span><div><h2>${title}</h2><p>${description}</p></div><span class="experience-arrow" aria-hidden="true">›</span></li>`).join('')}</ul></div>
    <section class="account-panel" style="${artwork.accountPaper}" aria-labelledby="account-title">${artwork.accountCorners.map((corner, index) => `<i class="auth-corner corner-${index}" style="${corner}" aria-hidden="true"></i>`).join('')}
    <h2 id="account-title">${register ? '初入诗境' : '欢迎入境'}</h2><p class="form-subtitle">${register ? '创建账号，开启诗意山河之旅' : '循诗入境，展卷见山河'}</p>
    ${register ? '' : '<nav class="account-tabs" aria-label="账号操作"><a href="#/login" aria-current="page">登录</a><a href="#/register">注册</a></nav>'}
    <form data-account-form><label class="field">用户名<span class="auth-input">${icon('user')}<input name="username" aria-label="用户名" required minlength="${register ? '4' : '1'}" maxlength="${register ? '16' : '64'}" autocomplete="username" placeholder="${register ? '请输入用户名（4–16位）' : '请输入用户名或邮箱'}"></span>${register ? '<small>支持中文、英文、数字和下划线，4–16位</small>' : ''}</label>
    ${password('密码', 'password', register, register ? '8–20位，至少包含字母、数字和特殊字符中的两种' : '')}
    ${register ? `${password('确认密码', 'confirmation', true, '请再次输入密码以确认，两次输入需一致')}<label class="field">生日<span class="auth-input">${icon('calendar')}<input type="date" name="birthday" aria-label="生日" autocomplete="bday" data-empty="true"><span class="date-placeholder" aria-hidden="true">请选择出生日期</span></span></label><fieldset class="gender-options"><legend>性别</legend><label><input type="radio" name="gender" value="男"><span aria-hidden="true">♂</span> 男</label><label><input type="radio" name="gender" value="女"><span aria-hidden="true">♀</span> 女</label><label><input type="radio" name="gender" value="其他">其他</label></fieldset>
    <div class="agreement"><label><input type="checkbox" name="agreement" required aria-label="我已阅读并同意用户协议与隐私政策">我已阅读并同意</label><button type="button" class="text-button" data-auth-policy>《用户协议》</button><span>与</span><button type="button" class="text-button" data-auth-policy>《隐私政策》</button></div>` :
      '<div class="login-options"><label><input type="checkbox" name="remember" disabled> 30天内记住我</label><button type="button" class="text-button" data-auth-info>忘记密码？</button></div>'}
    <p class="form-feedback" role="status" aria-live="polite"></p><button class="solid-button auth-submit" type="submit">${register ? '注册入境' : '登录入境'} <span aria-hidden="true">→</span></button>
    <p class="account-switch"><span>${register ? '已有账号？ <a href="#/login">立即登录</a>' : '还没有账号？ <a href="#/register">立即注册</a>'}</span></p></form>
    </section></div></main>`;
}
export function entryPage(): string {
  return `<main id="main" class="curtain-entry" tabindex="-1"><div class="curtain-closed" aria-hidden="true"></div><div class="entry-copy"><h1>诗境·一卷山河</h1><p>循诗入境，展卷见山河</p><div><a class="entry-login" href="#/login" data-curtain>登录</a><a class="entry-register" href="#/register" data-curtain>注册</a></div><a class="guest-link" href="#/">先去总览，循诗入境 →</a></div></main>`;
}
