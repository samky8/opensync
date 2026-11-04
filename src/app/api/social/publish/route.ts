import { z } from 'zod';
import { apiError, checkOrigin, locationAccess, rateLimit } from '@/lib/server';
import { assertMeta } from '@/lib/meta';
import {
  advancePublication,
  boundedJson,
  createPublication,
  publishInput,
} from '@/lib/social-publishing';
export const maxDuration = 60;
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    assertMeta();
    const body = await boundedJson(req);
    const id = z.uuid().parse(body.id);
    const { user } = await locationAccess(id, true);
    await rateLimit(`social-publish:${user.id}`, 20);
    const publication =
      body.op === 'continue'
        ? await advancePublication(z.uuid().parse(body.publicationId), id)
        : await createPublication(publishInput.parse(body));
    return Response.json({ publication }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return apiError(error);
  }
}
