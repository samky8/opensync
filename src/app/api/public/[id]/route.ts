import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { locations, revisions } from '@/db/schema';
import { getStatus } from '@/lib/domain';
import { rateLimit } from '@/lib/server';
import { createHash } from 'node:crypto';
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success)
    return Response.json({ error: 'Not found' }, { status: 404 });
  try {
    const ip =
      req.headers.get('x-vercel-forwarded-for') || req.headers.get('x-forwarded-for') || 'local';
    await rateLimit(`public:${createHash('sha256').update(ip).digest('hex')}`, 300);
    const [row] = await db()
      .select({ schedule: revisions.snapshot, version: revisions.version })
      .from(locations)
      .innerJoin(
        revisions,
        and(
          eq(revisions.locationId, locations.id),
          eq(revisions.version, locations.publishedVersion),
        ),
      )
      .where(eq(locations.id, id));
    if (!row) return Response.json({ error: 'No published hours yet' }, { status: 404 });
    return Response.json(
      { ...row, status: getStatus(row.schedule) },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=0, s-maxage=15, must-revalidate',
          'X-Robots-Tag': 'noindex',
        },
      },
    );
  } catch {
    return Response.json(
      { error: 'Hours temporarily unavailable' },
      { status: 503, headers: { 'Retry-After': '60' } },
    );
  }
}
