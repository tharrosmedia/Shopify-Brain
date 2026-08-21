import { listJobs } from '@/src/lib/db/jobs';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function History() {
  const storeId = process.env.DEV_STORE_ID || '11111111-1111-1111-1111-111111111111';
  const jobs = await listJobs(storeId, 50);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <Link href="/" className="underline">← Dashboard</Link>
      <h1 className="text-2xl font-bold my-6">Job History</h1>

      <table className="w-full border text-sm">
        <thead>
          <tr className="bg-muted">
            <th className="p-2 text-left">ID</th>
            <th className="p-2 text-left">Input</th>
            <th className="p-2">Status</th>
            <th className="p-2">Created</th>
            <th className="p-2">Output</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((j: any) => (
            <tr key={j.id} className="border-t">
              <td className="p-2 font-mono">{j.id.slice(0,8)}</td>
              <td className="p-2">{JSON.stringify(j.input)}</td>
              <td className="p-2 text-center">{j.status}</td>
              <td className="p-2">{new Date(j.createdAt).toLocaleDateString()}</td>
              <td className="p-2 text-xs max-w-xs truncate">{j.output ? JSON.stringify(j.output).slice(0,100) : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
