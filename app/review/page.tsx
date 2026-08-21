import { listDrafts } from '@/src/lib/db/drafts';
import { getDraft } from '@/src/lib/db/drafts';
import { saveApproval } from '@/src/lib/db/approvals';
import { updateJobStatus } from '@/src/lib/db/jobs';
import { inngest } from '@/src/inngest/client';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { listStores } from '@/src/lib/db/stores';

async function decideAction(formData: FormData) {
  'use server';
  const draftId = formData.get('draftId') as string;
  const status = formData.get('status') as string;
  const notes = formData.get('notes') as string || '';
  const jobId = formData.get('jobId') as string;
  const cookieStore = await cookies();
  let storeId = cookieStore.get('activeStoreId')?.value || process.env.DEV_STORE_ID || '11111111-1111-1111-1111-111111111111';
  if (!storeId || storeId === 'undefined') storeId = '11111111-1111-1111-1111-111111111111';

  const editedPayloadStr = formData.get('editedPayload') as string;
  let editedPayload = undefined;
  if (editedPayloadStr) {
    try { editedPayload = JSON.parse(editedPayloadStr); } catch {}
  }

  await saveApproval({ jobId, storeId, status, reviewerNotes: notes, editedPayload });

  await inngest.send({
    name: 'approval/decided',
    data: { status, notes, editedPayload, jobId, draftId },
  });

  if (status !== 'edited') {
    await updateJobStatus(jobId, status === 'approved' ? 'approved' : 'rejected');
  }
}

export const dynamic = 'force-dynamic';

export default async function Review() {
  const cookieStore = await cookies();
  let storeId = cookieStore.get('activeStoreId')?.value || process.env.DEV_STORE_ID || '11111111-1111-1111-1111-111111111111';
  if (!storeId || storeId === 'undefined') {
    const stores = await listStores();
    storeId = stores[0]?.id || '11111111-1111-1111-1111-111111111111';
  }
  let drafts: any[] = [];
  let loadError: string | null = null;
  try {
    drafts = await listDrafts(storeId, 'awaiting_approval', 20);
  } catch (e: any) {
    loadError = e.message || 'Failed to load drafts';
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Review Queue</h1>
      <Link href="/" className="underline mb-4 block">Back to Dashboard</Link>

      {loadError && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">Error: {loadError}</div>}

      <table className="w-full border">
        <thead>
          <tr>
            <th className="p-2 text-left">Title</th>
            <th className="p-2 text-left">Handle</th>
            <th className="p-2 text-left">Score</th>
            <th className="p-2 text-left">Created</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {drafts.length === 0 && !loadError && <tr><td colSpan={5} className="p-4 text-muted-foreground">No pending drafts</td></tr>}
          {drafts.map((d: any) => (
            <tr key={d.id} className="border-t">
              <td className="p-2">{d.title}</td>
              <td className="p-2">{d.handle}</td>
              <td className="p-2">{d.evaluationScores?.score || '-'}</td>
              <td className="p-2 text-sm">{new Date(d.createdAt).toLocaleString()}</td>
              <td className="p-2 space-x-2">
                <Link href={`/drafts/${d.id}`} className="underline">View &amp; Decide</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
