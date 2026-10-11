import Link from "next/link";
import type { ReactNode } from "react";

type AuthShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({ title, description, children, footer }: AuthShellProps) {
  return (
    <main className="grid min-h-dvh bg-[var(--gray-3)] lg:grid-cols-[minmax(320px,0.9fr)_minmax(480px,1.1fr)]">
      <section className="hidden min-h-dvh flex-col justify-between bg-[var(--primary-3)] p-10 lg:flex xl:p-14">
        <Link
          className="w-fit rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary-8)]"
          href="/login"
        >
          <span className="block text-[18px] leading-7 font-bold text-[var(--primary-12)]">SKV</span>
          <span className="block text-sm leading-5 text-[var(--primary-11)]">Central Comercial</span>
        </Link>

        <div className="max-w-lg">
          <p className="mb-4 text-sm leading-5 font-semibold tracking-[0.08em] text-[var(--primary-11)] uppercase">
            Gestão comercial Skave
          </p>
          <p className="text-[36px] leading-[48px] font-semibold text-[var(--primary-12)]">
            O trabalho comercial organizado em um só lugar.
          </p>
          <p className="mt-4 max-w-md text-base leading-6 text-[var(--primary-11)]">
            Acompanhe oportunidades, tarefas e resultados com um processo claro para toda a equipe.
          </p>
        </div>

        <p className="text-sm leading-5 text-[var(--primary-11)]">Uso interno da Skave</p>
      </section>

      <section className="flex min-h-dvh items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[420px]">
          <div className="mb-10 lg:hidden">
            <span className="block text-[18px] leading-7 font-bold text-[var(--gray-12)]">SKV</span>
            <span className="block text-sm leading-5 text-[var(--gray-11)]">Central Comercial</span>
          </div>

          <div className="rounded-[12px] border border-[var(--gray-6)] bg-[var(--gray-1)] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-8">
            <header className="mb-7">
              <h1 className="text-[24px] leading-9 font-semibold text-[var(--gray-12)]">{title}</h1>
              <p className="mt-1 text-sm leading-5 text-[var(--gray-11)]">{description}</p>
            </header>

            {children}

            {footer ? (
              <footer className="mt-6 border-t border-[var(--gray-5)] pt-6 text-center text-sm leading-5 text-[var(--gray-11)]">
                {footer}
              </footer>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
