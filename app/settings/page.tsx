import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cookies } from 'next/headers';
import { listStores, getStore, updateStore, getActiveStoreId } from '@/src/lib/db/stores';
import { inferBrandVoice } from '@/src/lib/agents/brand/voice';
import { writeKnowledge } from '@/src/lib/brain/memory';
import { createAdminClient } from '@/src/lib/shopify/client';
import { fetchStoreSamples, fetchMetafieldDefinitions } from '@/src/lib/shopify/content';

async function resyncInngest() {
  'use server';
  const apiKey = process.env.INNGEST_API_KEY;
  const appId = process.env.INNGEST_APP_ID || 'shopify-brain';
  const base = (process.env.PUBLIC_URL || '').replace(/\/+$/, '');
  const handlerUrl = base ? `${base}/api/inngest` : '';
  const { revalidatePath } = await import('next/cache');
  const { redirect } = await import('next/navigation');
  revalidatePath('/settings');
  if (!apiKey) {
    redirect('/settings?resync=error&message=' + encodeURIComponent('INNGEST_API_KEY not set'));
  }
  if (!base) {
    redirect('/settings?resync=error&message=' + encodeURIComponent('PUBLIC_URL not set (base domain e.g. https://cerevex.store)'));
  }
  try {
    const res = await fetch(`https://api.inngest.com/v2/apps/${appId}/syncs`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: handlerUrl }),
    });
    const text = await res.text();
    revalidatePath('/settings');
    if (!res.ok) {
      redirect(`/settings?resync=error&url=${encodeURIComponent(handlerUrl)}&status=${res.status}&message=${encodeURIComponent((text || 'sync failed').slice(0, 200))}`);
    }
    redirect('/settings?resync=success');
  } catch (e: any) {
    revalidatePath('/settings');
    redirect(`/settings?resync=error&url=${encodeURIComponent(handlerUrl)}&message=${encodeURIComponent(e?.message || 'network error')}`);
  }
}

async function getActiveStore() {
  let storeId = await getActiveStoreId();
  if (!storeId) return null;
  return await getStore(storeId);
}

async function generateBrandVoiceAction() {
  'use server';
  const { revalidatePath } = await import('next/cache');
  const { redirect } = await import('next/navigation');
  const store = await getActiveStore();
  if (!store) {
    revalidatePath('/settings');
    redirect('/settings?brand=error');
    return;
  }
  try {
    const bv = await inferBrandVoice({ storeId: store.id });
    const currentConfig = store.config || {};
    const newConfig = { ...currentConfig, brandVoice: bv };
    await updateStore(store.id, {
      name: store.name,
      shopify_domain: store.shopify_domain,
      shopify_access_token: '',
      platform: store.platform || 'shopify',
      config: newConfig,
    });
    revalidatePath('/settings');
    redirect('/settings?brand=generated');
  } catch (e) {
    revalidatePath('/settings');
    redirect('/settings?brand=error');
  }
}

async function ingestKnowledgeAction() {
  'use server';
  const { revalidatePath } = await import('next/cache');
  const { redirect } = await import('next/navigation');
  const store = await getActiveStore();
  if (!store || !store.shopify_access_token) {
    revalidatePath('/settings');
    redirect('/settings?knowledge=error');
    return;
  }
  try {
    const client = createAdminClient(store.shopify_domain, store.shopify_access_token);
    const samples = await fetchStoreSamples(client, 5);
    for (const s of samples) {
      await writeKnowledge(store.id, `${s.title}: ${s.body}`, {
        type: 'shopify_sample',
        title: s.title,
        source: 'shopify',
      });
    }
    const bv = store.config?.brandVoice?.text;
    if (bv) {
      await writeKnowledge(store.id, bv, { type: 'brand_voice', source: 'manual' });
    }
    revalidatePath('/settings');
    redirect('/settings?knowledge=success');
  } catch (e) {
    revalidatePath('/settings');
    redirect('/settings?knowledge=error');
  }
}

async function saveBrandVoiceAction(formData: FormData) {
  'use server';
  const { revalidatePath } = await import('next/cache');
  const { redirect } = await import('next/navigation');
  const text = formData.get('brandVoiceText') as string || '';
  const store = await getActiveStore();
  if (!store) {
    revalidatePath('/settings');
    redirect('/settings?brand=error');
    return;
  }
  const currentConfig = store.config || {};
  const existing = currentConfig.brandVoice || {};
  const newBv = typeof existing === 'object' ? { ...existing, text } : { text };
  const newConfig = { ...currentConfig, brandVoice: newBv };
  await updateStore(store.id, {
    name: store.name,
    shopify_domain: store.shopify_domain,
    shopify_access_token: '',
    platform: store.platform || 'shopify',
    config: newConfig,
  });
  revalidatePath('/settings');
  redirect('/settings?brand=saved');
}

async function saveAutonomyAction(formData: FormData) {
  'use server';
  const { revalidatePath } = await import('next/cache');
  const { redirect } = await import('next/navigation');
  const store = await getActiveStore();
  if (!store) {
    revalidatePath('/settings');
    redirect('/settings?autonomy=error');
    return;
  }
  const allowed = (formData.get('allowedTypes') as string || '').split(',').map(s => s.trim()).filter(Boolean);
  const requireApproval = formData.get('requireApproval') === 'on';
  const currentConfig = store.config || {};
  const newConfig = {
    ...currentConfig,
    autonomy: {
      allowedTypes: allowed.length ? allowed : undefined,
      requireApproval,
    },
  };
  await updateStore(store.id, {
    name: store.name,
    shopify_domain: store.shopify_domain,
    shopify_access_token: '',
    platform: store.platform || 'shopify',
    config: newConfig,
  });
  revalidatePath('/settings');
  redirect('/settings?autonomy=saved');
}

async function generatePlacementSuggestion() {
  'use server';
  const { revalidatePath } = await import('next/cache');
  const { redirect } = await import('next/navigation');
  const store = await getActiveStore();
  if (!store || !store.shopify_access_token) {
    revalidatePath('/settings');
    redirect('/settings?placement=error');
    return;
  }
  try {
    const client = createAdminClient(store.shopify_domain, store.shopify_access_token);
    const defs = await fetchMetafieldDefinitions(client);
    const collDefs = defs.filter((d: any) => d.ownerType === 'COLLECTION');
    const existing = (store.config?.placement || {}) as any;
    const suggestedMetas = collDefs.slice(0, 10).map((d: any) => ({
      source: `metafields.${d.namespace}.${d.key}`,
      target: { namespace: d.namespace, key: d.key, type: (d.type?.name || '').includes('rich') ? 'multi_line_text_field' : 'single_line_text_field' }
    }));
    const hasReason = !existing.collection?.metafields || (existing.collection.metafields.length < 3 && suggestedMetas.length > 0);
    const newPlacement = {
      ...(existing || {}),
      collection: {
        ...(existing.collection || {}),
        body: existing.collection?.body || { target: 'main' },
        metafields: suggestedMetas
      }
    };
    const suggestedConfig = { placement: newPlacement };
    const json = JSON.stringify(suggestedConfig, null, 2);
    revalidatePath('/settings');
    redirect(`/settings?placement=${encodeURIComponent(json)}${hasReason ? '&placementReason=merge' : ''}`);
  } catch (e) {
    revalidatePath('/settings');
    redirect('/settings?placement=error');
  }
}

export const dynamic = 'force-dynamic';

export default async function Settings({ searchParams }: { searchParams?: Promise<{ resync?: string; brand?: string; autonomy?: string; knowledge?: string; url?: string; status?: string; message?: string; placement?: string; placementReason?: string }> }) {
  const params = await (searchParams || Promise.resolve({})) as { resync?: string; brand?: string; autonomy?: string; knowledge?: string; url?: string; status?: string; message?: string; placement?: string; placementReason?: string };
  const store = await getActiveStore();
  const config = store?.config || {};
  const bv = config.brandVoice || null;
  const auto = config.autonomy || null;

  const base = (process.env.PUBLIC_URL || '').replace(/\/+$/, '');
  const resolvedHandlerUrl = base ? `${base}/api/inngest` : 'https://your-domain.example/api/inngest';

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <Link href="/" className="underline mb-4 block">← Back to Dashboard</Link>
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      {params.resync === 'success' && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded text-sm">Inngest resync successful.</div>
      )}
      {params.resync === 'error' && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
          Inngest resync failed.
          {params.url && <> Tried: <code>{params.url}</code>.</>}
          {params.status && <> Status: {params.status}.</>}
          {params.message && <> {params.message}</>}
        </div>
      )}
      {params.brand === 'generated' && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded text-sm">Brand voice generated and saved.</div>
      )}
      {params.brand === 'saved' && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded text-sm">Brand voice saved.</div>
      )}
      {params.brand === 'error' && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">Error with brand voice action.</div>
      )}
      {params.knowledge === 'success' && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded text-sm">Knowledge ingested successfully.</div>
      )}
      {params.knowledge === 'error' && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">Error ingesting knowledge.</div>
      )}
      {params.autonomy === 'saved' && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded text-sm">Autonomy saved.</div>
      )}
      {params.autonomy === 'error' && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">Error saving autonomy.</div>
      )}
      {params.placement && (
        <div className="mb-4 p-3 bg-blue-100 text-blue-700 rounded text-sm">
          Suggested placement config (copy to /stores edit if useful):
          <pre className="mt-2 text-xs overflow-auto bg-white p-2 rounded">{decodeURIComponent(params.placement)}</pre>
          {params.placementReason && <div className="mt-1 text-xs">Reason: current placement may benefit from metafield mappings for better agent support.</div>}
        </div>
      )}
      {params.placement === 'error' && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">Error generating placement suggestion (check store token).</div>
      )}

      <div className="mb-8 border p-4 rounded">
        <h2 className="font-semibold mb-4">Inngest Sync</h2>
        <div className="text-sm mb-2">Target: <code>{resolvedHandlerUrl}</code></div>
        <form action={resyncInngest} className="inline">
          <Button type="submit" variant="outline">Resync Inngest</Button>
        </form>
        <span className="ml-2 text-xs text-muted-foreground">Force function sync (uses PUBLIC_URL base + /api/inngest)</span>
      </div>

      <div className="mb-8 border p-4 rounded">
        <h2 className="font-semibold mb-4">Active Store Config Status</h2>
        {store ? (
          <div className="text-sm space-y-1">
            <div>Store: {store.name} ({store.shopify_domain})</div>
            <div>Placement: {config.placement ? 'Configured' : 'Using defaults'}</div>
            <div>Brand Voice: {bv ? 'Set' : 'Not set'}{bv && bv.inferredAt ? ` (inferred ${new Date(bv.inferredAt).toLocaleDateString()})` : ''}</div>
            <div>Autonomy: {auto ? 'Set' : 'Defaults (all types, require approval)'}</div>
          </div>
         ) : <div>No active store.</div>}
      </div>

      <div className="mb-8 border p-4 rounded">
        <h2 className="font-semibold mb-4">Placement Helper (Metafields)</h2>
        <form action={generatePlacementSuggestion} className="inline">
          <Button type="submit" variant="outline">Generate suggested placement from current defs</Button>
        </form>
        <span className="ml-2 text-xs text-muted-foreground">Agent uses live defs + will pick subset best for each job (creates new if needed).</span>
      </div>

      <div className="mb-8 border p-4 rounded">
        <h2 className="font-semibold mb-4">Brand Voice</h2>

        <form action={generateBrandVoiceAction} className="mb-4">
          <Button type="submit" variant="outline">Generate / Regenerate from Site + Web</Button>
        </form>
        <form action={ingestKnowledgeAction} className="mb-4">
          <Button type="submit" variant="outline">Ingest / Refresh Site Knowledge</Button>
        </form>
        <form action={saveBrandVoiceAction} className="space-y-2">
          <textarea name="brandVoiceText" defaultValue={bv?.text || ''} className="border p-2 w-full h-32 font-mono text-sm" placeholder="Brand voice description..." />
          <Button type="submit">Save Brand Voice</Button>
        </form>
        {bv && <div className="mt-2 text-xs text-muted-foreground">Last updated: {bv.inferredAt ? new Date(bv.inferredAt).toLocaleString() : 'manual'} | Samples used: {bv.samplesUsed || 'n/a'}</div>}
      </div>

      <div className="mb-8 border p-4 rounded">
        <h2 className="font-semibold mb-4">Autonomy (Basic)</h2>
        <form action={saveAutonomyAction} className="space-y-2 text-sm">
          <div>
            <label className="block mb-1">Allowed Types (comma sep, leave empty for all)</label>
            <input name="allowedTypes" defaultValue={(auto?.allowedTypes || []).join(',')} className="border p-1 w-full" placeholder="collection,page,blog" />
          </div>
          <div>
            <label>
              <input type="checkbox" name="requireApproval" defaultChecked={auto?.requireApproval !== false} /> Require human approval
            </label>
          </div>
          <Button type="submit">Save Autonomy</Button>
        </form>
      </div>
    </div>
  );
}
