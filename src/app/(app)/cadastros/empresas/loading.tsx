export default function CompaniesLoading() {
  return (
    <main className="mx-auto w-full max-w-[1440px] p-5" aria-label="Carregando empresas" aria-busy="true">
      <div className="overflow-hidden rounded-[10px] bg-[var(--gray-1)]">
        <div className="flex items-center justify-between border-b border-[var(--gray-6)] p-5">
          <div className="space-y-2">
            <div className="h-7 w-28 animate-pulse rounded bg-[var(--gray-4)]" />
            <div className="h-4 w-80 animate-pulse rounded bg-[var(--gray-3)]" />
          </div>
          <div className="h-8 w-32 animate-pulse rounded-lg bg-[var(--gray-4)]" />
        </div>
        <div className="flex justify-between border-b border-[var(--gray-6)] p-5">
          <div className="h-8 w-40 animate-pulse rounded bg-[var(--gray-3)]" />
          <div className="h-8 w-[480px] animate-pulse rounded bg-[var(--gray-3)]" />
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
