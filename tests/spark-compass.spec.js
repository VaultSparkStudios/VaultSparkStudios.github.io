const {test,expect}=require('@playwright/test');

test.beforeEach(async({page})=>{
  await page.addInitScript(()=>{localStorage.setItem('vs_cookie_consent','declined');localStorage.setItem('vs_journey_pages_v1',JSON.stringify(['/studio/','/roadmap/']));localStorage.setItem('vs_cst_visited',JSON.stringify(['/games/','/roadmap/']));});
});
async function open(page){await page.getByRole('button',{name:'Open Spark — Vault Compass'}).click();await expect(page.locator('#spark-compass')).toBeVisible();await expect(page.locator('.spark-card').first()).toBeVisible();}
test('qualifying browse history, scroll and palette interaction cannot restore corner guides',async({page})=>{
  const paid=[];page.on('request',r=>{if(/semantic-search|api.openai|api.anthropic/.test(r.url()))paid.push(r.url());});
  for(const route of ['/games/','/roadmap/','/community/']){await page.goto(route);await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight*.6));await page.waitForTimeout(2500);await expect(page.locator('.vs-cst-compass,.vs-cst-toast,.vs-journey,.vs-exit-panel,.vs-vd,.vs-lens')).toHaveCount(0);await expect(page.locator('#spark-compass[open]')).toHaveCount(0);}
  await open(page);await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Open Spark — Vault Compass'})).toBeFocused();await page.keyboard.press('Control+k');await expect(page.locator('#spark-compass')).toBeVisible();await expect(page.locator('dialog[open]')).toHaveCount(1);expect(paid).toEqual([]);
});
test('search, proof, quiet preference and reduced motion remain useful',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/games/');await open(page);
  await page.getByRole('searchbox',{name:'Search Vault destinations'}).fill('Franchise');const result=page.locator('.spark-card').filter({has:page.getByRole('heading',{name:'Franchise Architect',exact:true})});await expect(result).toBeVisible();await result.getByText('Proof Orbit · sources & dates').click();await expect(result.getByRole('link',{name:/Inspect \/data\/game-registry/})).toBeVisible();await expect(page.locator('#spark-compass')).toHaveAttribute('data-motion','still');
  await page.getByLabel('Spark experience preference').selectOption('quiet');await page.keyboard.press('Escape');await page.reload();await expect(page.locator('#spark-compass[open]')).toHaveCount(0);await open(page);await expect(page.getByLabel('Spark experience preference')).toHaveValue('quiet');
});
test('mixing, saving and exporting exposes only selected public destinations',async({page})=>{
  await page.goto('/games/');await open(page);await page.getByRole('button',{name:'Mix interests',exact:true}).click();await page.getByRole('button',{name:'Compose a path'}).click();await expect(page.locator('.spark-route li')).toHaveCount(3);await page.getByRole('button',{name:'Save path',exact:true}).click();
  const downloadEvent=page.waitForEvent('download');await page.getByRole('button',{name:'Export for an agent'}).click();const download=await downloadEvent;const fs=require('fs');const exportData=JSON.parse(fs.readFileSync(await download.path(),'utf8'));expect(exportData.stops).toHaveLength(3);expect(Object.keys(exportData).sort()).toEqual(['kind','manifest','name','revision','schemaVersion','stops']);expect(JSON.stringify(exportData)).not.toMatch(/vs_cst_visited|member|token|email/);
  await page.getByRole('button',{name:'Saved paths',exact:true}).click();await expect(page.getByRole('button',{name:'Review path'})).toBeVisible();
});
test('malformed manifests cannot inject destinations; network failure has ordinary navigation',async({page})=>{
  await page.route('**/api/spark-manifest.json',r=>r.fulfill({json:{schemaVersion:1,revision:'bad',regions:[],destinations:[{id:'evil',url:'javascript:alert(1)'}]}}));await page.goto('/games/');await page.getByRole('button',{name:'Open Spark — Vault Compass'}).click();await expect(page.getByText('This source is unavailable. You can still browse.')).toBeVisible();await expect(page.locator('#spark-compass').getByRole('link',{name:'Games',exact:true})).toHaveAttribute('href','/games/');
});
test('consent takes precedence and no guide overlaps it',async({page})=>{
  await page.addInitScript(()=>localStorage.removeItem('vs_cookie_consent'));await page.goto('/games/');await expect(page.locator('#cookieConsent')).toBeVisible();await page.getByRole('button',{name:'Open Spark — Vault Compass'}).click();await expect(page.locator('#spark-compass[open]')).toHaveCount(0);await expect(page.locator('.vs-cst-compass,.vs-journey')).toHaveCount(0);
});

test('every consumed manifest field is validated before rendering',async({page})=>{
  await page.goto('/games/');await open(page);
  const verdicts=await page.evaluate(async()=>{const original=await(await fetch('/api/spark-manifest.json')).json();const mutations=[d=>d.evidence=[null],d=>d.prerequisites='bad',d=>d.availability='invented',d=>d.freshness.maxAgeHours=null,d=>d.evidence[0].url='javascript:alert(1)',d=>d.tags=[{}]];return mutations.map(mutate=>{const m=structuredClone(original);mutate(m.destinations[0]);return window.VSSpark.validateManifest(m);});});
  expect(verdicts).toEqual([false,false,false,false,false,false]);
});

test('accepting an updated saved path persists its revision and list selection',async({page})=>{
  await page.goto('/games/');await page.evaluate(()=>localStorage.setItem('vs_spark_v1',JSON.stringify({version:1,saved:[{name:'A saved world',stops:['game-franchise-architect'],revision:'older'}],completed:[]})));await open(page);
  await page.getByRole('button',{name:'Saved paths',exact:true}).click();await page.getByRole('button',{name:'Review path'}).click();await page.getByRole('button',{name:'Accept updated route'}).click();await expect(page.getByRole('button',{name:'Start this route'})).toBeVisible();
  await page.getByRole('button',{name:'Saved paths',exact:true}).click();await page.getByRole('button',{name:'Review path'}).click();await expect(page.getByRole('button',{name:'Accept updated route'})).toHaveCount(0);
  await page.locator('#spark-compass').getByRole('button',{name:'List',exact:true}).click();await page.locator('.spark-list-regions').getByRole('button',{name:'Build',exact:true}).click();await expect(page.locator('.spark-list-regions [data-region=build]')).toHaveAttribute('aria-pressed','true');
});

test('route progress is earned only when its destination actually loads',async({page})=>{
  await page.goto('/games/');await open(page);await page.getByRole('button',{name:'Mix interests',exact:true}).click();await page.getByRole('button',{name:'Compose a path'}).click();await page.getByRole('button',{name:'Start this route'}).click();
  const active=await page.evaluate(()=>JSON.parse(localStorage.getItem('vs_spark_active_v1')));expect(active.visited).toEqual([]);
  for(const target of active.targets){await page.goto(target.path);await page.getByRole('button',{name:'Open Spark — Vault Compass'}).waitFor();}
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('vs_spark_v1')).completed)).toContain(active.stops.join('.'));await expect(page.locator('#spark-compass[open]')).toHaveCount(0);
});

test('style loading failure retries even when the script already loaded',async({page})=>{
  let first=true;await page.route(/\/assets\/spark-compass.*\.css$/,r=>{if(first){first=false;return r.abort();}return r.continue();});await page.goto('/games/');const trigger=page.locator('[data-vs-palette-loader-trigger]');await trigger.click();await expect(trigger).toHaveAttribute('aria-label','Spark unavailable — try again');await expect(page.locator('#spark-compass[open]')).toHaveCount(0);await trigger.click();await expect(page.locator('#spark-compass')).toBeVisible();expect(await page.locator('#spark-compass').evaluate(n=>getComputedStyle(n).borderRadius)).toBe('28px');
});

test('MindFrame launch destinations use its current domain',async({page})=>{
  for(const route of ['/play/','/games/mindframe/']){await page.goto(route);expect(await page.locator('a[href*="steadfast-determination"]').count()).toBe(0);expect(await page.locator('a[href^="https://usemindframe.com"]').count()).toBeGreaterThan(0);}
});
