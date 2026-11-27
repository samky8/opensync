import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { accountProTrials, activity } from '@/db/schema';
import { requireUser } from '@/lib/supabase';
import {
  accountEntitlementsFor,
  apiError,
  checkOrigin,
  locationAccess,
  rateLimit,
} from '@/lib/server';

export async function POST(req: Request) {
  try {
    checkOrigin(req, true);
    const user = await requireUser();
    const { id } = z.object({ id: z.uuid().optional() }).parse(await req.json());
    if (id && (await locationAccess(id)).role !== 'owner')
      return Response.json(
        { error: 'Only the owner can claim a trial for this workspace' },
        { status: 403 },
      );
    await rateLimit(`trial:${user.id}`, 10);
    const result = await db().transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${user.id}))`);
      const current = await accountEntitlementsFor(user.id, tx);
      // Repeated requests return the original expiry; they never restart the clock.
      if (current.trial.status === 'active') return current;
      if (current.trial.status !== 'available')
        throw new Error('Pro trial is not available for this account');
      await tx.insert(accountProTrials).values({
        accountId: user.id,
        endsAt: sql`now() + interval '336 hours'`,
      });
      if (id)
        await tx.insert(activity).values({
          locationId: id,
          actorId: user.id,
          message: 'Started a free 14-day Pro trial for the billing account',
        });
      return accountEntitlementsFor(user.id, tx);
    });
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof z.ZodError)
      return Response.json({ error: 'Select a valid business location' }, { status: 400 });
    return apiError(error);
  }
}
