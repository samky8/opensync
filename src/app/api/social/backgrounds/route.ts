import { and, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { socialBackgroundImages } from '@/db/schema';
import { apiError, checkOrigin, entitlementsFor, locationAccess, rateLimit } from '@/lib/server';

const imageSchema = z
  .string()
  .max(6_000_000)
  .regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/, 'Invalid background image');

export async function GET(req: Request) {
  try {
    const id = z.uuid().parse(new URL(req.url).searchParams.get('id'));
    await locationAccess(id);
    const images = await db()
      .select()
      .from(socialBackgroundImages)
      .where(eq(socialBackgroundImages.locationId, id))
      .orderBy(desc(socialBackgroundImages.createdAt))
      .limit(5);
    return Response.json({ images }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const { id, image } = z.object({ id: z.uuid(), image: imageSchema }).parse(await req.json());
    const { location, user } = await locationAccess(id, true);
    if ((await entitlementsFor(location.organizationId)).plan === 'free')
      throw new Error('Custom backgrounds require Pro');
    await rateLimit(`social-background:${user.id}`, 20);
    const saved = await db().transaction(async (tx) => {
      // Serialize additions for one profile so concurrent requests cannot exceed five.
      await tx.execute(sql`select id from locations where id=${id} for update`);
      const existing = await tx
        .select({ id: socialBackgroundImages.id })
        .from(socialBackgroundImages)
        .where(eq(socialBackgroundImages.locationId, id))
        .limit(5);
      if (existing.length >= 5)
        throw new Error('Background limit reached. Delete one before uploading another.');
      const [row] = await tx
        .insert(socialBackgroundImages)
        .values({ locationId: id, image })
        .returning();
      return row;
    });
    return Response.json({ image: saved });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(req: Request) {
  try {
    checkOrigin(req);
    const { id, imageId } = z.object({ id: z.uuid(), imageId: z.uuid() }).parse(await req.json());
    await locationAccess(id, true);
    await db()
      .delete(socialBackgroundImages)
      .where(
        and(eq(socialBackgroundImages.locationId, id), eq(socialBackgroundImages.id, imageId)),
      );
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
