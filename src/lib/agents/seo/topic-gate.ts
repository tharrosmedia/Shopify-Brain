import { generateObject } from 'ai';
import { xai, XAI_MODEL } from '../../ai/xai';
import { z } from 'zod';

const GateSchema = z.object({
  onTopic: z.boolean(),
  violations: z.array(z.string()),
  notes: z.string().optional(),
});

export async function checkTopicGate({ draft, brief, research }: { draft: any; brief?: any; research?: any }) {
  const keyword = (brief?.primaryKeyword || brief?.keyword || '').toLowerCase();
  const mustCover = (brief?.mustCover || []).map((s: string) => s.toLowerCase());
  const mustNot = (brief?.mustNotCover || []).map((s: string) => s.toLowerCase());
  const content = ((draft.title || '') + ' ' + (draft.metaTitle || '') + ' ' + (draft.metaDescription || '') + ' ' + (draft.bodyHtml || '')).toLowerCase();

  // Heuristic
  let onTopic = true;
  const violations: string[] = [];
  if (keyword && !content.includes(keyword)) {
    onTopic = false;
    violations.push(`missing primary keyword: ${keyword}`);
  }
  for (const mc of mustCover) {
    if (mc && !content.includes(mc)) {
      onTopic = false;
      violations.push(`missing must-cover: ${mc}`);
    }
  }
  for (const mn of mustNot) {
    if (mn && content.includes(mn)) {
      onTopic = false;
      violations.push(`includes forbidden: ${mn}`);
    }
  }

  // Light LLM verification for quality (advisory)
  try {
    const { object } = await generateObject({
      model: xai(XAI_MODEL),
      schema: GateSchema,
      prompt: `Check if this draft is on-topic for the brief.
Keyword: ${keyword}
Must cover: ${mustCover.join('; ')}
Must NOT cover: ${mustNot.join('; ')}
Brief intent: ${brief?.intent || ''}
Draft title/meta/body excerpt: ${(draft.title||'').slice(0,100)} | ${(draft.metaDescription||'').slice(0,150)} | ${(draft.bodyHtml||'').slice(0,600)}

Return {onTopic: bool, violations: string[], notes?}. Be strict on topic drift.`
    });
    if (typeof object.onTopic === 'boolean') {
      return { onTopic: onTopic && object.onTopic, violations: [...violations, ...object.violations], notes: object.notes };
    }
  } catch {}
  return { onTopic, violations, notes: 'heuristic only' };
}
