"use client";

import { BanknotesIcon, PencilSquareIcon, PlusCircleIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import {
  saveSalesGoalAction,
  type SalesGoalActionState,
} from "@/app/(app)/configuracoes/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export type SalesGoal = {
  amount: number | string;
  effective_month: string;
  id: string;
  updated_at: string;
};

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(Number(value));
}

function maskCurrency(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (!digits) return "";
  return formatCurrency(Number(digits) / 100);
}

function ActionMessage({ state }: { state: SalesGoalActionState | null }) {
  if (!state) return null;
  return (
    <p
      className={`rounded-lg border px-3 py-2 text-sm ${
        state.ok
          ? "border-[var(--grass-6)] bg-[var(--grass-3)] text-[var(--grass-11)]"
          : "border-[var(--tomato-6)] bg-[var(--tomato-3)] text-[var(--tomato-11)]"
      }`}
      role={state.ok ? "status" : "alert"}
    >
      {state.message}
    </p>
  );
}

function SalesGoalDialog({
  currentGoal,
  onClose,
}: {
  currentGoal: SalesGoal | null;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveSalesGoalAction, null);
  const [amount, setAmount] = useState(() => currentGoal ? formatCurrency(currentGoal.amount) : "");

  useEffect(() => {
    if (state?.ok) onClose();
  }, [onClose, state]);

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{currentGoal ? "Editar meta mensal" : "Nova meta mensal"}</DialogTitle>
          <DialogDescription>
            Defina o objetivo mensal de vendas da central comercial. A alteração vale para o mês atual e os próximos.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="contents">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="sales-goal-amount">
              Valor da meta <span className="text-[var(--tomato-11)]">*</span>
            </label>
            <Input
              aria-describedby={state?.fieldErrors?.amount ? "sales-goal-amount-error" : undefined}
              aria-invalid={Boolean(state?.fieldErrors?.amount)}
              autoFocus
              id="sales-goal-amount"
              inputMode="decimal"
              name="amount"
              onChange={(event) => setAmount(maskCurrency(event.target.value))}
              placeholder="R$ 0,00"
              required
              value={amount}
            />
            {state?.fieldErrors?.amount ? (
              <p className="text-xs text-[var(--tomato-11)]" id="sales-goal-amount-error">
                {state.fieldErrors.amount}
              </p>
            ) : null}
          </div>

          <ActionMessage state={state} />

          <DialogFooter>
            <DialogClose disabled={pending} render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button disabled={pending} type="submit">
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SalesGoalPanel({
  currentGoal,
  initialError,
}: {
  currentGoal: SalesGoal | null;
  initialError?: string;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <section className="overflow-hidden rounded-lg bg-[var(--gray-1)]">
        <div className="border-b border-[var(--gray-6)] p-5">
          <h2 className="text-sm font-semibold">Metas</h2>
          <p className="text-sm text-[var(--gray-11)]">
            Defina o objetivo mensal de vendas da central comercial.
          </p>
        </div>

        <div className="p-5">
          <h3 className="text-sm font-semibold">Meta atual</h3>

          {initialError ? (
            <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-[var(--tomato-6)] bg-[var(--tomato-3)] p-4">
              <p className="text-sm text-[var(--tomato-11)]" role="alert">{initialError}</p>
              <Button onClick={() => router.refresh()} variant="outline">Tentar novamente</Button>
            </div>
          ) : currentGoal ? (
            <div className="mt-4 flex items-center justify-between gap-5 rounded-lg bg-[var(--gray-3)] p-5">
              <div className="flex min-w-0 items-center gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-4)] text-[var(--primary-11)]">
                  <BanknotesIcon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-[var(--gray-11)]">Meta mensal</p>
                  <p className="truncate text-2xl font-semibold">{formatCurrency(currentGoal.amount)}</p>
                </div>
              </div>
              <Button onClick={() => setDialogOpen(true)} variant="outline">
                <PencilSquareIcon />
                Editar
              </Button>
            </div>
          ) : (
            <div className="mt-4 flex items-center justify-between gap-5 rounded-lg border border-dashed border-[var(--gray-7)] p-5">
              <div>
                <p className="text-sm font-medium">Parece que ainda não há nenhuma meta mensal cadastrada</p>
                <p className="mt-1 text-sm text-[var(--gray-11)]">
                  Cadastre o objetivo global de vendas para o mês vigente.
                </p>
              </div>
              <Button onClick={() => setDialogOpen(true)}>
                <PlusCircleIcon />
                Nova meta
              </Button>
            </div>
          )}
        </div>
      </section>

      {dialogOpen ? (
        <SalesGoalDialog currentGoal={currentGoal} onClose={() => setDialogOpen(false)} />
      ) : null}
    </>
  );
}
