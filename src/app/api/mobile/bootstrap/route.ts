import { apiError, dashboardData } from '@/lib/server';
export async function GET() {
  try {
    return Response.json(await dashboardData(), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiError(error); }
}
