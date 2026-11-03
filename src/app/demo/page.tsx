import { Dashboard } from '@/components/dashboard';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Explore the demo · OpenSync', robots: { index: false } };
export default function Page() {
  return <Dashboard demo now={new Date().toISOString()} />;
}
