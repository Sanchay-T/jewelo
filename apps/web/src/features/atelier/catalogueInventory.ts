/** Offline planning only: never import this Node module into the customer UI. */
import { createHash } from 'node:crypto';
import { configurations, sampleKey, type Sample } from './catalogue';
import { views, type Draft, type View } from './model';

export const inventoryRelease = 'caleums-cumulative-samples-v1';
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export const configurationId = (draft: Draft) => digest(`${inventoryRelease}:configuration:${sampleKey(draft, 'Studio')}`);
export const photoJobId = (draft: Draft, view: View) => digest(`${inventoryRelease}:photo:${sampleKey(draft, view)}`);
export function fixedSpecification(draft: Draft) {
  return {
    names: draft.script === 'Arabic' ? (draft.twoNames ? ['أسماء','فاطمة'] : ['أسماء']) : (draft.twoNames ? ['Asma','Fatima'] : ['Asma']),
    script: draft.script, construction: draft.construction, lettering: draft.lettering,
    layout: draft.twoNames ? draft.layout : null, metal: draft.metal, karat: '18K',
    coverage: draft.coverage, gemstone: draft.coverage === 'No stones' ? null : draft.gem,
    pendantWidthMm: draft.size, chainStyle: draft.chain,
  };
}
export type InventoryAsset = Sample & { sha256?: string };
export function indexInventory(assets: InventoryAsset[]) {
  const index = new Map<string, InventoryAsset>();
  for (const asset of assets) {
    const key = sampleKey(asset.draft, asset.view);
    if (index.has(key)) throw new Error(`Duplicate integrated photographic key: ${key}`);
    index.set(key, asset);
  }
  return index;
}
export function catalogueFingerprint(assets: InventoryAsset[]) {
  return digest(JSON.stringify(assets.map(a => [sampleKey(a.draft,a.view),a.id,a.src,a.sha256 ?? null]).sort((a,b) => String(a[0]).localeCompare(String(b[0])))));
}
export function* missingPhotoJobs(assets: InventoryAsset[]) {
  const integrated = indexInventory(assets);
  for (const draft of configurations()) {
    for (const view of views) {
      if (integrated.has(sampleKey(draft,view))) continue;
      // Metals and stones derive from one structural Studio master. Other cameras
      // derive from their own full configuration's Studio, never a near match.
      const master = {...draft,metal:'Yellow gold' as const,coverage:'No stones' as const};
      const isMaster = view === 'Studio' && sampleKey(master,'Studio') === sampleKey(draft,'Studio');
      const parent = view === 'Studio' ? master : draft;
      const existing = isMaster ? undefined : integrated.get(sampleKey(parent,'Studio'));
      const reference = isMaster ? null : existing ? {
        kind:'integrated' as const, configurationId:configurationId(parent), assetId:existing.id,
        path:existing.src, sha256:existing.sha256 ?? null,
        review:'prior-review-only' as const, requiresReferenceAcceptance:true,
      } : {
        kind:'planned' as const, configurationId:configurationId(parent), jobId:photoJobId(parent,'Studio'),
        requiresReferenceAcceptance:true,
      };
      yield {
        version:1, release:inventoryRelease, jobId:photoJobId(draft,view), configurationId:configurationId(draft),
        canonicalKey:sampleKey(draft,view), view, specification:fixedSpecification(draft),
        role:isMaster ? 'structural-master' : view === 'Studio' ? 'material-variant' : 'camera-view',
        state:'planned', reference,
        acceptanceRequired:['exact-specification','fixed-name-spelling','connected-jewelry','parent-identity-consistency','photographic-quality'],
      };
    }
  }
}
