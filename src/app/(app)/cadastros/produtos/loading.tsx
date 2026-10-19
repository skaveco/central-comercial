export default function ProductsLoading() {
  return (
    <main aria-busy="true" aria-label="Carregando catálogo" className="mx-auto w-full max-w-[1440px] animate-pulse p-5">
      <div className="mb-4 h-14 w-80 rounded-lg bg-[var(--gray-4)]" />
      <div className="mb-2 h-14 rounded-lg bg-[var(--gray-4)]" />
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 6 }, (_, index) => <div className="h-[170px] rounded-lg bg-[var(--gray-4)]" key={index} />)}
      </div>
    </main>
  );
}
