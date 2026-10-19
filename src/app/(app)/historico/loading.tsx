export default function HistoryLoading() {
  return (
    <main className="mx-auto w-full max-w-[1440px] animate-pulse p-5" aria-label="Carregando Histórico">
      <div className="h-7 w-32 rounded bg-[var(--gray-4)]" />
      <div className="mt-2 h-4 w-96 rounded bg-[var(--gray-4)]" />
      <section className="mt-4 overflow-hidden rounded-lg bg-[var(--gray-1)] p-5">
        <div className="flex justify-between"><div className="h-8 w-72 rounded bg-[var(--gray-4)]" /><div className="h-8 w-80 rounded bg-[var(--gray-4)]" /></div>
        <div className="mt-14 grid gap-3">{Array.from({ length: 7 }, (_, index) => <div className="h-10 rounded bg-[var(--gray-3)]" key={index} />)}</div>
      </section>
    </main>
  );
}
