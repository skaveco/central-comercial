export default function OpportunitiesLoading() {
  return (
    <main className="mx-auto w-full max-w-[1440px] animate-pulse p-5" aria-label="Carregando Pipeline">
      <div className="h-8 w-36 rounded bg-[var(--gray-4)]" />
      <div className="mt-2 h-5 w-[480px] max-w-full rounded bg-[var(--gray-4)]" />
      <div className="mt-4 h-14 rounded-lg bg-[var(--gray-3)]" />
      <div className="mt-8 flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }, (_, index) => (
          <div className="h-[360px] w-[258px] shrink-0 rounded-lg bg-[var(--gray-3)]" key={index} />
        ))}
      </div>
    </main>
  );
}
