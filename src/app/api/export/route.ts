import { requireUser } from '@/lib/supabase';
import { db } from '@/db';
import * as t from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { apiError, dashboardData } from '@/lib/server';
export async function GET() {
  try {
    await requireUser();
    const data = await dashboardData();
    const ids = data.locations.map((l) => l.id);
    const history = ids.length
      ? await db().select().from(t.revisions).where(inArray(t.revisions.locationId, ids))
      : [];
    const members = ids.length
      ? await db()
          .select({ role: t.memberships.role, organizationId: t.memberships.organizationId })
          .from(t.memberships)
          .where(eq(t.memberships.userId, (await requireUser()).id))
      : [];
    return Response.json(
      { ...data, history, members },
      {
        headers: {
          'Content-Disposition': 'attachment; filename="opensync-export.json"',
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch (e) {
    return apiError(e);
  }
}
