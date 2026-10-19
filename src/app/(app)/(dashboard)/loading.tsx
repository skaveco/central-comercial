export default function DashboardLoading() {
  return (
    <main className="mx-auto w-full max-w-[1440px] animate-pulse p-5">
      <div className="mb-5 h-8 w-40 rounded bg-[var(--gray-4)]" />
      <div className="mb-4 h-16 rounded-xl bg-[var(--gray-3)]" />
      <div className="mb-4 grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }, (_, index) => <div className="h-32 rounded-xl bg-[var(--gray-3)]" key={index} />)}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }, (_, index) => <div className="h-80 rounded-xl bg-[var(--gray-3)]" key={index} />)}
      </div>
    </main>
  );
}
