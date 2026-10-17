// Cross the actual curtain before testing a form; do not bypass the document entry gate.
export async function openCurtainForm(page, mode='login') {
  await page.locator('#app[data-initialized=true][data-ready=ready]').waitFor();
  if(await page.locator('body').getAttribute('data-page')==='account'){
    await page.locator(`[data-curtain][href="#/${mode}"]`).focus();
    await page.keyboard.press('Enter');
  }
  await page.locator(`body[data-page=${mode}] [data-account-form]`).waitFor();
  await page.locator('#app[data-ready=ready]:not([inert])').waitFor();
  await page.locator('.curtain-transition').waitFor({state:'detached'});
}
