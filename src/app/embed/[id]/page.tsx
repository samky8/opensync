import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { locations, revisions } from '@/db/schema';
import { Widget, type WidgetType } from '@/components/widget';
import { z } from 'zod';
import { EmbedBridge } from '@/components/embed-bridge';
import { headers } from 'next/headers';
import { createHash } from 'node:crypto';
import { rateLimit } from '@/lib/server';
export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const type: WidgetType =
    query.type === 'banner' ? 'banner' : query.type === 'status' ? 'status' : 'hours';
  let schedule;
  try {
    if (!z.uuid().safeParse(id).success) throw new Error();
    const requestHeaders = await headers();
    const ip =
      requestHeaders.get('x-vercel-forwarded-for') ||
      requestHeaders.get('x-forwarded-for') ||
      'local';
    await rateLimit(`embed:${createHash('sha256').update(ip).digest('hex')}`, 300);
    const [row] = await db()
      .select({ schedule: revisions.snapshot })
      .from(locations)
      .innerJoin(
        revisions,
        and(
          eq(revisions.locationId, locations.id),
          eq(revisions.version, locations.publishedVersion),
        ),
      )
      .where(eq(locations.id, id));
    schedule = row?.schedule;
  } catch {
    /* No private details in public errors. */
  }
  return (
    <main className="embed-page">
      <EmbedBridge id={id} />
      {schedule ? (
        <Widget schedule={schedule} type={type} liveId={id} now={new Date().toISOString()} />
      ) : (
        <p className="muted">Business hours are currently unavailable.</p>
      )}
    </main>
  );
}
