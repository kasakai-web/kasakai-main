export default function Home() {
  return (
    <section className="relative overflow-hidden px-6 py-16 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-black/10 bg-white/80 p-8 shadow-[0_20px_80px_-40px_rgba(0,0,0,0.45)] backdrop-blur sm:p-10 lg:p-14">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            User Portal
          </p>
          <h1 className="max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
            Welcome to Kasa Kai
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
            Your new portal is ready. Keep adding pages, features, and API integrations as your product grows.
          </p>
        </div>
      </div>
    </section>
  );
}
