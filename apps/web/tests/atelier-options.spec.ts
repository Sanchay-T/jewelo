import { test, expect } from '@playwright/test';
import { STORAGE_KEY } from '../src/features/atelier/model';

test('metal and stone changes preserve the entire Arabic Kufi rails pendant', async ({page}) => {
 await page.goto('/en/design/new');
 const hero=page.locator('img[data-sample-id]');
 await expect(hero).toBeVisible();
 async function choose(section:string,label:string){
  const toggle=page.locator(`#section-${section} > button`);
  if(await toggle.getAttribute('aria-expanded')==='false') await toggle.click();
  await page.getByRole('button',{name:label,exact:true}).click();
 }
 await choose('name','Arabic');
 await choose('style','Diamond rails');
 await choose('style','Kufi');
 await choose('size','Rolo');
 for(const metal of ['Yellow gold','White gold','Rose gold']) {
  await choose('gold',metal);
  for(const setting of ['No stones','Accent','Partial pavé','Full pavé']) {
   await choose('gold',setting);
   await expect(hero).toBeVisible();
   await expect(hero).toHaveAttribute('data-sample-exact','true');
   for(const detail of ['أسماء','Diamond rails','Kufi',metal,setting,'Rolo']) await expect(hero).toHaveAttribute('alt',new RegExp(detail));
  }
 }
 await choose('size','22');
 await expect(page.locator('[data-preview-missing="true"]')).toBeVisible();
 await expect(hero).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Preview my piece',exact:true})).toBeDisabled();
 const draft=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).draft,STORAGE_KEY);
 expect(draft).toMatchObject({script:'Arabic',construction:'Diamond rails',lettering:'Kufi',metal:'Rose gold',coverage:'Full pavé',chain:'Rolo',size:22});
 await page.reload();
 await expect(page.locator('[data-preview-missing="true"]')).toBeVisible();
 await expect(hero).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('English stone examples remain English and a language change preserves every other option', async ({page}) => {
 await page.goto('/en/design/new');
 const hero=page.locator('img[data-sample-id]');
 await expect(hero).toBeVisible();
 async function choose(section:string,label:string){
  const toggle=page.locator(`#section-${section} > button`);
  if(await toggle.getAttribute('aria-expanded')==='false') await toggle.click();
  await page.getByRole('button',{name:label,exact:true}).click();
 }
 for(const setting of ['No stones','Accent','Partial pavé','Full pavé']) {
  await choose('gold',setting);
  await expect(hero).toHaveAttribute('alt',new RegExp(`Asma example, Classical, Classic, Yellow gold, ${setting}`));
  await expect(hero).toHaveAttribute('data-sample-exact','true');
 }
 await choose('gold','Accent');
 await choose('style','Origami ribbon');
 await choose('gold','White gold');
 await choose('gold','Ruby');
 await expect(hero).toHaveAttribute('data-sample-exact','true');
 await expect(hero).toHaveAttribute('alt',/Asma example, Origami ribbon, Classic, White gold, Accent/);
 await choose('name','Arabic');
 await expect(page.locator('[data-preview-missing="true"]')).toBeVisible();
 await expect(hero).toHaveCount(0);
 const draft=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).draft,STORAGE_KEY);
 expect(draft).toMatchObject({script:'Arabic',construction:'Origami ribbon',metal:'White gold',coverage:'Accent',gem:'Ruby'});
 await choose('name','English');
 await expect(hero).toHaveAttribute('data-sample-exact','true');
});

test('all four white-gold Kufi rails views keep the same complete specification', async ({page}) => {
 await page.goto('/en/design/new');
 const hero=page.locator('img[data-sample-id]');
 await expect(hero).toBeVisible();
 async function choose(section:string,label:string){
  const toggle=page.locator(`#section-${section} > button`);
  if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();
  await page.getByRole('button',{name:label,exact:true}).click();
 }
 await choose('name','Arabic');await choose('style','Diamond rails');await choose('style','Kufi');await choose('size','Rolo');await choose('gold','White gold');
 const paths={Studio:'/atelier/v8/arabic-kufi-rails-white-none-studio.png','On skin':'/atelier/v9/arabic-kufi-rails-white-none-worn.png','Close-up':'/atelier/v9/arabic-kufi-rails-white-none-close.png',Dark:'/atelier/v9/arabic-kufi-rails-white-none-dark.png'};
 for(const [view,path] of Object.entries(paths)) {
  await page.getByRole('button',{name:view,exact:true}).click();
  await expect(hero).toHaveAttribute('src',path);
  await expect(hero).toHaveAttribute('data-sample-exact','true');
  await expect(hero).toHaveAttribute('alt',/أسماء example, Diamond rails, Kufi, White gold, No stones, 32 mm, Rolo chain/);
  await expect.poll(()=>hero.evaluate((image:HTMLImageElement)=>image.complete&&image.naturalWidth>0)).toBe(true);
 }
});
