"use client";

import { CheckCircleIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";

import {
  moveOpportunityAction,
  type MoveOpportunityState,
} from "@/app/(app)/oportunidades/actions";
import type {
  CompanyOption,
  ContactOption,
  OpportunityCardItem,
  PipelineStage,
  ProductOption,
  ProfileOption,
  SimpleOption,
} from "@/components/opportunities/opportunities-pipeline";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type OpportunityMoveDialogProps = {
  companies: CompanyOption[];
  contacts: ContactOption[];
  lossReasons: SimpleOption[];
  onMoved: (message: string) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  opportunity: OpportunityCardItem;
  products: ProductOption[];
  profiles: ProfileOption[];
  qualificationParameters: SimpleOption[];
  requestKey: string;
  targetStage: PipelineStage;
};

const selectClassName = "mt-1 h-8 w-full rounded-lg border border-[var(--gray-6)] bg-[var(--gray-1)] px-2.5 text-sm outline-none focus:border-[var(--primary-8)] focus:ring-3 focus:ring-[var(--primary-8)]/50 aria-invalid:border-[var(--tomato-9)]";

function formatCurrency(value: number | string | null) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value ?? 0));
}

function maskCurrency(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits ? formatCurrency(Number(digits) / 100) : "";
}

function FieldError({ children }: { children?: string }) {
  return children ? <p className="mt-1 text-xs text-[var(--tomato-11)]">{children}</p> : null;
}

function WonConfetti() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-28 overflow-hidden rounded-t-xl">
      {Array.from({ length: 24 }, (_, index) => (
        <span
          className="opportunity-confetti absolute -top-3 size-2 rounded-[2px]"
          key={index}
          style={{
            animationDelay: `${(index % 8) * 90}ms`,
            backgroundColor: ["#c9e52f", "#f5a524", "#e5484d", "#8e4ec6", "#0091ff"][index % 5],
            left: `${4 + ((index * 37) % 92)}%`,
            rotate: `${(index * 29) % 180}deg`,
          }}
        />
      ))}
    </div>
  );
}

export function OpportunityMoveDialog({
  companies,
  contacts,
  lossReasons,
  onMoved,
  onOpenChange,
  open,
  opportunity,
  products,
  profiles,
  qualificationParameters,
  requestKey,
  targetStage,
}: OpportunityMoveDialogProps) {
  const router = useRouter();
  const [state, action, pending] = useActionState<MoveOpportunityState | null, FormData>(moveOpportunityAction, null);
  const [valueMode, setValueMode] = useState<"calculated" | "manual">(opportunity.value_mode);
  const [manualValue, setManualValue] = useState(
    opportunity.value_mode === "manual" && opportunity.final_value !== null
      ? formatCurrency(opportunity.final_value)
      : "",
  );
  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(opportunity.products.map((product) => [product.product_id, product.quantity])),
  );

  const closingProducts = useMemo(() => {
    const existing = new Map(opportunity.products.map((product) => [product.product_id, product]));
    const activeProducts = products.map((product) => {
      const linked = existing.get(product.id);
      return {
        id: product.id,
        name: linked?.name ?? product.name,
        unitPrice: linked?.unit_price ?? product.base_price,
        preservedPrice: Boolean(linked),
      };
    });
    for (const linked of opportunity.products) {
      if (!activeProducts.some((product) => product.id === linked.product_id)) {
        activeProducts.push({
          id: linked.product_id,
          name: linked.name,
          unitPrice: linked.unit_price,
          preservedPrice: true,
        });
      }
    }
    return activeProducts;
  }, [opportunity.products, products]);

  const calculatedTotal = closingProducts.reduce(
    (total, product) => total + Number(product.unitPrice) * (quantities[product.id] ?? 0),
    0,
  );
  const isWon = targetStage.code === "won";
  const isScheduled = targetStage.code === "scheduled";
  const needsTaskSchedule = ["scheduled", "diagnosis", "negotiation", "follow_up"].includes(targetStage.code);

  useEffect(() => {
    if (!state?.ok) return;
    onMoved(state.message);
    onOpenChange(false);
    router.refresh();
  }, [onMoved, onOpenChange, router, state]);

  function toggleProduct(productId: string, checked: boolean) {
    setQuantities((current) => {
      const next = { ...current };
      if (checked) next[productId] = next[productId] || 1;
      else delete next[productId];
      return next;
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] grid-rows-[auto_minmax(0,1fr)] overflow-hidden sm:max-w-[680px]">
        {isWon ? <WonConfetti /> : null}
        <DialogHeader className={isWon ? "relative pt-3" : undefined}>
          <DialogTitle className="text-xl leading-8 font-semibold">
            {isWon ? "Confirmar venda ganha" : `Mover para ${targetStage.name}`}
          </DialogTitle>
          <DialogDescription>
            {isWon
              ? "Revise os dados de fechamento. Ao confirmar, a venda sai do funil e inicia o Onboarding."
              : `Confirme a movimentação de “${opportunity.name}”.`}
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="flex min-h-0 flex-col">
          <input name="requestKey" type="hidden" value={requestKey} />
          <input name="opportunityId" type="hidden" value={opportunity.id} />
          <input name="targetStageId" type="hidden" value={targetStage.id} />

          <div className="grid min-h-0 grid-cols-2 gap-4 overflow-y-auto px-0.5 pb-5">
            {state && !state.ok ? (
              <div className="col-span-2 rounded-lg border border-[var(--tomato-6)] bg-[var(--tomato-3)] px-3 py-2 text-sm text-[var(--tomato-11)]" role="alert">
                {state.message}
              </div>
            ) : null}

            {targetStage.code === "disqualified" ? (
              <p className="col-span-2 rounded-lg bg-[var(--gray-3)] p-3 text-sm">
                A oportunidade será encerrada como desqualificada e ficará disponível no Histórico.
              </p>
            ) : null}

            {targetStage.code === "no_response" ? (
              <label className="col-span-2 text-sm font-medium">
                Observação de encerramento
                <Textarea className="mt-1 min-h-20" name="closureNote" placeholder="Opcional" />
              </label>
            ) : null}

            {targetStage.code === "lost" ? (
              <label className="col-span-2 text-sm font-medium">
                Motivo da perda <span className="text-[var(--tomato-11)]">*</span>
                <select aria-invalid={Boolean(state?.fieldErrors?.lossReasonId)} className={selectClassName} name="lossReasonId" required>
                  <option value="">Selecione um motivo</option>
                  {lossReasons.map((reason) => <option key={reason.id} value={reason.id}>{reason.name}</option>)}
                </select>
                <FieldError>{state?.fieldErrors?.lossReasonId}</FieldError>
              </label>
            ) : null}

            {isScheduled ? (
              <>
                <label className="col-span-2 text-sm font-medium">
                  Responsável em Venda <span className="text-[var(--tomato-11)]">*</span>
                  <select aria-invalid={Boolean(state?.fieldErrors?.responsibleId)} className={selectClassName} defaultValue={opportunity.responsible_id} name="responsibleId" required>
                    <option value="">Selecione um responsável</option>
                    {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
                  </select>
                  <FieldError>{state?.fieldErrors?.responsibleId}</FieldError>
                </label>

                <fieldset className="col-span-2 rounded-lg border border-[var(--gray-6)] p-3">
                  <legend className="px-1 text-sm font-medium">Qualificação <span className="text-[var(--tomato-11)]">*</span></legend>
                  <p className="mb-2 text-xs text-[var(--gray-11)]">Responda ao menos dois parâmetros. Respostas negativas também contam.</p>
                  {qualificationParameters.map((parameter) => {
                    const currentAnswer = opportunity.qualification_answers.find((answer) => answer.parameter_id === parameter.id)?.answer;
                    return (
                      <div className="flex items-center justify-between gap-4 border-t border-[var(--gray-5)] py-2 first:border-0" key={parameter.id}>
                        <input name="qualificationParameterId" type="hidden" value={parameter.id} />
                        <span className="text-sm">{parameter.name}</span>
                        <div className="flex gap-3">
                          <label className="flex items-center gap-1.5 text-sm"><input defaultChecked={currentAnswer === true} name={`qualification:${parameter.id}`} type="radio" value="true" /> Sim</label>
                          <label className="flex items-center gap-1.5 text-sm"><input defaultChecked={currentAnswer === false} name={`qualification:${parameter.id}`} type="radio" value="false" /> Não</label>
                        </div>
                      </div>
                    );
                  })}
                  {!qualificationParameters.length ? <p className="text-sm text-[var(--amber-11)]">Nenhum parâmetro ativo cadastrado.</p> : null}
                  <FieldError>{state?.fieldErrors?.qualification}</FieldError>
                </fieldset>
              </>
            ) : null}

            {isWon ? (
              <>
                <label className="text-sm font-medium">
                  Empresa <span className="text-[var(--tomato-11)]">*</span>
                  <select aria-invalid={Boolean(state?.fieldErrors?.companyId)} className={selectClassName} defaultValue={opportunity.company_id ?? ""} name="companyId" required>
                    <option value="">Selecione uma empresa</option>
                    {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                  </select>
                  <FieldError>{state?.fieldErrors?.companyId}</FieldError>
                </label>
                <label className="text-sm font-medium">
                  Contato <span className="text-[var(--tomato-11)]">*</span>
                  <select aria-invalid={Boolean(state?.fieldErrors?.contactId)} className={selectClassName} defaultValue={opportunity.contact_id ?? ""} name="contactId" required>
                    <option value="">Selecione um contato</option>
                    {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}</option>)}
                  </select>
                  <FieldError>{state?.fieldErrors?.contactId}</FieldError>
                </label>
                <label className="col-span-2 text-sm font-medium">
                  Vendedor responsável <span className="text-[var(--tomato-11)]">*</span>
                  <select aria-invalid={Boolean(state?.fieldErrors?.responsibleId)} className={selectClassName} defaultValue={opportunity.responsible_id} name="responsibleId" required>
                    <option value="">Selecione um responsável</option>
                    {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
                  </select>
                  <FieldError>{state?.fieldErrors?.responsibleId}</FieldError>
                </label>

                <fieldset className="col-span-2 rounded-lg border border-[var(--gray-6)] p-3">
                  <legend className="px-1 text-sm font-medium">Produtos <span className="text-[var(--tomato-11)]">*</span></legend>
                  <div className="grid gap-2">
                    {closingProducts.map((product) => {
                      const selected = Boolean(quantities[product.id]);
                      return (
                        <div className="flex items-center gap-3 rounded-md bg-[var(--gray-2)] px-3 py-2" key={product.id}>
                          <input checked={selected} className="size-4 accent-[var(--primary-9)]" name="productId" onChange={(event) => toggleProduct(product.id, event.target.checked)} type="checkbox" value={product.id} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{product.name}</p>
                            <p className="text-xs text-[var(--gray-11)]">
                              {formatCurrency(product.unitPrice)}{product.preservedPrice ? " · preço preservado" : ""}
                            </p>
                          </div>
                          <label className="flex items-center gap-2 text-xs text-[var(--gray-11)]">
                            Qtd.
                            <Input className="w-16" disabled={!selected} min={1} name={`quantity:${product.id}`} onChange={(event) => setQuantities((current) => ({ ...current, [product.id]: Number(event.target.value) }))} step={1} type="number" value={selected ? quantities[product.id] : ""} />
                          </label>
                        </div>
                      );
                    })}
                    {!closingProducts.length ? <p className="text-sm text-[var(--amber-11)]">Nenhum produto com valor disponível.</p> : null}
                  </div>
                  <FieldError>{state?.fieldErrors?.products}</FieldError>

                  <div className="mt-3 grid grid-cols-2 gap-3 border-t border-[var(--gray-6)] pt-3">
                    <label className="text-sm font-medium">
                      Tipo de valor
                      <select className={selectClassName} name="valueMode" onChange={(event) => setValueMode(event.target.value as "calculated" | "manual")} value={valueMode}>
                        <option value="calculated">Calculado pelos produtos</option>
                        <option value="manual">Total ajustado manualmente</option>
                      </select>
                    </label>
                    {valueMode === "manual" ? (
                      <label className="text-sm font-medium">
                        Valor final <span className="text-[var(--tomato-11)]">*</span>
                        <Input aria-invalid={Boolean(state?.fieldErrors?.finalValue)} className="mt-1" inputMode="decimal" name="finalValue" onChange={(event) => setManualValue(maskCurrency(event.target.value))} placeholder="R$ 0,00" required value={manualValue} />
                        <FieldError>{state?.fieldErrors?.finalValue}</FieldError>
                      </label>
                    ) : (
                      <div className="text-sm font-medium">
                        Total calculado
                        <p className="mt-1 flex h-8 items-center text-base">{formatCurrency(calculatedTotal)}</p>
                      </div>
                    )}
                  </div>
                </fieldset>
              </>
            ) : null}

            {needsTaskSchedule ? (
              <fieldset className="col-span-2 grid grid-cols-2 gap-3 rounded-lg border border-[var(--gray-6)] p-3">
                <legend className="px-1 text-sm font-medium">Próxima tarefa</legend>
                <label className="text-sm font-medium">
                  Data <span className="text-[var(--tomato-11)]">*</span>
                  <Input aria-invalid={Boolean(state?.fieldErrors?.taskDueDate)} className="mt-1" name="taskDueDate" required type="date" />
                  <FieldError>{state?.fieldErrors?.taskDueDate}</FieldError>
                </label>
                <label className="text-sm font-medium">
                  Horário <span className="text-[var(--tomato-11)]">*</span>
                  <Input aria-invalid={Boolean(state?.fieldErrors?.taskDueTime)} className="mt-1" name="taskDueTime" required type="time" />
                  <FieldError>{state?.fieldErrors?.taskDueTime}</FieldError>
                </label>
                <label className="col-span-2 text-sm font-medium">
                  Nota
                  <Textarea className="mt-1 min-h-16" name="taskNote" placeholder="Contexto para a próxima atividade" />
                </label>
              </fieldset>
            ) : null}

            {!isWon && !isScheduled && !needsTaskSchedule && !["lost", "disqualified", "no_response"].includes(targetStage.code) ? (
              <p className="col-span-2 flex items-center gap-2 rounded-lg bg-[var(--gray-3)] p-3 text-sm">
                <CheckCircleIcon className="size-5 text-[var(--grass-10)]" />
                A movimentação será registrada no histórico de atividades.
              </p>
            ) : null}
          </div>

          <DialogFooter className="mt-auto shrink-0">
            <Button disabled={pending} onClick={() => onOpenChange(false)} type="button" variant="outline">Cancelar</Button>
            <Button disabled={pending || (isWon && !closingProducts.length)} type="submit">
              {pending ? "Salvando..." : isWon ? "Confirmar ganho" : "Confirmar movimentação"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
