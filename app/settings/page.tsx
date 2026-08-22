import Link from 'next/link';
import { Button } from '@/components/ui/button';

async function resyncInngest() {
  'use server';
  const apiKey = process.env.INNGEST_API_KEY;
  const appId = 'shopify-brain';
  const handlerUrl = process.env.PUBLIC_URL || 'https://cerevex.store/api/inngest';
  const { revalidatePath } = await import('next/cache');
  const { redirect } = await import('next/navigation');
  revalidatePath('/settings');
  try {
    const res = await fetch(`https://api.inngest.com/v2/apps/${appId}/syncs`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: handlerUrl }),
    });
    revalidatePath('/settings');
    if (!res.ok) {
      redirect('/settings');
    }
    redirect('/settings?resync=success');
  } catch {
    revalidatePath('/settings');
    redirect('/settings');
  }
}

export const dynamic = 'force-dynamic';

export default async function Settings({ searchParams }: { searchParams?: Promise<{ resync?: string }> }) {
  const params = await (searchParams || Promise.resolve({})) as { resync?: string };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <Link href="/" className="underline mb-4 block">← Back to Dashboard</Link>
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      {params.resync === 'success' && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded text-sm">Inngest resync successful.</div>
      )}

      <div className="mb-8 border p-4 rounded">
        <h2 className="font-semibold mb-4">Inngest Sync</h2>
        <form action={resyncInngest} className="inline">
          <Button type="submit" variant="outline">Resync Inngest</Button>
        </form>
        <span className="ml-2 text-xs text-muted-foreground">Force function sync (uses PUBLIC_URL)</span>
      </div>
    </div>
  );
}
