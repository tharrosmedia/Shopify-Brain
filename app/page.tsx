import { createJob, updateJobStatus } from '@/src/lib/db/jobs';
import { inngest } from '@/src/inngest/client';
import { listJobs } from '@/src/lib/db/jobs';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cookies } from 'next/headers';
import { listStores } from '@/src/lib/db/stores';
import AutoRefresh from '@/components/auto-refresh';

async function triggerJob(formData: FormData) {
  'use server';
  const keyword = formData.get('keyword') as string;
  const type = (formData.get('type') as string) || 'collection';
  if (!keyword) return;
  const cookieStore = await cookies();
  let storeId = cookieStore.get('activeStoreId')?.value || process.env.DEV_STORE_ID || '11111111-1111-1111-1111-111111111111';
  if (!storeId || storeId === 'undefined') {
    const stores = await listStores();
    storeId = stores[0]?.id || '11111111-1111-1111-1111-111111111111';
  }
  const c = await cookies();
  c.set('activeStoreId', storeId, {
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  const job = await createJob({ storeId, domain: 'seo', type, input: { keyword }, status: 'queued' });
  console.log('[INNGEST] sending seo/job.requested', { jobId: job.id, type, hasEventKey: !!process.env.INNGEST_EVENT_KEY });
  try {
    await inngest.send({
      name: 'seo/job.requested',
      data: { storeId, keyword, type, jobId: job.id },
    });
    console.log('[INNGEST] send completed without throw for', job.id);
  } catch (e: any) {
    console.error('Failed to send to Inngest', e);
    await updateJobStatus(job.id, 'failed');
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/');
    throw new Error(`Failed to queue job for Inngest: ${e.message || e}`);
  }
  const { revalidatePath } = await import('next/cache');
  revalidatePath('/');
}

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const cookieStore = await cookies();
  let storeId = cookieStore.get('activeStoreId')?.value || process.env.DEV_STORE_ID || '11111111-1111-1111-1111-111111111111';
  const allStores = await listStores();
  if (!storeId || storeId === 'undefined') {
    storeId = allStores[0]?.id || '11111111-1111-1111-1111-111111111111';
    if (allStores[0]) {
      const c = await cookies();
      c.set('activeStoreId', storeId, {
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
    }
  }
  let jobs: any[] = [];
  let loadError: string | null = null;
  try {
    jobs = await listJobs(storeId, 20);
  } catch (e: any) {
    loadError = e.message || 'Failed to load jobs';
  }

  const awaitingApproval = jobs.filter((j: any) => j.status === 'awaiting_approval').length;
  const completed = jobs.filter((j: any) => j.status === 'completed').length;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Shopify Brain - cerevex.store</h1>
      <AutoRefresh interval={4000} />

      {allStores.length === 0 && (
        <div className="mb-6 p-4 border border-blue-200 bg-blue-50 rounded">
          <p className="font-semibold mb-2">Welcome! Get started by adding your Shopify store.</p>
          <Link href="/stores" className="inline-block bg-black text-white px-4 py-2 rounded text-sm">Go to Store Management →</Link>
          <p className="text-sm mt-2 text-muted-foreground">Once added, it will be auto-selected and you can trigger SEO jobs.</p>
        </div>
      )}

      {loadError && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
          Error loading data: {loadError}. Make sure DATABASE_URL is set and migration has run.
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="border p-4 rounded">
          <div className="text-sm text-muted-foreground">Awaiting Approval</div>
          <div className="text-3xl font-bold">{awaitingApproval}</div>
        </div>
        <div className="border p-4 rounded">
          <div className="text-sm text-muted-foreground">Completed</div>
          <div className="text-3xl font-bold">{completed}</div>
        </div>
        <div className="border p-4 rounded">
          <div className="text-sm text-muted-foreground">Total Jobs</div>
          <div className="text-3xl font-bold">{jobs.length}</div>
        </div>
      </div>

      <div className="mb-8 border p-4 rounded">
        <h2 className="font-semibold mb-4">Trigger New Shopify Job</h2>
        <form action={triggerJob} className="flex gap-2">
          <input name="keyword" placeholder="e.g. daikin single zone mini split" className="border p-2 flex-1" required />
          <select name="type" defaultValue="collection" className="border p-2">
            <option value="collection">Collection</option>
            <option value="page">Page</option>
            <option value="blog">Blog Post</option>
          </select>
          <Button type="submit">Trigger</Button>
        </form>
      </div>

      <div>
        <h2 className="font-semibold mb-4">Recent Jobs</h2>
        <table className="w-full border">
          <thead>
            <tr className="bg-muted">
              <th className="p-2 text-left">ID</th>
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-left">Keyword / Input</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Created</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 && !loadError && (
              <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No jobs yet for this store.</td></tr>
            )}
            {jobs.map((job: any) => (
              <tr key={job.id} className="border-t">
                <td className="p-2 font-mono text-xs">{job.id.slice(0, 8)}</td>
                <td className="p-2">{job.type}</td>
                <td className="p-2">{JSON.stringify(job.input)}</td>
                <td className="p-2">{job.status}</td>
                <td className="p-2 text-sm">{new Date(job.createdAt).toLocaleString()}</td>
                <td className="p-2">
                  <Link href={`/jobs/${job.id}`} className="underline">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 text-sm">
        <Link href="/review" className="underline mr-4">Review Queue</Link>
        <Link href="/history" className="underline">Full History</Link>
      </div>
    </div>
  );
}
