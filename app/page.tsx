import { createJob } from '@/src/lib/db/jobs';
import { inngest } from '@/src/inngest/client';
import { listJobs } from '@/src/lib/db/jobs';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

async function triggerJob(formData: FormData) {
  'use server';
  const keyword = formData.get('keyword') as string;
  if (!keyword) return;
  const storeId = process.env.DEV_STORE_ID || '11111111-1111-1111-1111-111111111111';
  const job = await createJob({ storeId, domain: 'seo', type: 'catalog_page', input: { keyword } });
  await inngest.send({
    name: 'seo/catalog-page.requested',
    data: { storeId, keyword, jobId: job.id },
  });
}

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const storeId = process.env.DEV_STORE_ID || '11111111-1111-1111-1111-111111111111';
  const jobs = await listJobs(storeId, 20);

  const pending = jobs.filter((j: any) => j.status === 'awaiting_approval').length;
  const completed = jobs.filter((j: any) => j.status === 'completed').length;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Shopify Brain - cerevex.store</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="border p-4 rounded">
          <div className="text-sm text-muted-foreground">Pending Review</div>
          <div className="text-3xl font-bold">{pending}</div>
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
        <h2 className="font-semibold mb-4">Trigger New SEO Job</h2>
        <form action={triggerJob} className="flex gap-2">
          <input name="keyword" placeholder="e.g. daikin single zone mini split" className="border p-2 flex-1" required />
          <Button type="submit">Trigger</Button>
        </form>
      </div>

      <div>
        <h2 className="font-semibold mb-4">Recent Jobs</h2>
        <table className="w-full border">
          <thead>
            <tr className="bg-muted">
              <th className="p-2 text-left">ID</th>
              <th className="p-2 text-left">Keyword / Input</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Created</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job: any) => (
              <tr key={job.id} className="border-t">
                <td className="p-2 font-mono text-xs">{job.id.slice(0, 8)}</td>
                <td className="p-2">{JSON.stringify(job.input)}</td>
                <td className="p-2">{job.status}</td>
                <td className="p-2 text-sm">{new Date(job.createdAt).toLocaleString()}</td>
                <td className="p-2">
                  <Link href={`/drafts?jobId=${job.id}`} className="underline">View</Link>
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
