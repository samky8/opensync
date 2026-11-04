import { and, eq, gt } from 'drizzle-orm';
import { db } from '@/db';
import { socialPublications } from '@/db/schema';
export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!/^[a-f\d]{64}$/.test(key)) return new Response(null, { status: 404 });
  const [media] = await db()
    .select({ image: socialPublications.image })
    .from(socialPublications)
    .where(
      and(eq(socialPublications.mediaKey, key), gt(socialPublications.mediaExpiresAt, new Date())),
    );
  if (!media?.image) return new Response(null, { status: 404 });
  return new Response(Buffer.from(media.image, 'base64'), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex, nofollow',
      'Referrer-Policy': 'no-referrer',
    },
  });
}
