export default function Loading() {
  return (
    <main className="loading-page" aria-label="Loading OpenSync">
      <div className="skeleton" style={{ minHeight: 70 }} />
      <div className="skeleton" />
      <div className="skeleton" />
    </main>
  );
}
