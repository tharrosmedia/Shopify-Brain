import { getJob, updateJobStatus } from '@/src/lib/db/jobs';
import { listApprovalsByJob } from '@/src/lib/db/approvals';
import { listEventsByJob } from '@/src/lib/brain/events';
import { getDraftByJobId } from '@/src/lib/db/drafts';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { listStores, getActiveStoreId, getStore } from '@/src/lib/db/stores';
import { notFound } from 'next/navigation';
import { inngest } from '@/src/inngest/client';

export const dynamic = 'force-dynamic';

async function requeueJob(formData: FormData) {
  'use server';
  const jobId = formData.get('jobId') as string;
  const storeId = formData.get('storeId') as string;
  const keyword = formData.get('keyword') as string;
  const type = (formData.get('type') as string) || 'collection';
  try {
    await updateJobStatus(jobId, 'queued');
    const stores = await listStores();
    const current = stores.find((s: any) => s.id === storeId) || stores[0];
    const platform = current?.platform || 'shopify';
    const brandVoice = current?.config?.brandVoice;
    console.log('[INNGEST] re-sending seo/job.requested', { jobId, type, hasEventKey: !!process.env.INNGEST_EVENT_KEY });
    await inngest.send({
      name: 'seo/job.requested',
      data: { storeId, keyword, type, platform, brandVoice, jobId },
    });
    console.log('[INNGEST] re-send completed for', jobId);
    const { revalidatePath } = await import('next/cache');
    revalidatePath(`/jobs/${jobId}`);
    revalidatePath('/');
  } catch (e: any) {
    console.error('Failed to requeue to Inngest', e);
  }
}

export default async function JobDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let storeId = await getActiveStoreId();
  if (!storeId) {
    const stores = await listStores();
    if (stores.length > 0) {
      storeId = stores[0].id;
    }
  }

  let job: any = null;
  let approvals: any[] = [];
  let events: any[] = [];
  let draft: any = null;
  let loadError: string | null = null;
  let domain = 'your-store.myshopify.com';
  try {
    job = await getJob(id);
    if (job && job.storeId === storeId) {
      [approvals, events] = await Promise.all([
        listApprovalsByJob(id),
        listEventsByJob(id),
      ]);
      if (job.status === 'awaiting_approval') {
        draft = await getDraftByJobId(id);
      }
    }
    if (storeId) {
      const s = await getStore(storeId);
      if (s?.shopify_domain) domain = s.shopify_domain;
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
        <div><strong>Type:</strong> {job.type}</div>
        <div><strong>Keyword / Input:</strong> {keyword}</div>
        <div><strong>Created:</strong> {new Date(job.createdAt).toLocaleString()}</div>
        <div><strong>Full ID:</strong> {job.id}</div>
      </div>

      {['queued', 'failed'].includes(job.status) && (
        <form action={requeueJob} className="mb-6">
          <input type="hidden" name="jobId" value={job.id} />
          <input type="hidden" name="storeId" value={job.storeId} />
          <input type="hidden" name="keyword" value={keyword} />
          <input type="hidden" name="type" value={job.type} />
          <button type="submit" className="border px-3 py-1 text-sm">Re-send to Inngest</button>
        </form>
      )}

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
          <>
            <pre className="bg-muted p-4 text-xs overflow-auto max-h-96">{JSON.stringify(job.output, null, 2)}</pre>
            {/* Constructed links */}
            {(() => {
              const out = job.output?.data || job.output;
              const coll = out?.collectionCreate?.collection || out?.pageUpdate?.page || out?.pageCreate?.page;
              const art = out?.articleCreate?.article;
              const pg = out?.pageCreate?.page || out?.pageUpdate?.page;
              const adminSlug = domain.replace(/\.myshopify\.com$/, '');
              const links: string[] = [];
              const addStorefront = (obj: any, path: string, note?: string) => {
                if (obj?.handle) links.push(`Storefront: https://${domain}/${path}/${obj.handle}${note ? ' ' + note : ''}`);
              };
              const addAdmin = (obj: any, path: string) => {
                if (obj?.id) {
                  const numId = String(obj.id).split('/').pop();
                  if (numId) links.push(`Admin: https://admin.shopify.com/store/${adminSlug}/${path}/${numId}`);
                }
              };
              addStorefront(coll, 'collections');
              addAdmin(coll, 'collections');
              addStorefront(pg, 'pages');
              addAdmin(pg, 'pages');
              addStorefront(art, 'blogs/blog', '(blog handle may vary)');
              addAdmin(art, 'articles');
              return links.length ? <div className="mt-2 text-xs"><strong>Links:</strong> {links.map((l,i)=><div key={i}>{l}</div>)}</div> : null;
            })()}
          </>
        ) : (
          <div className="text-muted-foreground">No output yet. Current status: {job.status}</div>
        )}
      </div>

      {job.status === 'awaiting_approval' && (
        <div className="mt-6">
          {draft ? (
            <Link href={`/drafts/${draft.id}`} className="underline">Review &amp; Decide →</Link>
          ) : (
            <Link href="/review" className="underline">Go to Review Queue to decide →</Link>
          )}
        </div>
      )}
    </div>
  );
}
