import { listJobs } from '@/src/lib/db/jobs';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { listStores } from '@/src/lib/db/stores';

export const dynamic = 'force-dynamic';

export default async function History() {
  const cookieStore = await cookies();
  let storeId = cookieStore.get('activeStoreId')?.value || process.env.DEV_STORE_ID || '11111111-1111-1111-1111-111111111111';
  if (!storeId || storeId === 'undefined') {
    const stores = await listStores();
    storeId = stores[0]?.id || '11111111-1111-1111-1111-111111111111';
    if (stores[0]) {
      cookieStore.set('activeStoreId', storeId, {
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
    }
  }
  let jobs: any[] = [];
  let loadError: string | null = null;
  try {
    jobs = await listJobs(storeId, 50);
  } catch (e: any) {
    loadError = e.message || 'Failed to load history';
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <Link href="/" className="underline">← Dashboard</Link>
      <h1 className="text-2xl font-bold my-6">Job History</h1>

      {loadError && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">Error: {loadError}</div>}

      <table className="w-full border text-sm">
        <thead>
          <tr className="bg-muted">
            <th className="p-2 text-left">ID</th>
            <th className="p-2 text-left">Type</th>
            <th className="p-2 text-left">Input</th>
            <th className="p-2">Status</th>
            <th className="p-2">Created</th>
            <th className="p-2">Output</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {jobs.length === 0 && !loadError && <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">No jobs yet.</td></tr>}
          {jobs.map((j: any) => (
            <tr key={j.id} className="border-t">
              <td className="p-2 font-mono">{j.id.slice(0,8)}</td>
              <td className="p-2">{j.type}</td>
              <td className="p-2">{JSON.stringify(j.input)}</td>
              <td className="p-2 text-center">{j.status}</td>
              <td className="p-2">{new Date(j.createdAt).toLocaleDateString()}</td>
              <td className="p-2 text-xs max-w-xs truncate">{j.output ? JSON.stringify(j.output).slice(0,100) : '-'}</td>
              <td className="p-2"><Link href={`/jobs/${j.id}`} className="underline">View</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
