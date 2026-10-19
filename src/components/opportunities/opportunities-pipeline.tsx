"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  ArrowRightIcon,
  Bars3Icon,
  BriefcaseIcon,
  MagnifyingGlassIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useState } from "react";

import { createOpportunityAction } from "@/app/(app)/oportunidades/actions";
import { OpportunityMoveDialog } from "@/components/opportunities/opportunity-move-dialog";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type AppRole = "admin" | "pre_sales" | "commercial";
type PipelineCode = "pre_sales" | "sales" | "post_sales";

export type PipelineStage = {
  id: string;
  pipeline_id: string;
  code: string;
  name: string;
  sort_order: number;
  is_terminal_action: boolean;
};

export type OpportunityPipeline = {
  id: string;
  code: PipelineCode;
  name: string;
  sort_order: number;
  stages: PipelineStage[];
};

export type OpportunityCardItem = {
  id: string;
  name: string;
  current_stage_id: string | null;
  company_id: string | null;
  contact_id: string | null;
  responsible_id: string;
  value_mode: "calculated" | "manual";
  final_value: number | string | null;
  created_at: string;
  company_name: string | null;
  contact_name: string | null;
  responsible_name: string;
  products: Array<{
    product_id: string;
    name: string;
    quantity: number;
    unit_price: number | string;
  }>;
  qualification_answers: Array<{ parameter_id: string; answer: boolean }>;
};

export type SimpleOption = { id: string; name: string };
export type CompanyOption = SimpleOption;
export type ContactOption = SimpleOption;
export type ProfileOption = SimpleOption & { role: AppRole };
export type ProductOption = SimpleOption & {
  base_price: number | string;
  category: { name: string } | null;
};

type PipelineProps = {
  actor: { id: string; name: string; role: AppRole };
  companies: CompanyOption[];
  contacts: ContactOption[];
  error?: string;
  hiddenStageIds: string[];
  lossReasons: SimpleOption[];
  opportunities: OpportunityCardItem[];
  pipelines: OpportunityPipeline[];
  products: ProductOption[];
  profiles: ProfileOption[];
  qualificationParameters: SimpleOption[];
  query: string;
  selectedPipelineCode: PipelineCode;
  sources: SimpleOption[];
};

const selectClassName = "mt-1 h-8 w-full rounded-lg border border-[var(--gray-6)] bg-[var(--gray-1)] px-2.5 text-sm outline-none focus:border-[var(--primary-8)] focus:ring-3 focus:ring-[var(--primary-8)]/50 aria-invalid:border-[var(--tomato-9)]";
const descriptions: Record<PipelineCode, string> = {
  pre_sales: "Acompanhe os primeiros contatos e avance as oportunidades até o agendamento.",
  sales: "Acompanhe as negociações qualificadas da descoberta ao fechamento.",
  post_sales: "Acompanhe a jornada do cliente depois da contratação.",
};

const terminalDestinations: Record<string, string> = {
  no_response: "A oportunidade é arquivada no Histórico.",
  disqualified: "A oportunidade é encerrada como desqualificada.",
  scheduled: "A oportunidade segue para Venda · Diagnóstico.",
  won: "A venda segue para Pós-venda · Onboarding.",
  lost: "A oportunidade é encerrada no Histórico.",
};

function formatCurrency(value: number | string | null) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value ?? 0));
}

function maskCurrency(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits ? formatCurrency(Number(digits) / 100) : "";
}

function roleCanAccessPipeline(role: AppRole, pipeline: PipelineCode) {
  return role === "admin" || pipeline !== "post_sales" || role === "commercial";
}

function FieldError({ children }: { children?: string }) {
  return children ? <p className="mt-1 text-xs text-[var(--tomato-11)]">{children}</p> : null;
}

function OpportunityFormDialog({
  actor,
  companies,
  contacts,
  lossReasons,
  onCreated,
  onOpenChange,
  open,
  pipelines,
  products,
  profiles,
  qualificationParameters,
  selectedPipelineCode,
  sources,
  requestKey,
}: Omit<PipelineProps, "error" | "hiddenStageIds" | "opportunities" | "query"> & {
  onCreated: (message: string) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  requestKey: string;
}) {
  const router = useRouter();
  const initialPipeline = pipelines.find((pipeline) => pipeline.code === selectedPipelineCode) ?? pipelines[0];
  const [state, action, pending] = useActionState(createOpportunityAction, null);
  const [dirty, setDirty] = useState(false);
  const [pipelineId, setPipelineId] = useState(initialPipeline?.id ?? "");
  const [stageId, setStageId] = useState("");
  const [valueMode, setValueMode] = useState<"calculated" | "manual">("calculated");
  const [manualValue, setManualValue] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const selectedPipeline = pipelines.find((pipeline) => pipeline.id === pipelineId) ?? initialPipeline;
  const selectedStage = selectedPipeline?.stages.find((stage) => stage.id === stageId);
  const availableProfiles = profiles.filter((profile) => selectedPipeline && roleCanAccessPipeline(profile.role, selectedPipeline.code));
  const defaultResponsibleId = availableProfiles.some((profile) => profile.id === actor.id) ? actor.id : "";
  const selectedProducts = products.filter((product) => quantities[product.id]);
  const calculatedTotal = selectedProducts.reduce(
    (total, product) => total + Number(product.base_price) * quantities[product.id],
    0,
  );
  const needsQualification = selectedPipeline?.code === "sales" || selectedPipeline?.code === "post_sales" || selectedStage?.code === "scheduled";
  const needsWonData = selectedPipeline?.code === "post_sales" || selectedStage?.code === "won";
  const needsTaskSchedule = ["scheduled", "diagnosis", "negotiation", "follow_up"].includes(selectedStage?.code ?? "");
  const blockedReason = needsQualification && qualificationParameters.length < 2
    ? "Cadastre ao menos dois parâmetros de qualificação ativos em Configurações para usar este destino."
    : needsWonData && products.length === 0
      ? "Cadastre um produto ativo com valor base antes de criar uma oportunidade em Ganho ou Pós-venda."
      : null;

  useEffect(() => {
    if (!state?.ok) return;
    onCreated(state.message);
    router.refresh();
  }, [onCreated, router, state]);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && dirty && !state?.ok && !window.confirm("Descartar os dados desta oportunidade?")) return;
    onOpenChange(nextOpen);
  }

  function changePipeline(nextPipelineId: string) {
    setPipelineId(nextPipelineId);
    setStageId("");
    setDirty(true);
  }

  function toggleProduct(productId: string, checked: boolean) {
    setQuantities((current) => {
      const next = { ...current };
      if (checked) next[productId] = next[productId] || 1;
      else delete next[productId];
      return next;
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] grid-rows-[auto_minmax(0,1fr)] overflow-hidden sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle className="text-xl leading-8 font-semibold">Nova oportunidade</DialogTitle>
          <DialogDescription>Defina o destino e preencha os dados da negociação. Campos adicionais aparecem conforme a etapa.</DialogDescription>
        </DialogHeader>

        <form action={action} className="flex min-h-0 flex-col" onChange={() => setDirty(true)}>
          <input name="requestKey" type="hidden" value={requestKey} />
          <div className="grid min-h-0 grid-cols-2 gap-4 overflow-y-auto px-0.5 pb-5">
            {state && !state.ok ? (
              <div className="col-span-2 rounded-lg border border-[var(--tomato-6)] bg-[var(--tomato-3)] px-3 py-2 text-sm text-[var(--tomato-11)]" role="alert">
                {state.message}
              </div>
            ) : null}

            <label className="col-span-2 text-sm font-medium">
              Nome <span className="text-[var(--tomato-11)]">*</span>
              <Input aria-invalid={Boolean(state?.fieldErrors?.name)} className="mt-1" name="name" placeholder="Ex.: Novo website institucional" required />
              <FieldError>{state?.fieldErrors?.name}</FieldError>
            </label>

            <label className="text-sm font-medium">
              Funil <span className="text-[var(--tomato-11)]">*</span>
              <select aria-invalid={Boolean(state?.fieldErrors?.pipelineId)} className={selectClassName} name="pipelineId" onChange={(event) => changePipeline(event.target.value)} required value={pipelineId}>
                {pipelines.map((pipeline) => <option key={pipeline.id} value={pipeline.id}>{pipeline.name}</option>)}
              </select>
              <FieldError>{state?.fieldErrors?.pipelineId}</FieldError>
            </label>

            <label className="text-sm font-medium">
              Etapa <span className="text-[var(--tomato-11)]">*</span>
              <select aria-invalid={Boolean(state?.fieldErrors?.stageId)} className={selectClassName} name="stageId" onChange={(event) => setStageId(event.target.value)} required value={stageId}>
                <option value="">Selecione uma etapa</option>
                {selectedPipeline?.stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
              </select>
              <FieldError>{state?.fieldErrors?.stageId}</FieldError>
            </label>

            <label className="col-span-2 text-sm font-medium">
              Responsável <span className="text-[var(--tomato-11)]">*</span>
              <select aria-invalid={Boolean(state?.fieldErrors?.responsibleId)} className={selectClassName} defaultValue={defaultResponsibleId} key={`${pipelineId}-${defaultResponsibleId}`} name="responsibleId" required>
                <option value="">Selecione um responsável</option>
                {availableProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
              </select>
              <FieldError>{state?.fieldErrors?.responsibleId}</FieldError>
            </label>

            <label className="text-sm font-medium">
              Empresa
              <select aria-invalid={Boolean(state?.fieldErrors?.companyId)} className={selectClassName} name="companyId">
                <option value="">Sem empresa</option>
                {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
              </select>
              <FieldError>{state?.fieldErrors?.companyId}</FieldError>
            </label>

            <label className="text-sm font-medium">
              Contato
              <select aria-invalid={Boolean(state?.fieldErrors?.contactId)} className={selectClassName} name="contactId">
                <option value="">Sem contato</option>
                {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}</option>)}
              </select>
              <FieldError>{state?.fieldErrors?.contactId}</FieldError>
            </label>

            <label className="text-sm font-medium">
              Origem
              <select aria-invalid={Boolean(state?.fieldErrors?.sourceId)} className={selectClassName} name="sourceId">
                <option value="">Sem origem</option>
                {sources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}
              </select>
              <FieldError>{state?.fieldErrors?.sourceId}</FieldError>
            </label>

            <label className="text-sm font-medium">
              Previsão de fechamento
              <Input className="mt-1" name="expectedCloseDate" type="date" />
            </label>

            <label className="col-span-2 text-sm font-medium">
              Descrição
              <Textarea className="mt-1 min-h-20" name="description" placeholder="Contexto e observações da oportunidade" />
            </label>

            <fieldset className="col-span-2 rounded-lg border border-[var(--gray-6)] p-3">
              <legend className="px-1 text-sm font-medium">Produtos e valor</legend>
              {products.length ? (
                <div className="mt-1 grid gap-2">
                  {products.map((product) => {
                    const selected = Boolean(quantities[product.id]);
                    return (
                      <div className="flex items-center gap-3 rounded-md bg-[var(--gray-2)] px-3 py-2" key={product.id}>
                        <input checked={selected} className="size-4 accent-[var(--primary-9)]" name="productId" onChange={(event) => toggleProduct(product.id, event.target.checked)} type="checkbox" value={product.id} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{product.name}</p>
                          <p className="text-xs text-[var(--gray-11)]">{product.category?.name ?? "Sem categoria"} · {formatCurrency(product.base_price)}</p>
                        </div>
                        <label className="flex items-center gap-2 text-xs text-[var(--gray-11)]">
                          Qtd.
                          <Input className="w-16" disabled={!selected} min={1} name={`quantity:${product.id}`} onChange={(event) => setQuantities((current) => ({ ...current, [product.id]: Number(event.target.value) }))} step={1} type="number" value={selected ? quantities[product.id] : ""} />
                        </label>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="mt-1 text-sm text-[var(--gray-11)]">Nenhum produto ativo com valor base disponível.</p>}
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
                    Valor final
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

            {needsQualification ? (
              <fieldset className="col-span-2 rounded-lg border border-[var(--gray-6)] p-3">
                <legend className="px-1 text-sm font-medium">Qualificação <span className="text-[var(--tomato-11)]">*</span></legend>
                <p className="mb-3 text-xs text-[var(--gray-11)]">Responda ao menos dois parâmetros. Respostas negativas também são válidas.</p>
                {qualificationParameters.length ? qualificationParameters.map((parameter) => (
                  <div className="flex items-center justify-between gap-4 border-t border-[var(--gray-5)] py-2 first:border-0" key={parameter.id}>
                    <input name="qualificationParameterId" type="hidden" value={parameter.id} />
                    <span className="text-sm">{parameter.name}</span>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-1.5 text-sm"><input name={`qualification:${parameter.id}`} type="radio" value="true" /> Sim</label>
                      <label className="flex items-center gap-1.5 text-sm"><input name={`qualification:${parameter.id}`} type="radio" value="false" /> Não</label>
                    </div>
                  </div>
                )) : <p className="rounded-md bg-[var(--amber-3)] p-2 text-sm text-[var(--amber-12)]">Nenhum parâmetro ativo cadastrado.</p>}
                <FieldError>{state?.fieldErrors?.qualification}</FieldError>
              </fieldset>
            ) : null}

            {selectedStage?.code === "lost" ? (
              <label className="col-span-2 text-sm font-medium">
                Motivo da perda <span className="text-[var(--tomato-11)]">*</span>
                <select aria-invalid={Boolean(state?.fieldErrors?.lossReasonId)} className={selectClassName} name="lossReasonId" required>
                  <option value="">Selecione um motivo</option>
                  {lossReasons.map((reason) => <option key={reason.id} value={reason.id}>{reason.name}</option>)}
                </select>
                <FieldError>{state?.fieldErrors?.lossReasonId}</FieldError>
              </label>
            ) : null}

            {selectedStage?.code === "no_response" ? (
              <label className="col-span-2 text-sm font-medium">Observação de encerramento<Textarea className="mt-1 min-h-20" name="closureNote" /></label>
            ) : null}

            {needsTaskSchedule ? (
              <fieldset className="col-span-2 grid grid-cols-2 gap-3 rounded-lg border border-[var(--gray-6)] p-3">
                <legend className="px-1 text-sm font-medium">Próxima tarefa</legend>
                <label className="text-sm font-medium">Data <span className="text-[var(--tomato-11)]">*</span><Input aria-invalid={Boolean(state?.fieldErrors?.taskDueDate)} className="mt-1" name="taskDueDate" required type="date" /><FieldError>{state?.fieldErrors?.taskDueDate}</FieldError></label>
                <label className="text-sm font-medium">Horário <span className="text-[var(--tomato-11)]">*</span><Input aria-invalid={Boolean(state?.fieldErrors?.taskDueTime)} className="mt-1" name="taskDueTime" required type="time" /><FieldError>{state?.fieldErrors?.taskDueTime}</FieldError></label>
                <label className="col-span-2 text-sm font-medium">Nota<Textarea className="mt-1 min-h-16" name="taskNote" placeholder="Contexto para a próxima atividade" /></label>
              </fieldset>
            ) : null}

            {blockedReason ? <p className="col-span-2 rounded-lg border border-[var(--amber-6)] bg-[var(--amber-3)] px-3 py-2 text-sm text-[var(--amber-12)]">{blockedReason}</p> : null}
          </div>

          <DialogFooter className="mt-auto shrink-0">
            <Button disabled={pending} onClick={() => handleOpenChange(false)} type="button" variant="outline">Cancelar</Button>
            <Button disabled={pending || Boolean(blockedReason) || !requestKey} type="submit">{pending ? "Criando..." : "Criar oportunidade"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function OpportunityCardPreview({ opportunity }: { opportunity: OpportunityCardItem }) {
  return (
    <article className="w-[242px] rounded-lg border border-[var(--primary-8)] bg-[var(--gray-1)] p-3 shadow-lg">
      <h3 className="line-clamp-2 text-sm font-semibold">{opportunity.name}</h3>
      <p className="mt-1 truncate text-xs text-[var(--gray-11)]">{opportunity.company_name ?? opportunity.contact_name ?? "Sem empresa ou contato"}</p>
      <p className="mt-3 text-base font-semibold">{formatCurrency(opportunity.final_value)}</p>
      <div className="mt-3 border-t border-[var(--gray-5)] pt-2 text-xs text-[var(--gray-11)]">
        {opportunity.responsible_name}
      </div>
    </article>
  );
}

function OpportunityCard({ opportunity }: { opportunity: OpportunityCardItem }) {
  const { attributes, isDragging, listeners, setNodeRef, transform } = useDraggable({
    id: opportunity.id,
    data: { opportunity },
  });

  return (
    <article
      className={`relative rounded-lg border border-[var(--gray-5)] bg-[var(--gray-1)] shadow-xs transition-shadow hover:border-[var(--gray-7)] hover:shadow-sm ${isDragging ? "opacity-35" : ""}`}
      ref={setNodeRef}
      style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined }}
    >
      <Link className="block rounded-lg p-3 pr-9 outline-none focus-visible:ring-3 focus-visible:ring-[var(--primary-8)]/50" href={`/oportunidades/${opportunity.id}`}>
        <h3 className="line-clamp-2 text-sm font-semibold">{opportunity.name}</h3>
        <p className="mt-1 truncate text-xs text-[var(--gray-11)]">{opportunity.company_name ?? opportunity.contact_name ?? "Sem empresa ou contato"}</p>
        <p className="mt-3 text-base font-semibold">{formatCurrency(opportunity.final_value)}</p>
        <div className="mt-3 border-t border-[var(--gray-5)] pt-2 text-xs text-[var(--gray-11)]">
          {opportunity.responsible_name}
        </div>
      </Link>
      <button
        {...attributes}
        {...listeners}
        aria-label={`Mover ${opportunity.name}`}
        className="absolute top-2 right-2 flex size-7 cursor-grab items-center justify-center rounded-md text-[var(--gray-10)] outline-none hover:bg-[var(--gray-3)] hover:text-[var(--gray-12)] focus-visible:ring-3 focus-visible:ring-[var(--primary-8)]/50 active:cursor-grabbing"
        type="button"
      >
        <Bars3Icon className="size-4" />
      </button>
    </article>
  );
}

function PipelineColumn({
  opportunities,
  stage,
}: {
  opportunities: OpportunityCardItem[];
  stage: PipelineStage;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: stage.id, data: { stage } });
  const stageTotal = opportunities.reduce((total, opportunity) => total + Number(opportunity.final_value ?? 0), 0);

  return (
    <section
      className={`w-[258px] rounded-lg border p-2 transition-colors ${isOver ? "border-[var(--primary-8)] bg-[var(--primary-3)]" : "border-transparent bg-[var(--gray-3)]"}`}
      ref={setNodeRef}
    >
      <header className="mb-2 px-1 py-1">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{stage.name}</h2>
          <span className="flex min-w-5 items-center justify-center rounded-full bg-[var(--gray-5)] px-1.5 text-xs leading-5">{opportunities.length}</span>
        </div>
        <p className="mt-0.5 text-xs text-[var(--gray-11)]">{formatCurrency(stageTotal)}</p>
      </header>
      <div className="grid min-h-24 gap-2">
        {stage.is_terminal_action ? (
          <div className="rounded-lg border border-dashed border-[var(--gray-7)] bg-[var(--gray-2)] p-3 text-xs text-[var(--gray-11)]">
            <BriefcaseIcon className="mb-2 size-4" />
            <p>{terminalDestinations[stage.code] ?? "Ação de encerramento do funil."}</p>
            <ArrowRightIcon className="mt-2 size-4" />
          </div>
        ) : opportunities.length ? opportunities.map((opportunity) => (
          <OpportunityCard key={opportunity.id} opportunity={opportunity} />
        )) : (
          <div className="rounded-lg border border-dashed border-[var(--gray-6)] px-3 py-8 text-center text-xs text-[var(--gray-10)]">Nenhuma oportunidade</div>
        )}
      </div>
    </section>
  );
}

export function OpportunitiesPipeline(props: PipelineProps) {
  const router = useRouter();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSession, setDialogSession] = useState(0);
  const [requestKey, setRequestKey] = useState("");
  const [moveRequestKey, setMoveRequestKey] = useState("");
  const [movementSession, setMovementSession] = useState(0);
  const [movement, setMovement] = useState<{ opportunity: OpportunityCardItem; stage: PipelineStage } | null>(null);
  const [draggedOpportunity, setDraggedOpportunity] = useState<OpportunityCardItem | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const selectedPipeline = props.pipelines.find((pipeline) => pipeline.code === props.selectedPipelineCode) ?? props.pipelines[0];
  const visibleStages = selectedPipeline.stages.filter((stage) => !props.hiddenStageIds.includes(stage.id));
  const currentHiddenStageCount = selectedPipeline.stages.length - visibleStages.length;
  const pipelineTotal = props.opportunities.reduce((total, opportunity) => total + Number(opportunity.final_value ?? 0), 0);

  const handleCreated = useCallback((message: string) => {
    setDialogOpen(false);
    setSuccessMessage(message);
  }, []);

  const handleMoved = useCallback((message: string) => {
    setMovement(null);
    setSuccessMessage(message);
  }, []);

  function openDialog() {
    setSuccessMessage(null);
    setRequestKey(crypto.randomUUID());
    setDialogSession((current) => current + 1);
    setDialogOpen(true);
  }

  function openMovement(opportunity: OpportunityCardItem, stage: PipelineStage) {
    if (opportunity.current_stage_id === stage.id) return;
    setSuccessMessage(null);
    setMoveRequestKey(crypto.randomUUID());
    setMovementSession((current) => current + 1);
    setMovement({ opportunity, stage });
  }

  function handleDragStart(event: DragStartEvent) {
    setDraggedOpportunity(props.opportunities.find((opportunity) => opportunity.id === String(event.active.id)) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggedOpportunity(null);
    if (!event.over) return;
    const opportunity = props.opportunities.find((item) => item.id === String(event.active.id));
    const stage = visibleStages.find((item) => item.id === String(event.over?.id));
    if (opportunity && stage) openMovement(opportunity, stage);
  }

  function changePipeline(value: string | number | null) {
    const code = String(value) as PipelineCode;
    if (!props.pipelines.some((pipeline) => pipeline.code === code) || code === props.selectedPipelineCode) return;
    const params = new URLSearchParams();
    params.set("pipeline", code);
    if (props.query) params.set("query", props.query);
    router.push(`/oportunidades?${params.toString()}`);
  }

  return (
    <main className="mx-auto w-full max-w-[1440px] p-5">
      <header className="mb-4 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-xl leading-8 font-semibold">Pipeline</h1>
          <p className="text-sm text-[var(--gray-11)]">{descriptions[selectedPipeline.code]}</p>
        </div>
        <Button onClick={openDialog}><PlusCircleIcon />Nova oportunidade</Button>
      </header>

      <Tabs onValueChange={changePipeline} value={props.selectedPipelineCode}>
        <div className="flex min-h-14 items-center justify-between gap-4 rounded-lg bg-[var(--gray-1)] px-4 py-3">
          <form className="flex items-center" method="get">
            <input name="pipeline" type="hidden" value={props.selectedPipelineCode} />
            <label className="relative block w-[280px] max-w-[28vw]">
              <span className="sr-only">Buscar oportunidades</span>
              <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-[var(--gray-11)]" />
              <Input className="pl-8" defaultValue={props.query} name="query" placeholder="Busque uma oportunidade" />
            </label>
          </form>
          <TabsList aria-label="Funil comercial">
            {props.pipelines.map((pipeline) => <TabsTrigger key={pipeline.id} value={pipeline.code}>{pipeline.name}</TabsTrigger>)}
          </TabsList>
          <div className="w-[280px] max-w-[28vw]" aria-hidden="true" />
        </div>
      </Tabs>

      {props.error ? <p className="mt-3 rounded-lg border border-[var(--tomato-6)] bg-[var(--tomato-3)] px-3 py-2 text-sm text-[var(--tomato-11)]" role="alert">{props.error}</p> : null}
      {successMessage ? <p className="mt-3 rounded-lg border border-[var(--grass-6)] bg-[var(--grass-3)] px-3 py-2 text-sm text-[var(--grass-11)]" role="status">{successMessage}</p> : null}

      <div className="mt-4 flex items-center justify-between gap-4 text-sm">
        <p><span className="font-semibold">{props.opportunities.length}</span> {props.opportunities.length === 1 ? "oportunidade" : "oportunidades"} · <span className="font-semibold">{formatCurrency(pipelineTotal)}</span> em potencial</p>
        {currentHiddenStageCount ? <p className="text-xs text-[var(--gray-11)]">{currentHiddenStageCount} {currentHiddenStageCount === 1 ? "etapa oculta" : "etapas ocultas"} nas preferências</p> : null}
      </div>

      <DndContext
        onDragCancel={() => setDraggedOpportunity(null)}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
        sensors={sensors}
      >
        <section aria-label={`Etapas do funil ${selectedPipeline.name}`} className="mt-3 overflow-x-auto pb-3">
          <div className="flex min-w-max items-start gap-3">
            {visibleStages.map((stage) => (
              <PipelineColumn
                key={stage.id}
                opportunities={props.opportunities.filter((opportunity) => opportunity.current_stage_id === stage.id)}
                stage={stage}
              />
            ))}
          </div>
        </section>
        <DragOverlay>{draggedOpportunity ? <OpportunityCardPreview opportunity={draggedOpportunity} /> : null}</DragOverlay>
      </DndContext>

      <OpportunityFormDialog
        key={dialogSession}
        actor={props.actor}
        companies={props.companies}
        contacts={props.contacts}
        lossReasons={props.lossReasons}
        onCreated={handleCreated}
        onOpenChange={setDialogOpen}
        open={dialogOpen}
        pipelines={props.pipelines}
        products={props.products}
        profiles={props.profiles}
        qualificationParameters={props.qualificationParameters}
        requestKey={requestKey}
        selectedPipelineCode={props.selectedPipelineCode}
        sources={props.sources}
      />
      {movement ? (
        <OpportunityMoveDialog
          companies={props.companies}
          contacts={props.contacts}
          key={`${movementSession}:${movement.opportunity.id}:${movement.stage.id}`}
          lossReasons={props.lossReasons}
          onMoved={handleMoved}
          onOpenChange={(open) => { if (!open) setMovement(null); }}
          open
          opportunity={movement.opportunity}
          products={props.products}
          profiles={props.profiles}
          qualificationParameters={props.qualificationParameters}
          requestKey={moveRequestKey}
          targetStage={movement.stage}
        />
      ) : null}
    </main>
  );
}
