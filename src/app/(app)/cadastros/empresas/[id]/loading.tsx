export default function CompanyDetailsLoading() {
  return (
    <main className="mx-auto w-full max-w-[1440px] p-5" aria-busy="true" aria-label="Carregando detalhes da empresa">
      <div className="mb-4 flex justify-between">
        <div className="space-y-2"><div className="h-7 w-48 animate-pulse rounded bg-[var(--gray-4)]" /><div className="h-4 w-36 animate-pulse rounded bg-[var(--gray-3)]" /></div>
        <div className="h-8 w-96 animate-pulse rounded bg-[var(--gray-3)]" />
      </div>
      <div className="grid grid-cols-4 gap-3">{Array.from({ length: 4 }, (_, index) => <div className="h-[116px] animate-pulse rounded-lg bg-[var(--gray-1)]" key={index} />)}</div>
      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_350px]">
        <div className="space-y-3">{Array.from({ length: 4 }, (_, index) => <div className="h-56 animate-pulse rounded-lg bg-[var(--gray-1)]" key={index} />)}</div>
        <div className="h-[620px] animate-pulse rounded-lg bg-[var(--gray-1)]" />
      </div>
    </main>
  );
}
