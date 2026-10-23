const {test,expect}=require('@playwright/test');
const article='/news/2026-10-06/anthropic-subscriptions-offer-5x-more-value-than-openai/';
test.beforeEach(async({page})=>{
  await page.addInitScript(()=>{localStorage.setItem('vs_cookie_consent','declined');});
  await page.route('**/v/desk-comments?*',r=>r.fulfill({json:{ok:true,slug:new URL(r.request().url()).searchParams.get('slug'),count:0,comments:[]}}));
  await page.route('**/v/desk-reaction**',r=>r.fulfill({json:{ok:true,counts:{}}}));
});
for(const side of ['left','right'])test(`Spark yields to actual article controls in the ${side} corner and returns when clear`,async({page})=>{
  await page.setViewportSize({width:390,height:900});
  await page.addInitScript(side=>localStorage.setItem('vs_spark_v1',JSON.stringify({version:1,side})),side);
  await page.goto(article);const dock=page.locator('.spark-buddy');await dock.waitFor({state:'attached'});
  await page.locator('.desk-comments').last().scrollIntoViewIfNeeded();const form=page.locator('.desk-comments-form').last();await form.waitFor();
  for(const selector of ['button[type=submit]','input']){
    const control=form.locator(selector).first();
    await control.evaluate(n=>window.scrollTo({top:n.getBoundingClientRect().top+scrollY-innerHeight+100,behavior:'instant'}));
    await expect(dock).toHaveAttribute('data-yield','true');await expect(dock).toBeHidden();
    await expect.poll(()=>control.evaluate(n=>{const r=n.getBoundingClientRect();return n.contains(document.elementFromPoint(r.right-20,r.top+r.height/2));})).toBe(true);
  }
  await page.evaluate(()=>{window.scrollTo({top:0,behavior:'instant'});document.querySelector('main').style.visibility='hidden';});await expect(dock).toHaveAttribute('data-yield','false');await expect(dock).toBeVisible();
  await page.getByRole('button',{name:'Open Spark navigation'}).click();await expect(page.locator('#spark-compass')).toBeVisible();
});
test('editing, dynamic controls and responsive layout yield without losing preferences',async({page})=>{
  await page.goto('/games/');await page.locator('.spark-buddy').waitFor();
  await page.evaluate(()=>{const input=document.createElement('input');input.id='clearance-editor';input.setAttribute('aria-label','Clearance editor');input.style.cssText='position:fixed;left:20px;top:150px;width:160px;height:44px;z-index:900';document.body.append(input);});
  const dock=page.locator('.spark-buddy'),input=page.getByRole('textbox',{name:'Clearance editor'});await input.focus();await expect(dock).toBeHidden();await input.fill('Typing safely');
  await page.evaluate(()=>document.activeElement.blur());await expect(dock).toBeVisible();
  await input.evaluate(n=>{n.style.left='auto';n.style.right='20px';n.style.top='auto';n.style.bottom='30px';});
  await page.setViewportSize({width:430,height:760});await expect(dock).toBeHidden();
  await input.evaluate(n=>n.remove());await page.setViewportSize({width:1366,height:900});await expect(dock).toBeVisible();
  await page.evaluate(()=>{const node=document.createElement('div');node.id='clearance-late-control';node.textContent='Initially plain content';node.style.cssText='position:fixed;right:20px;bottom:30px;width:80px;height:44px';document.body.append(node);});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await expect(dock).toBeVisible();
  await page.locator('#clearance-late-control').evaluate(n=>n.setAttribute('role','button'));await expect(dock).toBeHidden();
  await page.locator('#clearance-late-control').evaluate(n=>n.remove());await expect(dock).toBeVisible();
  await page.getByRole('button',{name:'Tuck Spark away for this visit'}).click();await page.setViewportSize({width:390,height:844});await expect(dock).toBeHidden();
  await page.getByRole('button',{name:'Open Spark navigation'}).click();await expect(page.locator('#spark-compass')).toBeVisible();
});

for(const side of ['left','right'])test(`Spark yields to reading text in the ${side} corner and remains recallable`,async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.addInitScript(side=>localStorage.setItem('vs_spark_v1',JSON.stringify({version:1,side,motion:'still'})),side);
  await page.goto('/news/');const dock=page.locator('.spark-buddy');await dock.waitFor({state:'attached'});
  // The actual Desk story-guide paragraph reproduced the mobile obstruction.
  const text=page.getByText('Reported claims, numbers and linked sources.',{exact:true});
  await text.evaluate((n,side)=>{const r=n.getBoundingClientRect();window.scrollTo({top:r.top+scrollY-innerHeight+80,behavior:'instant'});},side);
  await expect(dock).toHaveAttribute('data-yield','true');await expect(dock).toBeHidden();
  await page.getByRole('button',{name:'Open Spark navigation'}).click();
  await expect(page.locator('#spark-compass')).toBeVisible();await page.keyboard.press('Escape');
  // A fixed reading fixture proves dynamic text mutation and empty-space return
  // independently of the changing daily edition or article length.
  await page.evaluate(side=>{const main=document.querySelector('main'),p=document.createElement('p');p.id='reading-clearance';p.style.cssText=`position:fixed;${side}:12px;bottom:24px;width:76px;z-index:900;background:var(--bg)`;p.textContent='Reading space stays clear';main.append(p);},side);
  await expect(dock).toBeHidden();
  await page.locator('#reading-clearance').evaluate(n=>n.style.bottom='300px');
  // Clear other reading lines from the corner to prove the companion can return.
  await page.evaluate(()=>{document.querySelector('main').style.visibility='hidden';document.querySelector('#reading-clearance').style.visibility='visible';});
  await expect(dock).toBeVisible();
  await page.locator('#reading-clearance').evaluate(n=>n.style.bottom='24px');await expect(dock).toBeHidden();
  await page.locator('#reading-clearance').evaluate(n=>n.firstChild.textContent='');await expect(dock).toBeVisible();
});
