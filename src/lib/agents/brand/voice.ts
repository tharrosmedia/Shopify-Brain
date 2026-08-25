import { generateText } from 'ai';
import { xai, XAI_MODEL } from '../../ai/xai';
import { getStore } from '../../db/stores';
import { createAdminClient } from '../../shopify/client';
import { fetchStoreSamples, searchBrandContext } from '../../shopify/content';
import { buildBrandVoiceMessages } from '../../prompts/brand/voice';

export async function inferBrandVoice({ storeId }: { storeId: string }) {
  const store = await getStore(storeId);
  if (!store || !store.shopify_access_token) {
    throw new Error(`No Shopify credentials for store ${storeId}`);
  }
  const client = createAdminClient(store.shopify_domain, store.shopify_access_token);
  const samples = await fetchStoreSamples(client);
  let tavilyData: any = null;
  try {
    tavilyData = await searchBrandContext(store.shopify_domain, store.name);
  } catch {}
  const allMsgs = buildBrandVoiceMessages(samples, tavilyData);
  const sys = allMsgs.find(m => m.role === 'system')?.content;
  const userMsgs = allMsgs.filter(m => m.role !== 'system');
  const { text } = await generateText({
    model: xai(XAI_MODEL),
    system: sys,
    messages: userMsgs,
  });
  return {
    text: (text || '').trim(),
    inferredAt: new Date().toISOString(),
    samplesUsed: samples.length,
  };
}
