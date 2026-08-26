import { generateText } from 'ai';
import { xai, XAI_MODEL } from '../../ai/xai';
import { getStore } from '../../db/stores';
import { createAdminClient } from '../../shopify/client';
import { fetchStoreSamples, searchBrandContext } from '../../shopify/content';
import { buildBrandVoiceMessages } from '../../prompts/brand/voice';
import { writeKnowledge } from '../../brain/memory';

export async function inferBrandVoice({ storeId }: { storeId: string }) {
  const store = await getStore(storeId);
  if (!store || !store.shopify_access_token) {
    throw new Error(`No Shopify credentials for store ${storeId}`);
  }
  const client = createAdminClient(store.shopify_domain, store.shopify_access_token);
  const samples = await fetchStoreSamples(client);

  // Auto-populate knowledge from site samples (up to 5 for cost efficiency)
  for (const s of samples.slice(0, 5)) {
    try {
      await writeKnowledge(storeId, `${s.title}: ${s.body}`, {
        type: 'shopify_sample',
        title: s.title,
        source: 'shopify',
      });
    } catch (e) {
      console.warn('writeKnowledge sample failed', e);
    }
  }

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

  const voiceText = (text || '').trim();

  // Auto-populate the generated brand voice
  if (voiceText) {
    try {
      await writeKnowledge(storeId, voiceText, {
        type: 'brand_voice',
        source: 'inference',
      });
    } catch (e) {
      console.warn('writeKnowledge brand voice failed', e);
    }
  }

  return {
    text: voiceText,
    inferredAt: new Date().toISOString(),
    samplesUsed: samples.length,
  };
}
