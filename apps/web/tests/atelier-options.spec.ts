import { test, expect, type Page } from '@playwright/test';
import { STORAGE_KEY } from '../src/features/atelier/model';

/**
 * Two tiers.
 *  Tier 1 - language, one or two names with layout, construction, lettering -
 *  is illustrated live and must match the photograph exactly.
 *  Tier 2 - gold colour, stones, gem, width, chain - is applied to the
 *  customer's own preview and may never change the photograph on screen.
 */
async function choose(page: Page, section: string, label: string) {
  const toggle = page.locator(`#section-${section} > button`);
  if (await toggle.getAttribute('aria-expanded') === 'false') await toggle.click();
  await page.getByRole('button', { name: label, exact: true }).click();
}
async function displayed(page: Page) {
  const hero = page.locator('img[data-sample-id]');
  await expect(hero).toBeVisible();
  return {
    id: await hero.getAttribute('data-sample-id'),
    src: await hero.getAttribute('src'),
    alt: await hero.getAttribute('alt'),
    design: await page.locator('[data-design-key]').getAttribute('data-design-key'),
    basis: await page.locator('[data-sample-basis]').getAttribute('data-sample-basis'),
  };
}

test('no gold, stone, gem, size or chain click can change the displayed design', async ({page}) => {
 await page.goto('/en/design/new');
 const hero=page.locator('img[data-sample-id]');
 await expect(hero).toBeVisible();
 await choose(page,'name','Arabic');
 await choose(page,'style','Diamond rails');
 await choose(page,'style','Kufi');
 await choose(page,'size','Rolo');
 const pendant=await displayed(page);
 expect(pendant.id).toBe('akrw-none');
 expect(pendant.basis).toBe('exact');
 // The panel says once, quietly, what the photograph is made of.
 await expect(page.locator('[data-sample-note="material"]')).toHaveText(
   'Shown in 18K white gold with no stones. Your gold and stones appear in your personalized preview.');
 for (const metal of ['Yellow gold','White gold','Rose gold']) {
  await choose(page,'gold',metal);
  for (const setting of ['No stones','Accent','Partial pavé','Full pavé']) {
   await choose(page,'gold',setting);
   expect(await displayed(page)).toEqual(pendant);
   await expect(hero).toHaveAttribute('data-sample-exact','true');
   for (const detail of ['أسماء','Diamond rails','Kufi']) await expect(hero).toHaveAttribute('alt',new RegExp(detail));
  }
 }
 for (const gem of ['Ruby','Emerald','Blue sapphire']) {
  await choose(page,'gold',gem);
  expect(await displayed(page)).toEqual(pendant);
 }
 for (const hardware of ['22','Cable','Box','Curb','32','Rolo']) {
  await choose(page,'size',hardware);
  expect(await displayed(page)).toEqual(pendant);
 }
 // A width or chain the sample was not photographed in never blocks the customer.
 await choose(page,'size','22');
 expect(await displayed(page)).toEqual(pendant);
 await expect(page.getByRole('button',{name:'Preview my piece',exact:true})).toBeEnabled();
 const draft=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).draft,STORAGE_KEY);
 expect(draft).toMatchObject({script:'Arabic',construction:'Diamond rails',lettering:'Kufi',metal:'Rose gold',coverage:'Full pavé',gem:'Blue sapphire',chain:'Rolo',size:22});
 await page.reload();
 expect(await displayed(page)).toEqual(pendant);
 await expect(page.getByRole('button',{name:'Preview my piece',exact:true})).toBeEnabled();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('a design without a photograph is offered, labelled, and still previewable', async ({page}) => {
 await page.goto('/en/design/new');
 const hero=page.locator('img[data-sample-id]');
 await expect(hero).toBeVisible();
 for (const setting of ['No stones','Accent','Partial pavé','Full pavé']) {
  await choose(page,'gold',setting);
  await expect(hero).toHaveAttribute('alt',/Asma example, Classical, Classic, Yellow gold, No stones/);
  await expect(hero).toHaveAttribute('data-sample-exact','true');
 }
 await choose(page,'gold','Accent');
 await choose(page,'style','Origami ribbon');
 await choose(page,'gold','White gold');
 await choose(page,'gold','Ruby');
 const origami=await displayed(page);
 expect(origami.basis).toBe('exact');
 await expect(hero).toHaveAttribute('alt',/Asma example, Origami ribbon, Classic, Yellow gold/);
 // A language change is Tier 1: the photograph changes with it, exactly.
 await choose(page,'name','Arabic');
 const arabic=await displayed(page);
 expect(arabic.basis).toBe('exact');
 expect(arabic.design).not.toBe(origami.design);
 await expect(hero).toHaveAttribute('alt',/أسماء/);
 // Arabic origami has no Kufi photograph yet: the option is offered and marked.
 await choose(page,'style','Kufi');
 const substitute=await displayed(page);
 expect(substitute.basis).toBe('sibling');
 expect(substitute.id).toBe(arabic.id);
 await expect(hero).toHaveAttribute('data-sample-exact','false');
 await expect(page.locator('[data-sample-note="look"]')).toHaveText(
   'Sample of this origami ribbon look, shown in Classic lettering. A photograph of this design is coming.');
 await expect(page.getByRole('button',{name:'Kufi',exact:true})).toHaveAttribute('data-sample-coming','true');
 await expect(page.getByRole('button',{name:'Classic',exact:true})).not.toHaveAttribute('data-sample-coming','true');
 await expect(page.getByRole('button',{name:'Preview my piece',exact:true})).toBeEnabled();
 const draft=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).draft,STORAGE_KEY);
 expect(draft).toMatchObject({script:'Arabic',construction:'Origami ribbon',lettering:'Kufi',metal:'White gold',coverage:'Accent',gem:'Ruby'});
 // Back to a photographed design: the exact photograph returns.
 await choose(page,'style','Classic');
 expect(await displayed(page)).toEqual(arabic);
 await expect(page.locator('[data-sample-note="look"]')).toHaveCount(0);
});

test('every camera tile shown belongs to one pendant, and Studio is always there', async ({page}) => {
 await page.goto('/en/design/new');
 const hero=page.locator('img[data-sample-id]');
 await expect(hero).toBeVisible();
 await choose(page,'name','Arabic');await choose(page,'style','Diamond rails');await choose(page,'style','Kufi');await choose(page,'size','Rolo');
 const paths={Studio:'/atelier/v8/arabic-kufi-rails-white-none-studio.png','On skin':'/atelier/v9/arabic-kufi-rails-white-none-worn.png','Close-up':'/atelier/v9/arabic-kufi-rails-white-none-close.png',Dark:'/atelier/v9/arabic-kufi-rails-white-none-dark.png'};
 for (const metal of ['Yellow gold','Rose gold','White gold']) {
  await choose(page,'gold',metal);
  for (const [view,path] of Object.entries(paths)) {
   const tile=page.getByRole('button',{name:view,exact:true});
   await expect(tile).toBeVisible();
   await expect(tile).toBeEnabled();
   await tile.click();
   await expect(hero).toHaveAttribute('src',path);
   await expect(hero).toHaveAttribute('alt',/أسماء/);
   await expect(hero).toHaveAttribute('data-sample-exact','true');
   await expect.poll(()=>hero.evaluate((node:HTMLImageElement)=>node.complete&&node.naturalWidth>0)).toBe(true);
  }
 }
 // No grey "photo not available" placeholders survive anywhere in the rail.
 await expect(page.getByText('Photo not available')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
