import { db } from '@/db';
import * as t from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import {
  googleAccess,
  googleFetch,
  googleHours,
  GoogleError,
  validState,
  assertGoogle,
} from '@/lib/google';
import { planFor } from '@/lib/server';
import { retryDelay } from '@/lib/domain';
export const maxDuration = 60;
export async function GET(req: Request) {
  if (
    !process.env.CRON_SECRET ||
    !validState(req.headers.get('authorization'), `Bearer ${process.env.CRON_SECRET}`)
  )
    return new Response('Unauthorized', { status: 401 });
  let processed = 0;
  // A transaction-scoped location lock serializes worker calls and publication. A crashed worker rolls back for retry.
  for (let n = 0; n < 1; n++) {
    const done = await db().transaction(async (tx) => {
      const rows = await tx.execute(
        sql`select j.id, j.location_id from jobs j where j.status in ('queued','retry') and j.next_attempt<=now() order by j.created_at for update skip locked limit 1`,
      );
      if (!rows[0]) return false;
      const id = String(rows[0].id),
        locationId = String(rows[0].location_id);
      await tx.execute(sql`select id from locations where id=${locationId} for update`);
      const [job] = await tx.select().from(t.jobs).where(eq(t.jobs.id, id));
      const [loc] = await tx.select().from(t.locations).where(eq(t.locations.id, locationId));
      const [rev] = await tx.select().from(t.revisions).where(eq(t.revisions.id, job.revisionId));
      if (rev.version !== loc.publishedVersion) {
        await tx.update(t.jobs).set({ status: 'superseded' }).where(eq(t.jobs.id, id));
        return true;
      }
      const attempts = job.attempts + 1;
      try {
        assertGoogle();
        if ((await planFor(loc.organizationId, tx)) === 'free') throw new GoogleError(403);
        const { connection, token } = await googleAccess(locationId);
        if (!connection.remoteId || connection.status !== 'connected') throw new GoogleError(401);
        await googleFetch(
          `https://mybusinessbusinessinformation.googleapis.com/v1/${connection.remoteId}?updateMask=regularHours,specialHours`,
          token,
          { method: 'PATCH', body: JSON.stringify(googleHours(rev.snapshot)) },
        );
        await tx
          .update(t.jobs)
          .set({ status: 'accepted', attempts, lastAttempt: new Date(), error: null })
          .where(eq(t.jobs.id, id));
        await tx.insert(t.activity).values({
          locationId,
          message: `Google accepted revision ${rev.version}. Public visibility is not confirmed; announcements remain website-only.`,
        });
      } catch (e) {
        const transient = !(e instanceof GoogleError) || e.status === 429 || e.status >= 500;
        const retry = transient && attempts < 6;
        const message =
          e instanceof GoogleError
            ? e.message
            : 'Google request could not complete. Retry or reconnect.';
        await tx
          .update(t.jobs)
          .set({
            status: retry ? 'retry' : 'failed',
            attempts,
            lastAttempt: new Date(),
            nextAttempt: new Date(Date.now() + retryDelay(attempts) * 1000),
            error: message,
          })
          .where(eq(t.jobs.id, id));
        if (!retry)
          await tx.insert(t.notifications).values({
            organizationId: loc.organizationId,
            message: `Google sync needs attention: ${message}`,
          });
        if (e instanceof GoogleError && e.status === 401)
          await tx
            .update(t.connections)
            .set({ status: 'reconnect' })
            .where(eq(t.connections.locationId, locationId));
      }
      return true;
    });
    if (!done) break;
    processed++;
  }
  return Response.json({ processed });
}
