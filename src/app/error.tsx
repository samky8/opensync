'use client';
import { Button } from '@/components/ui/button';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="document-page">
      <h1>Something needs another try.</h1>
      <p>We couldn’t load this page. Your saved changes are still stored safely.</p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
