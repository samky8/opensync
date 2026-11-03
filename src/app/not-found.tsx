import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="document-page">
      <h1>This page has moved on.</h1>
      <p>
        <Link href="/">Back to OpenSync →</Link>
      </p>
    </main>
  );
}
