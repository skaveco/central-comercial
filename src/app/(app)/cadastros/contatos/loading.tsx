export default function ContactsLoading() {
  return (
    <main className="mx-auto w-full max-w-[1440px] p-5" aria-label="Carregando contatos" aria-busy="true">
      <header className="mb-4 space-y-2">
        <div className="h-7 w-24 animate-pulse rounded bg-[var(--gray-4)]" />
        <div className="h-4 w-80 animate-pulse rounded bg-[var(--gray-3)]" />
      </header>
      <div className="overflow-hidden rounded-[10px] bg-[var(--gray-1)] p-3">
        <div className="mb-3 flex justify-between">
          <div className="h-8 w-[360px] animate-pulse rounded bg-[var(--gray-3)]" />
          <div className="h-8 w-[220px] animate-pulse rounded bg-[var(--gray-3)]" />
        </div>
        <div className="space-y-px bg-[var(--gray-5)]">
          {Array.from({ length: 7 }, (_, index) => (
            <div className="h-11 animate-pulse bg-[var(--gray-1)]" key={index} />
          ))}
        </div>
      </div>
    </main>
  );
}
