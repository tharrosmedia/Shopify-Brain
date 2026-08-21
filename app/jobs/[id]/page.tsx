import { getJob } from '@/src/lib/db/jobs';
import { listApprovalsByJob } from '@/src/lib/db/approvals';
import { listEventsByJob } from '@/src/lib/brain/events';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { listStores } from '@/src/lib/db/stores';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function JobDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  let storeId = cookieStore.get('activeStoreId')?.value || process.env.DEV_STORE_ID || '11111111-1111-1111-1111-111111111111';
  if (!storeId || storeId === 'undefined') {
    const stores = await listStores();
    storeId = stores[0]?.id || '11111111-1111-1111-1111-111111111111';
  }

  let job: any = null;
  let approvals: any[] = [];
  let events: any[] = [];
  let loadError: string | null = null;
  try {
    job = await getJob(id);
    if (job && job.storeId === storeId) {
      [approvals, events] = await Promise.all([
        listApprovalsByJob(id),
        listEventsByJob(id),
      ]);
    }
  } catch (e: any) {
    loadError = e.message || 'Failed to load job';
  }

  if (loadError) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <Link href="/" className="underline">← Dashboard</Link>
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">Error: {loadError}</div>
      </div>
    );
  }
  if (!job || job.storeId !== storeId) notFound();

  const keyword = job.input?.keyword || JSON.stringify(job.input);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <Link href="/" className="underline">← Dashboard</Link>
      <Link href="/history" className="underline ml-4">History</Link>
      <h1 className="text-2xl font-bold my-6">Job {job.id.slice(0, 8)}</h1>

      <div className="mb-6 border p-4 rounded text-sm">
        <div><strong>Status:</strong> {job.status}</div>
        <div><strong>Keyword / Input:</strong> {keyword}</div>
        <div><strong>Created:</strong> {new Date(job.createdAt).toLocaleString()}</div>
        <div><strong>Full ID:</strong> {job.id}</div>
      </div>

      <div className="mb-6">
        <h2 className="font-semibold mb-2">Activity Log (system notes)</h2>
        <table className="w-full border text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="p-2 text-left">Time</th>
              <th className="p-2">Actor</th>
              <th className="p-2">Action</th>
              <th className="p-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 && <tr><td colSpan={4} className="p-2 text-center text-muted-foreground">No events yet.</td></tr>}
            {events.map((e: any) => (
              <tr key={e.id} className="border-t">
                <td className="p-2">{new Date(e.createdAt).toLocaleString()}</td>
                <td className="p-2">{e.actor}</td>
                <td className="p-2">{e.action}</td>
                <td className="p-2 text-xs truncate max-w-md">{e.payload ? JSON.stringify(e.payload).slice(0, 120) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mb-6">
        <h2 className="font-semibold mb-2">Approvals &amp; Revisions</h2>
        <table className="w-full border text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="p-2 text-left">Decided</th>
              <th className="p-2">Status</th>
              <th className="p-2">Notes</th>
              <th className="p-2">Edited</th>
            </tr>
          </thead>
          <tbody>
            {approvals.length === 0 && <tr><td colSpan={4} className="p-2 text-center text-muted-foreground">No approvals yet.</td></tr>}
            {approvals.map((a: any) => (
              <tr key={a.id} className="border-t">
                <td className="p-2">{a.decidedAt ? new Date(a.decidedAt).toLocaleString() : '-'}</td>
                <td className="p-2">{a.status}</td>
                <td className="p-2 text-xs">{a.reviewerNotes || '-'}</td>
                <td className="p-2 text-xs max-w-xs truncate">{a.editedPayload ? JSON.stringify(a.editedPayload).slice(0, 80) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="font-semibold mb-2">Final Output</h2>
        {job.output ? (
          <pre className="bg-muted p-4 text-xs overflow-auto max-h-96">{JSON.stringify(job.output, null, 2)}</pre>
        ) : (
          <div className="text-muted-foreground">No output yet. Current status: {job.status}</div>
        )}
      </div>

      {job.status === 'awaiting_approval' && (
        <div className="mt-6">
          <Link href="/review" className="underline">Go to Review Queue to decide →</Link>
        </div>
      )}
    </div>
  );
}
