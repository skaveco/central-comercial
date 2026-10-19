export default function OpportunityDetailsLoading() {
  return (
    <main aria-label="Carregando detalhes da oportunidade" className="mx-auto w-full max-w-[970px] animate-pulse px-5 py-10">
      <div className="flex justify-between gap-6 border-b border-[var(--gray-5)] pb-4">
        <div><div className="h-8 w-72 rounded bg-[var(--gray-4)]" /><div className="mt-2 h-4 w-80 rounded bg-[var(--gray-4)]" /></div>
        <div className="h-8 w-80 rounded bg-[var(--gray-4)]" />
      </div>
      <div className="mt-3 h-12 bg-[var(--gray-3)]" />
      <div className="mt-3 h-10 bg-[var(--gray-3)]" />
      <div className="mt-5 grid grid-cols-[minmax(0,3fr)_minmax(360px,2fr)] gap-3">
        <div className="h-[720px] rounded-lg bg-[var(--gray-2)]" />
        <div className="grid content-start gap-3"><div className="h-40 rounded-lg bg-[var(--gray-3)]" /><div className="h-48 rounded-lg bg-[var(--gray-3)]" /><div className="h-44 rounded-lg bg-[var(--gray-3)]" /></div>
      </div>
    </main>
  );
}
