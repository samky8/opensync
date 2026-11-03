import { z } from 'zod';
import { googleAccess, googleFetch } from '@/lib/google';
import { apiError, checkOrigin, locationAccess, planFor } from '@/lib/server';
import { db } from '@/db';
import { connections } from '@/db/schema';
import { eq } from 'drizzle-orm';
type Remote = { name: string; title: string; regularHours?: unknown; specialHours?: unknown };
async function discovery(token: string) {
  const locations: Remote[] = [];
  let page = '';
  do {
    const accounts = await googleFetch(
      `https://mybusinessaccountmanagement.googleapis.com/v1/accounts?pageSize=20${page ? `&pageToken=${encodeURIComponent(page)}` : ''}`,
      token,
    );
    for (const account of accounts.accounts || []) {
      let next = '';
      do {
        const result = await googleFetch(
          `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=name,title,regularHours,specialHours&pageSize=100${next ? `&pageToken=${encodeURIComponent(next)}` : ''}`,
          token,
        );
        locations.push(...(result.locations || []));
        next = result.nextPageToken || '';
      } while (next);
    }
    page = accounts.nextPageToken || '';
  } while (page);
  return locations;
}
export async function GET(req: Request) {
  try {
    const id = z.uuid().parse(new URL(req.url).searchParams.get('id'));
    await locationAccess(id, true);
    const { token } = await googleAccess(id);
    return Response.json({ locations: await discovery(token) });
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const body = await req.json();
    const id = z.uuid().parse(body.id);
    const { location } = await locationAccess(id, true);
    if ((await planFor(location.organizationId)) === 'free') throw new Error('Google requires Pro');
    const { token } = await googleAccess(id);
    const remotes = await discovery(token);
    const selected = remotes.find((x) => x.name === body.remoteId);
    if (!selected) throw new Error('Google location not found');
    await db()
      .update(connections)
      .set({ remoteId: selected.name, status: 'connected', updatedAt: new Date() })
      .where(eq(connections.locationId, id));
    return Response.json({ selected });
  } catch (e) {
    return apiError(e);
  }
}
