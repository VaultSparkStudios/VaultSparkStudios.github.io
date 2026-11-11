const {test,expect}=require('@playwright/test');

test.setTimeout(45000);

async function unsignedPublicPage(page,baseURL){
 const origin=new URL(baseURL).origin;
 await page.route('**/*',route=>{
  const request=route.request();
  return new URL(request.url()).origin===origin&&['GET','HEAD'].includes(request.method())?route.continue():route.abort();
 });
 await page.setViewportSize({width:390,height:844});
 await page.goto('/',{waitUntil:'load'});
 await page.locator('#cookieDecline').click();
 await expect.poll(()=>page.evaluate(()=>localStorage.getItem('vs_cookie_consent'))).toBe('declined');
}

async function openDrawer(page){
 await page.locator('#hamburger').click();
 await expect(page.locator('#hamburger')).toHaveAttribute('aria-expanded','true');
 await expect(page.locator('#nav-menu')).toHaveClass(/\bopen\b/);
}

async function unobstructedFooter(page){
 const menu=page.locator('#nav-menu');await menu.hover();await page.mouse.wheel(0,1800);
 for(const name of ['Membership','Create Account']){
  const link=menu.locator('.mobile-nav-footer').getByRole('link',{name,exact:true});
  await expect(link).toBeVisible();
  await expect.poll(()=>link.evaluate(e=>{
   const r=e.getBoundingClientRect(),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
   return r.width>0&&r.height>0&&r.top>=0&&r.bottom<=innerHeight&&!!top&&(top===e||e.contains(top));
  })).toBe(true);
 }
}

test('eligible Vault CTA yields to the primary drawer and stays dismissed after reopening',async({page,baseURL})=>{
 await unsignedPublicPage(page,baseURL);
 const bar=page.locator('#vs-cta-bar');await expect(bar).toBeVisible({timeout:22000});
 await expect(bar.getByRole('link',{name:'Join The Vault',exact:true})).toHaveAttribute('href','/vault-member/#register');
 await openDrawer(page);await expect(bar).toBeAttached();await expect(bar).toBeHidden();
 await unobstructedFooter(page);
 await page.keyboard.press('Escape');await expect(page.locator('#hamburger')).toHaveAttribute('aria-expanded','false');await expect(bar).toBeVisible();
 await page.setViewportSize({width:1366,height:900});await expect(bar).toBeVisible();await expect(page.locator('#nav-menu')).not.toHaveClass(/\bopen\b/);
 await page.setViewportSize({width:390,height:844});await expect(bar).toBeVisible();
 await bar.getByRole('button',{name:'Dismiss',exact:true}).click();await expect(bar).toHaveCount(0);
 const dismissed=await page.evaluate(()=>localStorage.getItem('vs_cta_dismissed'));expect(Number(dismissed)).toBeGreaterThan(0);
 await openDrawer(page);await unobstructedFooter(page);await expect(bar).toHaveCount(0);
 await page.keyboard.press('Escape');await expect(page.locator('#hamburger')).toHaveAttribute('aria-expanded','false');await expect(bar).toHaveCount(0);
 expect(await page.evaluate(()=>localStorage.getItem('vs_cta_dismissed'))).toBe(dismissed);
});

test('Vault CTA arriving at its normal deadline stays hidden in an already open drawer',async({page,baseURL})=>{
 await unsignedPublicPage(page,baseURL);
 const bar=page.locator('#vs-cta-bar');await expect(bar).toHaveCount(0);
 await openDrawer(page);await expect(bar).toHaveCount(0);
 await expect(bar).toBeAttached({timeout:22000});
 await expect(bar).toHaveCSS('display','none');await unobstructedFooter(page);
 // The primary hamburger is the actual drawer X while expanded.
 await page.locator('#hamburger').click();await expect(page.locator('#hamburger')).toHaveAttribute('aria-expanded','false');await expect(bar).toBeVisible();
 await openDrawer(page);await expect(bar).toBeHidden();await page.keyboard.press('Escape');
 await expect(page.locator('#hamburger')).toHaveAttribute('aria-expanded','false');await expect(bar).toBeVisible();
});
