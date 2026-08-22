import { getDraft } from '@/src/lib/db/drafts';
import { updateJobStatus } from '@/src/lib/db/jobs';
import { inngest } from '@/src/inngest/client';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';

async function decide(formData: FormData) {
  'use server';
  const draftId = formData.get('draftId') as string;
  const status = formData.get('status') as string;
  const notes = formData.get('notes') as string || '';
  const jobId = formData.get('jobId') as string;
  const cookieStore = await cookies();
  let storeId = cookieStore.get('activeStoreId')?.value || process.env.DEV_STORE_ID || '11111111-1111-1111-1111-111111111111';
  if (!storeId || storeId === 'undefined') storeId = '11111111-1111-1111-1111-111111111111';

  let editedPayload: any = undefined;
  if (status === 'edited') {
    editedPayload = {
      title: formData.get('title'),
      handle: formData.get('handle'),
      bodyHtml: formData.get('bodyHtml'),
      metaTitle: formData.get('metaTitle'),
      metaDescription: formData.get('metaDescription'),
    };
  }

  console.log('[INNGEST] sending approval/decided', { jobId, status });
  try {
    await inngest.send({ name: 'approval/decided', data: { status, notes, editedPayload, jobId, draftId } });
    console.log('[INNGEST] approval send completed for', jobId);
  } catch (e: any) {
    console.error('Failed to send approval to Inngest', e);
  }

  const finalStatus = status === 'approved' || status === 'edited' ? 'approved' : 'rejected';
  await updateJobStatus(jobId, finalStatus);

  const { revalidatePath } = await import('next/cache');
  revalidatePath('/review');
  revalidatePath('/');
  redirect('/review?success=decision-submitted');
}

export const dynamic = 'force-dynamic';

export default async function DraftDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let draft: any = null;
  let loadError: string | null = null;
  try {
    draft = await getDraft(id);
  } catch (e: any) {
    loadError = e.message || 'Failed to load draft';
  }
  if (!draft && !loadError) notFound();

  if (loadError) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Link href="/review" className="underline">← Back to Review</Link>
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">Error: {loadError}</div>
      </div>
    );
  }
  if (!draft) notFound();

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/review" className="underline">← Back to Review</Link>
      <h1 className="text-2xl font-bold mt-4 mb-2">{draft.title}</h1>
      <p className="text-sm text-muted-foreground mb-4">Handle: {draft.handle} | Job: {draft.jobId}</p>
      <p className="text-sm mb-4"><Link href={`/jobs/${draft.jobId}`} className="underline">View full job audit</Link></p>

      <div className="border p-4 mb-6">
        <h3 className="font-semibold mb-2">Preview</h3>
        <div className="prose max-w-none border p-4 bg-white" dangerouslySetInnerHTML={{ __html: draft.bodyHtml }} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
        <div>Meta Title: {draft.metaTitle}</div>
        <div>Meta Desc: {draft.metaDescription}</div>
      </div>

      <form action={decide} className="space-y-4 border p-4 rounded">
        <input type="hidden" name="draftId" value={draft.id} />
        <input type="hidden" name="jobId" value={draft.jobId} />

        <div>
          <label className="block mb-1">Decision</label>
          <select name="status" className="border p-2 w-full">
            <option value="approved">Approve</option>
            <option value="rejected">Reject</option>
            <option value="edited">Edit &amp; Approve</option>
          </select>
        </div>

        <div>
          <label className="block mb-1">Notes</label>
          <textarea name="notes" className="border p-2 w-full h-20" />
        </div>

        <div className="border p-3">
          <h4 className="font-medium mb-2">Edit Fields (only for edited)</h4>
          <input name="title" defaultValue={draft.title} placeholder="Title" className="border p-1 w-full mb-2" />
          <input name="handle" defaultValue={draft.handle} placeholder="Handle" className="border p-1 w-full mb-2" />
          <input name="metaTitle" defaultValue={draft.metaTitle} placeholder="Meta Title" className="border p-1 w-full mb-2" />
          <input name="metaDescription" defaultValue={draft.metaDescription} placeholder="Meta Desc" className="border p-1 w-full mb-2" />
          <textarea name="bodyHtml" defaultValue={draft.bodyHtml} className="border p-1 w-full h-40" />
        </div>

        <button type="submit" className="bg-black text-white px-6 py-2">Submit Decision</button>
      </form>
    </div>
  );
}
