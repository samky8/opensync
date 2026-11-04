import { and, eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { socialAccounts, socialPublications } from '@/db/schema';
import { metaConfigured } from '@/lib/meta';
import { apiError, checkOrigin, locationAccess } from '@/lib/server';
import { publicPublication, publicationColumns } from '@/lib/social-publishing';
export async function GET(req: Request) {
  try {
    const id = z.uuid().parse(new URL(req.url).searchParams.get('id'));
    const { role } = await locationAccess(id);
    if (!metaConfigured())
      return Response.json({
        configured: false,
        canPublish: role !== 'viewer',
        accounts: [],
        publications: [],
      });
    const accounts = await db()
      .select({
        id: socialAccounts.id,
        name: socialAccounts.name,
        instagramId: socialAccounts.instagramId,
        instagramName: socialAccounts.instagramName,
        instagramType: socialAccounts.instagramType,
      })
      .from(socialAccounts)
      .where(eq(socialAccounts.locationId, id));
    const publications = await db()
      .select(publicationColumns)
      .from(socialPublications)
      .where(eq(socialPublications.locationId, id))
      .orderBy(desc(socialPublications.createdAt))
      .limit(20);
    return Response.json(
      {
        configured: true,
        canPublish: role !== 'viewer',
        accounts,
        publications: publications.map(publicPublication),
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function DELETE(req: Request) {
  try {
    checkOrigin(req);
    const { id, accountId } = z
      .object({ id: z.uuid(), accountId: z.uuid() })
      .parse(await req.json());
    await locationAccess(id, true);
    await db()
      .delete(socialAccounts)
      .where(and(eq(socialAccounts.locationId, id), eq(socialAccounts.id, accountId)));
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
