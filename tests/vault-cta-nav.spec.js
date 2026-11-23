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
 await expect(bar.getByRole('link',{name:'See membership',exact:true})).toHaveAttribute('href','/membership/');
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

test('wrapped membership bar leaves the final footer reachable across resizing and dismissal',async({page,baseURL})=>{
 await unsignedPublicPage(page,baseURL);
 const bar=page.locator('#vs-cta-bar');await expect(bar).toBeVisible({timeout:22000});
 for(const width of [390,1366,390]){
  await page.setViewportSize({width,height:844});
  await expect.poll(()=>page.evaluate(()=>{
   const bar=document.querySelector('#vs-cta-bar'),spacer=document.querySelector('#vs-cta-spacer');
   return !!spacer&&Math.abs(spacer.getBoundingClientRect().height-bar.getBoundingClientRect().height)<=1;
  })).toBe(true);
  // Activating the homepage's real idle queue can append content below the
  // initial bottom. Reach the settled final region rather than an old offset.
  await page.evaluate(async()=>{
   document.documentElement.style.scrollBehavior='auto';
   for(let i=0;i<10;i++){
    scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'});
    await new Promise(resolve=>setTimeout(resolve,300));
   }
   scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'});
  });
  const privacy=page.locator('footer').getByRole('link',{name:'Privacy',exact:true});
  await expect(privacy).toBeVisible();
  await expect.poll(()=>privacy.evaluate(e=>{
   const r=e.getBoundingClientRect(),bar=document.querySelector('#vs-cta-bar').getBoundingClientRect();
   return r.bottom<=bar.top&&r.top>=0;
  })).toBe(true);
 }
 await bar.getByRole('button',{name:'Dismiss',exact:true}).click();
 await expect(page.locator('#vs-cta-spacer')).toHaveCount(0);
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
