import { listStores, createStore } from '@/src/lib/db/stores';
import { createAdminClient } from '@/src/lib/shopify/client';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

async function testConnection(formData: FormData) {
  'use server';
  const storeId = formData.get('storeId') as string;
  const { getStore } = await import('@/src/lib/db/stores');
  const store = await getStore(storeId);
  if (!store || !store.shopify_access_token) {
    redirect(`/stores?test=error&msg=${encodeURIComponent('No credentials')}`);
  }
  try {
    const client = createAdminClient(store.shopify_domain, store.shopify_access_token);
    const query = `{
      shop {
        name
        id
      }
    }`;
    const result: any = await client.request(query);
    redirect(`/stores?test=success&msg=${encodeURIComponent(`Connected to ${result.shop.name} (${result.shop.id})`)}`);
  } catch (e: any) {
    redirect(`/stores?test=error&msg=${encodeURIComponent(e.message || 'Connection failed')}`);
  }
}

async function addStore(formData: FormData) {
  'use server';
  const name = formData.get('name') as string;
  const shopify_domain = formData.get('shopify_domain') as string;
  const shopify_access_token = formData.get('shopify_access_token') as string;
  if (!name || !shopify_domain || !shopify_access_token) {
    redirect(`/stores?add=error&msg=${encodeURIComponent('All fields required')}`);
  }
  await createStore({ name, shopify_domain, shopify_access_token });
  revalidatePath('/stores');
  redirect('/stores?add=success');
}

async function selectStore(formData: FormData) {
  'use server';
  const storeId = formData.get('storeId') as string;
  const cookieStore = await cookies();
  cookieStore.set('activeStoreId', storeId, { path: '/' });
  redirect('/');
}

export default async function StoresPage({ searchParams }: { searchParams: Promise<{ test?: string; msg?: string; add?: string }> }) {
  const params = await searchParams;
  let stores: any[] = [];
  let loadError: string | null = null;
  try {
    stores = await listStores();
  } catch (e: any) {
    loadError = e.message || 'Failed to load stores (check DATABASE_URL)';
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <Link href="/" className="underline mb-4 block">← Back to Dashboard</Link>
      <h1 className="text-3xl font-bold mb-8">Store Management</h1>

      {loadError && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">Error: {loadError}</div>}
      {params.add === 'success' && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded text-sm">Store added successfully.</div>}
      {params.add === 'error' && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">Add error: {params.msg}</div>}
      {params.test === 'success' && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded text-sm">{params.msg}</div>}
      {params.test === 'error' && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">Test failed: {params.msg}</div>}

      <div className="mb-8 border p-4 rounded">
        <h2 className="font-semibold mb-4">Add New Store</h2>
        <form action={addStore} className="space-y-2">
          <input name="name" placeholder="Store Name" className="border p-2 w-full" required />
          <input name="shopify_domain" placeholder="your-store.myshopify.com" className="border p-2 w-full" required />
          <input name="shopify_access_token" placeholder="shpat_..." type="password" className="border p-2 w-full" required />
          <Button type="submit">Add Store</Button>
        </form>
      </div>

      <h2 className="font-semibold mb-4">Your Stores</h2>
      {stores.length === 0 && !loadError && <p>No stores yet. Add one above.</p>}
      <table className="w-full border">
        <thead>
          <tr className="bg-muted">
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-left">Domain</th>
            <th className="p-2 text-left">Created</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {stores.map((store: any) => (
            <tr key={store.id} className="border-t">
              <td className="p-2">{store.name}</td>
              <td className="p-2">{store.shopify_domain}</td>
              <td className="p-2 text-sm">{new Date(store.created_at).toLocaleDateString()}</td>
              <td className="p-2 space-x-2">
                <form action={testConnection} className="inline">
                  <input type="hidden" name="storeId" value={store.id} />
                  <Button type="submit" variant="outline" size="sm">Test Connection</Button>
                </form>
                <form action={selectStore} className="inline">
                  <input type="hidden" name="storeId" value={store.id} />
                  <Button type="submit" size="sm">Select</Button>
                </form>
                <Link href={`/stores/${store.id}/edit`} className="underline text-sm">Edit</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-4 text-sm text-muted-foreground">
        After adding stores, use the selector in the header to switch between them. (Edit coming soon)
      </p>
    </div>
  );
}
