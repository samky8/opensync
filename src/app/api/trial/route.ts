import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { proTrials, activity } from '@/db/schema';
import { apiError, checkOrigin, entitlementsFor, locationAccess, rateLimit } from '@/lib/server';

export async function POST(req: Request) {
  try {
    checkOrigin(req, true);
    const { id } = z.object({ id: z.uuid() }).parse(await req.json());
    const { location, role, user } = await locationAccess(id);
    if (role !== 'owner')
      return Response.json({ error: 'Only the owner can claim a Pro trial' }, { status: 403 });
    await rateLimit(`trial:${user.id}`, 10);
    const result = await db().transaction(async (tx) => {
      await tx.execute(
        sql`select id from organizations where id=${location.organizationId} for update`,
      );
      const current = await entitlementsFor(location.organizationId, tx);
      // Repeated requests return the original expiry; they never restart the clock.
      if (current.trial.status === 'active') return current;
      if (current.trial.status !== 'available')
        throw new Error('Pro trial is not available for this workspace');
      await tx.insert(proTrials).values({
        organizationId: location.organizationId,
        claimedBy: user.id,
        endsAt: sql`now() + interval '336 hours'`,
      });
      await tx.insert(activity).values({
        locationId: id,
        actorId: user.id,
        message: 'Started a free 14-day Pro trial',
      });
      return entitlementsFor(location.organizationId, tx);
    });
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof z.ZodError)
      return Response.json({ error: 'Select a valid business location' }, { status: 400 });
    return apiError(error);
  }
}
