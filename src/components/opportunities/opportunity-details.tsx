"use client";

import {
  ArrowsRightLeftIcon,
  BuildingOffice2Icon,
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  Cog6ToothIcon,
  DocumentIcon,
  EllipsisHorizontalIcon,
  EllipsisVerticalIcon,
  PaperClipIcon,
  PencilSquareIcon,
  PlusCircleIcon,
  TrashIcon,
  TrophyIcon,
  UserCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useState, useTransition } from "react";

import {
  addOpportunityNoteAction,
  changeOpportunityResponsibleAction,
  deleteOpportunityNoteAction,
  registerOpportunityContactAction,
  saveOpportunityQualificationAction,
  saveOpportunityProductsAction,
  setOpportunityValueAction,
  type OpportunityDetailActionState,
  type RegisterOpportunityContactState,
  updateOpportunityDetailsAction,
} from "@/app/(app)/oportunidades/actions";
import {
  OpportunityAttachmentButton,
  OpportunityAttachmentMenu,
} from "@/components/opportunities/opportunity-attachment-actions";
import { OpportunityMoveDialog } from "@/components/opportunities/opportunity-move-dialog";
import type {
  CompanyOption,
  ContactOption,
  OpportunityCardItem,
  OpportunityPipeline,
  PipelineStage,
  ProductOption,
  ProfileOption,
  SimpleOption,
} from "@/components/opportunities/opportunities-pipeline";
import { RelatedTasksCard } from "@/components/tasks/related-tasks-card";
import type { TaskItem } from "@/components/tasks/tasks-workspace";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type DetailOpportunity = OpportunityCardItem & {
  commercial_status: string;
  current_pipeline_id: string | null;
  description: string | null;
  expected_close_date: string | null;
  last_contact_at: string | null;
  post_sale_status: string | null;
  source_name: string | null;
  source_id: string | null;
  temperature: "cold" | "warm" | "hot" | null;
};

export type OpportunityTaskItem = TaskItem;

export type OpportunityAttachmentItem = {
  id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_at: string;
};

export type OpportunityNoteItem = {
  id: string;
  body: string;
  author_name: string;
  created_at: string;
};

export type OpportunityActivityItem = {
  id: string;
  summary: string;
  event_type: string;
  author_name: string;
  occurred_at: string;
};

type OpportunityDetailsProps = {
  actorRole: "admin" | "pre_sales" | "commercial";
  attachments: OpportunityAttachmentItem[];
  companies: CompanyOption[];
  contacts: ContactOption[];
  currentPipeline: OpportunityPipeline | null;
  lossReasons: SimpleOption[];
  notes: OpportunityNoteItem[];
  activities: OpportunityActivityItem[];
  opportunity: DetailOpportunity;
  products: ProductOption[];
  profiles: ProfileOption[];
  qualification: Array<{ id: string; name: string; answer: boolean | null; isActive: boolean }>;
  qualificationParameters: SimpleOption[];
  sources: SimpleOption[];
  tasks: OpportunityTaskItem[];
};

const selectClassName = "mt-1 h-8 w-full rounded-lg border border-[var(--gray-6)] bg-[var(--gray-1)] px-2.5 text-sm outline-none focus:border-[var(--primary-8)] focus:ring-3 focus:ring-[var(--primary-8)]/50 aria-invalid:border-[var(--tomato-9)]";

function FieldError({ children }: { children?: string }) {
  return children ? <p className="mt-1 text-xs text-[var(--tomato-11)]">{children}</p> : null;
}

function formatCurrency(value: number | string | null) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value ?? 0));
}

function maskCurrency(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits ? formatCurrency(Number(digits) / 100) : "";
}

function formatDateTime(value: string | null) {
  if (!value) return "Não informado";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function formatDate(value: string | null) {
  if (!value) return "Não informado";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

function saoPauloWallClock(value: Date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value).map((part) => [part.type, part.value]));
  return new Date(Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  ));
}

function isCooling(referenceValue: string) {
  const now = saoPauloWallClock(new Date());
  const threshold = saoPauloWallClock(new Date(referenceValue));
  let businessDays = 0;
  while (businessDays < 3) {
    threshold.setUTCDate(threshold.getUTCDate() + 1);
    const day = threshold.getUTCDay();
    if (day !== 0 && day !== 6) businessDays += 1;
  }
  return now >= threshold;
}

function currentSaoPauloDateTimeInput() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date()).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-xs text-[var(--gray-11)]">{label}</dt>
      <dd className="max-w-[62%] text-right text-xs text-[var(--gray-12)]">{value}</dd>
    </div>
  );
}

function DetailCard({ action, children, title }: { action?: React.ReactNode; children: React.ReactNode; title: string }) {
  const [open, setOpen] = useState(true);

  return (
    <section className="overflow-hidden rounded-lg border border-[var(--gray-6)] bg-[var(--gray-1)]">
      <div className="flex min-h-12 items-center justify-between gap-3 px-5 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <div className="flex items-center gap-3">
          {action}
          <Button
            aria-expanded={open}
            aria-label={`${open ? "Recolher" : "Expandir"} ${title}`}
            onClick={() => setOpen((current) => !current)}
            size="icon-xs"
            type="button"
            variant="outline"
          >
            <ChevronDownIcon className={`transition-transform ${open ? "" : "-rotate-90"}`} />
          </Button>
        </div>
      </div>
      {open ? <div className="border-t border-[var(--gray-5)] px-5 py-5">{children}</div> : null}
    </section>
  );
}

function RegisterContactDialog({
  onOpenChange,
  onSuccess,
  open,
  opportunityId,
}: {
  onOpenChange: (open: boolean) => void;
  onSuccess: (message: string) => void;
  open: boolean;
  opportunityId: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<RegisterOpportunityContactState | null, FormData>(registerOpportunityContactAction, null);
  const [requestKey] = useState(() => crypto.randomUUID());

  useEffect(() => {
    if (!state?.ok) return;
    onSuccess(state.message);
    onOpenChange(false);
    router.refresh();
  }, [onOpenChange, onSuccess, router, state]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Registrar um contato</DialogTitle>
          <DialogDescription>Registre somente contatos que realmente aconteceram.</DialogDescription>
        </DialogHeader>
        <form action={action} className="grid grid-cols-2 gap-4">
          <input name="requestKey" type="hidden" value={requestKey} />
          <input name="opportunityId" type="hidden" value={opportunityId} />
          {state && !state.ok ? <p className="col-span-2 rounded-lg bg-[var(--tomato-3)] p-3 text-sm text-[var(--tomato-11)]" role="alert">{state.message}</p> : null}
          <label className="text-sm font-medium">
            Canal <span className="text-[var(--tomato-11)]">*</span>
            <select className={selectClassName} defaultValue="whatsapp" name="channel" required>
              <option value="whatsapp">WhatsApp</option>
              <option value="phone">Ligação</option>
              <option value="email">E-mail</option>
              <option value="online_meeting">Reunião on-line</option>
              <option value="in_person_meeting">Reunião presencial</option>
              <option value="other">Outro</option>
            </select>
          </label>
          <label className="text-sm font-medium">
            Data e horário <span className="text-[var(--tomato-11)]">*</span>
            <Input className="mt-1" defaultValue={currentSaoPauloDateTimeInput()} max={currentSaoPauloDateTimeInput()} name="occurredAt" required type="datetime-local" />
          </label>
          <label className="col-span-2 text-sm font-medium">
            Observação
            <Textarea className="mt-1 min-h-24" name="notes" placeholder="Resumo do contato" />
          </label>
          <DialogFooter className="col-span-2 mt-2">
            <Button disabled={pending} onClick={() => onOpenChange(false)} type="button" variant="outline">Cancelar</Button>
            <Button disabled={pending} type="submit">{pending ? "Registrando..." : "Registrar contato"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddNoteDialog({
  onOpenChange,
  onSuccess,
  open,
  opportunityId,
}: {
  onOpenChange: (open: boolean) => void;
  onSuccess: (message: string) => void;
  open: boolean;
  opportunityId: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<OpportunityDetailActionState | null, FormData>(addOpportunityNoteAction, null);

  useEffect(() => {
    if (!state?.ok) return;
    onSuccess(state.message);
    onOpenChange(false);
    router.refresh();
  }, [onOpenChange, onSuccess, router, state]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader><DialogTitle>Adicionar nota</DialogTitle><DialogDescription>A nota fica registrada separadamente dos contatos realizados.</DialogDescription></DialogHeader>
        <form action={action} className="grid gap-4">
          <input name="opportunityId" type="hidden" value={opportunityId} />
          {state && !state.ok ? <p className="rounded-lg bg-[var(--tomato-3)] p-3 text-sm text-[var(--tomato-11)]" role="alert">{state.message}</p> : null}
          <label className="text-sm font-medium">Nota <span className="text-[var(--tomato-11)]">*</span><Textarea aria-invalid={Boolean(state?.fieldErrors?.body)} className="mt-1 min-h-28" name="body" placeholder="Escreva uma nota sobre esta oportunidade" required /></label>
          <DialogFooter><Button disabled={pending} onClick={() => onOpenChange(false)} type="button" variant="outline">Cancelar</Button><Button disabled={pending} type="submit">{pending ? "Salvando..." : "Adicionar nota"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProductsDialog({
  catalog,
  onOpenChange,
  onSuccess,
  open,
  opportunity,
}: {
  catalog: ProductOption[];
  onOpenChange: (open: boolean) => void;
  onSuccess: (message: string) => void;
  open: boolean;
  opportunity: DetailOpportunity;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<OpportunityDetailActionState | null, FormData>(saveOpportunityProductsAction, null);
  const [requestKey] = useState(() => crypto.randomUUID());
  const linkedById = new Map(opportunity.products.map((product) => [product.product_id, product]));
  const unavailableLinkedProducts = opportunity.products.filter((product) => !catalog.some((item) => item.id === product.product_id));

  useEffect(() => {
    if (!state?.ok) return;
    onSuccess(state.message);
    onOpenChange(false);
    router.refresh();
  }, [onOpenChange, onSuccess, router, state]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader><DialogTitle>Vincular produtos</DialogTitle><DialogDescription>Selecione produtos ativos e informe quantidades inteiras.</DialogDescription></DialogHeader>
        <form action={action} className="grid gap-4">
          <input name="requestKey" type="hidden" value={requestKey} />
          <input name="opportunityId" type="hidden" value={opportunity.id} />
          {state && !state.ok ? <p className="rounded-lg bg-[var(--tomato-3)] p-3 text-sm text-[var(--tomato-11)]" role="alert">{state.message}</p> : null}
          {unavailableLinkedProducts.length ? <p className="rounded-lg bg-[var(--amber-3)] p-3 text-sm text-[var(--amber-11)]">Há produto vinculado que não está ativo no catálogo. A edição foi bloqueada para preservar o vínculo histórico.</p> : null}
          <div className="max-h-80 overflow-y-auto rounded-lg border border-[var(--gray-6)]">
            {catalog.map((product) => {
              const linked = linkedById.get(product.id);
              return (
                <label className="flex items-center gap-3 border-b border-[var(--gray-5)] p-3 last:border-0" key={product.id}>
                  <input defaultChecked={Boolean(linked)} name="productId" type="checkbox" value={product.id} />
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{product.name}</span><span className="text-xs text-[var(--gray-10)]">{formatCurrency(linked?.unit_price ?? product.base_price)}</span></span>
                  <Input className="w-20" defaultValue={linked?.quantity ?? 1} min={1} name={`quantity:${product.id}`} step={1} type="number" />
                </label>
              );
            })}
            {!catalog.length ? <p className="p-4 text-sm text-[var(--gray-10)]">Nenhum produto ativo com valor cadastrado.</p> : null}
          </div>
          {opportunity.value_mode === "manual" ? <p className="text-xs text-[var(--gray-10)]">O valor total está ajustado manualmente e será preservado.</p> : null}
          <DialogFooter><Button disabled={pending} onClick={() => onOpenChange(false)} type="button" variant="outline">Cancelar</Button><Button disabled={pending || Boolean(unavailableLinkedProducts.length)} type="submit">{pending ? "Salvando..." : "Salvar produtos"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function OpportunityValueDialog({
  onOpenChange,
  onSuccess,
  open,
  opportunity,
}: {
  onOpenChange: (open: boolean) => void;
  onSuccess: (message: string) => void;
  open: boolean;
  opportunity: DetailOpportunity;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<OpportunityDetailActionState | null, FormData>(setOpportunityValueAction, null);
  const [requestKey] = useState(() => crypto.randomUUID());
  const [manualValue, setManualValue] = useState(formatCurrency(opportunity.final_value));
  const [recalculationState, setRecalculationState] = useState<OpportunityDetailActionState | null>(null);
  const [recalculating, startRecalculating] = useTransition();
  const calculatedValue = opportunity.products.reduce(
    (total, product) => total + Number(product.unit_price) * product.quantity,
    0,
  );
  const visibleState = recalculationState ?? state;

  useEffect(() => {
    if (!state?.ok) return;
    onSuccess(state.message);
    onOpenChange(false);
    router.refresh();
  }, [onOpenChange, onSuccess, router, state]);

  function recalculateFromProducts() {
    const formData = new FormData();
    formData.set("requestKey", crypto.randomUUID());
    formData.set("opportunityId", opportunity.id);
    formData.set("valueMode", "calculated");
    startRecalculating(async () => {
      const result = await setOpportunityValueAction(null, formData);
      setRecalculationState(result);
      if (!result.ok) return;
      onSuccess(result.message);
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar valor da oportunidade</DialogTitle>
          <DialogDescription>Defina o valor final negociado sem alterar os preços dos produtos vinculados.</DialogDescription>
        </DialogHeader>
        <form action={action} className="grid gap-4">
          <input name="requestKey" type="hidden" value={requestKey} />
          <input name="opportunityId" type="hidden" value={opportunity.id} />
          <input name="valueMode" type="hidden" value="manual" />
          {visibleState && !visibleState.ok ? (
            <p className="rounded-lg bg-[var(--tomato-3)] p-3 text-sm text-[var(--tomato-11)]" role="alert">{visibleState.message}</p>
          ) : null}
          <div className="flex items-center justify-between rounded-lg bg-[var(--gray-3)] px-3 py-2.5 text-sm">
            <span className="text-[var(--gray-11)]">Valor-base dos produtos</span>
            <strong className="font-semibold text-[var(--gray-12)]">{formatCurrency(calculatedValue)}</strong>
          </div>
          <label className="text-sm font-medium">
            Valor final <span className="text-[var(--tomato-11)]">*</span>
            <Input
              aria-invalid={Boolean(state?.fieldErrors?.finalValue)}
              className="mt-1"
              inputMode="decimal"
              name="finalValue"
              onChange={(event) => setManualValue(maskCurrency(event.target.value))}
              placeholder="R$ 0,00"
              required
              value={manualValue}
            />
            {state?.fieldErrors?.finalValue ? <p className="mt-1 text-xs text-[var(--tomato-11)]">{state.fieldErrors.finalValue}</p> : null}
          </label>
          <p className="text-xs text-[var(--gray-10)]">Enquanto o valor estiver ajustado manualmente, mudanças nos produtos atualizarão apenas o valor-base.</p>
          <DialogFooter className="sm:justify-between">
            <Button disabled={pending || recalculating} onClick={recalculateFromProducts} type="button" variant="outline">
              {recalculating ? "Recalculando..." : "Recalcular pelos produtos"}
            </Button>
            <div className="flex gap-2">
              <Button disabled={pending || recalculating} onClick={() => onOpenChange(false)} type="button" variant="outline">Cancelar</Button>
              <Button disabled={pending || recalculating} type="submit">{pending ? "Salvando..." : "Salvar valor"}</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function OpportunityDetailsDialog({
  companies,
  contacts,
  onOpenChange,
  onSuccess,
  open,
  opportunity,
  sources,
}: {
  companies: CompanyOption[];
  contacts: ContactOption[];
  onOpenChange: (open: boolean) => void;
  onSuccess: (message: string) => void;
  open: boolean;
  opportunity: DetailOpportunity;
  sources: SimpleOption[];
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<OpportunityDetailActionState | null, FormData>(updateOpportunityDetailsAction, null);
  const [requestKey] = useState(() => crypto.randomUUID());
  const companyOptions = opportunity.company_id && !companies.some((item) => item.id === opportunity.company_id)
    ? [{ id: opportunity.company_id, name: opportunity.company_name ?? "Empresa atual" }, ...companies]
    : companies;
  const contactOptions = opportunity.contact_id && !contacts.some((item) => item.id === opportunity.contact_id)
    ? [{ id: opportunity.contact_id, name: opportunity.contact_name ?? "Contato atual" }, ...contacts]
    : contacts;
  const sourceOptions = opportunity.source_id && !sources.some((item) => item.id === opportunity.source_id)
    ? [{ id: opportunity.source_id, name: opportunity.source_name ?? "Origem atual" }, ...sources]
    : sources;

  useEffect(() => {
    if (!state?.ok) return;
    onSuccess(state.message);
    onOpenChange(false);
    router.refresh();
  }, [onOpenChange, onSuccess, router, state]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[660px]">
        <DialogHeader>
          <DialogTitle>Editar oportunidade</DialogTitle>
          <DialogDescription>Atualize os dados comerciais da oportunidade.</DialogDescription>
        </DialogHeader>
        <form action={action} className="grid grid-cols-2 gap-4">
          <input name="requestKey" type="hidden" value={requestKey} />
          <input name="opportunityId" type="hidden" value={opportunity.id} />
          {state && !state.ok ? <p className="col-span-2 rounded-lg bg-[var(--tomato-3)] p-3 text-sm text-[var(--tomato-11)]" role="alert">{state.message}</p> : null}
          <label className="col-span-2 text-sm font-medium">
            Nome <span className="text-[var(--tomato-11)]">*</span>
            <Input aria-invalid={Boolean(state?.fieldErrors?.name)} className="mt-1" defaultValue={opportunity.name} maxLength={180} name="name" required />
            <FieldError>{state?.fieldErrors?.name}</FieldError>
          </label>
          <label className="text-sm font-medium">
            Empresa
            <select aria-invalid={Boolean(state?.fieldErrors?.companyId)} className={selectClassName} defaultValue={opportunity.company_id ?? ""} name="companyId">
              <option value="">Sem empresa</option>
              {companyOptions.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
            </select>
            <FieldError>{state?.fieldErrors?.companyId}</FieldError>
          </label>
          <label className="text-sm font-medium">
            Contato
            <select aria-invalid={Boolean(state?.fieldErrors?.contactId)} className={selectClassName} defaultValue={opportunity.contact_id ?? ""} name="contactId">
              <option value="">Sem contato</option>
              {contactOptions.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}</option>)}
            </select>
            <FieldError>{state?.fieldErrors?.contactId}</FieldError>
          </label>
          <label className="text-sm font-medium">
            Origem
            <select aria-invalid={Boolean(state?.fieldErrors?.sourceId)} className={selectClassName} defaultValue={opportunity.source_id ?? ""} name="sourceId">
              <option value="">Sem origem</option>
              {sourceOptions.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}
            </select>
            <FieldError>{state?.fieldErrors?.sourceId}</FieldError>
          </label>
          <label className="text-sm font-medium">
            Previsão de fechamento
            <Input aria-invalid={Boolean(state?.fieldErrors?.expectedCloseDate)} className="mt-1" defaultValue={opportunity.expected_close_date ?? ""} name="expectedCloseDate" type="date" />
            <FieldError>{state?.fieldErrors?.expectedCloseDate}</FieldError>
          </label>
          <label className="col-span-2 text-sm font-medium sm:col-span-1">
            Temperatura
            <select aria-invalid={Boolean(state?.fieldErrors?.temperature)} className={selectClassName} defaultValue={opportunity.temperature ?? ""} name="temperature">
              <option value="">Sem temperatura</option>
              <option value="cold">Fria</option>
              <option value="warm">Morna</option>
              <option value="hot">Quente</option>
            </select>
            <FieldError>{state?.fieldErrors?.temperature}</FieldError>
          </label>
          <label className="col-span-2 text-sm font-medium">
            Descrição
            <Textarea className="mt-1 min-h-24" defaultValue={opportunity.description ?? ""} maxLength={2_000} name="description" />
          </label>
          <DialogFooter className="col-span-2">
            <Button disabled={pending} onClick={() => onOpenChange(false)} type="button" variant="outline">Cancelar</Button>
            <Button disabled={pending} type="submit">{pending ? "Salvando..." : "Salvar alterações"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function OpportunityResponsibleDialog({
  onOpenChange,
  onSuccess,
  open,
  opportunity,
  profiles,
}: {
  onOpenChange: (open: boolean) => void;
  onSuccess: (message: string) => void;
  open: boolean;
  opportunity: DetailOpportunity;
  profiles: ProfileOption[];
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<OpportunityDetailActionState | null, FormData>(changeOpportunityResponsibleAction, null);
  const [requestKey] = useState(() => crypto.randomUUID());
  const [responsibleId, setResponsibleId] = useState(opportunity.responsible_id);
  const responsibleOptions: SimpleOption[] = profiles.some((profile) => profile.id === opportunity.responsible_id)
    ? profiles
    : [{ id: opportunity.responsible_id, name: opportunity.responsible_name }, ...profiles];

  useEffect(() => {
    if (!state?.ok) return;
    onSuccess(state.message);
    onOpenChange(false);
    router.refresh();
  }, [onOpenChange, onSuccess, router, state]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Trocar responsável</DialogTitle>
          <DialogDescription>As tarefas automáticas pendentes da oportunidade também serão transferidas.</DialogDescription>
        </DialogHeader>
        <form action={action} className="grid gap-4">
          <input name="requestKey" type="hidden" value={requestKey} />
          <input name="opportunityId" type="hidden" value={opportunity.id} />
          {state && !state.ok ? <p className="rounded-lg bg-[var(--tomato-3)] p-3 text-sm text-[var(--tomato-11)]" role="alert">{state.message}</p> : null}
          <label className="text-sm font-medium">
            Novo responsável <span className="text-[var(--tomato-11)]">*</span>
            <select aria-invalid={Boolean(state?.fieldErrors?.responsibleId)} className={selectClassName} name="responsibleId" onChange={(event) => setResponsibleId(event.target.value)} required value={responsibleId}>
              {responsibleOptions.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
            </select>
            <FieldError>{state?.fieldErrors?.responsibleId}</FieldError>
          </label>
          <DialogFooter>
            <Button disabled={pending} onClick={() => onOpenChange(false)} type="button" variant="outline">Cancelar</Button>
            <Button disabled={pending || responsibleId === opportunity.responsible_id} type="submit">{pending ? "Transferindo..." : "Trocar responsável"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function OpportunityQualificationDialog({
  onOpenChange,
  onSuccess,
  open,
  opportunityId,
  qualification,
}: {
  onOpenChange: (open: boolean) => void;
  onSuccess: (message: string) => void;
  open: boolean;
  opportunityId: string;
  qualification: Array<{ id: string; name: string; answer: boolean | null; isActive: boolean }>;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<OpportunityDetailActionState | null, FormData>(saveOpportunityQualificationAction, null);
  const [requestKey] = useState(() => crypto.randomUUID());
  const activeQualification = qualification.filter((item) => item.isActive);

  useEffect(() => {
    if (!state?.ok) return;
    onSuccess(state.message);
    onOpenChange(false);
    router.refresh();
  }, [onOpenChange, onSuccess, router, state]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Editar qualificação</DialogTitle>
          <DialogDescription>Responda Sim ou Não aos critérios aplicáveis. Respostas negativas também contam como preenchidas.</DialogDescription>
        </DialogHeader>
        <form action={action} className="grid gap-4">
          <input name="requestKey" type="hidden" value={requestKey} />
          <input name="opportunityId" type="hidden" value={opportunityId} />
          {state && !state.ok ? <p className="rounded-lg bg-[var(--tomato-3)] p-3 text-sm text-[var(--tomato-11)]" role="alert">{state.message}</p> : null}
          <div className="grid max-h-96 gap-2 overflow-y-auto">
            {activeQualification.map((item) => (
              <fieldset className="flex items-center justify-between gap-4 rounded-lg border border-[var(--gray-6)] px-3 py-3" key={item.id}>
                <input name="parameterId" type="hidden" value={item.id} />
                <legend className="sr-only">{item.name}</legend>
                <p className="min-w-0 flex-1 text-sm font-medium">{item.name}</p>
                <div className="flex shrink-0 rounded-lg bg-[var(--gray-3)] p-0.5">
                  <label className="cursor-pointer">
                    <input className="peer sr-only" defaultChecked={item.answer === true} name={`answer:${item.id}`} type="radio" value="true" />
                    <span className="flex h-7 min-w-14 items-center justify-center rounded-md px-2 text-xs text-[var(--gray-11)] transition-colors peer-checked:bg-[var(--gray-1)] peer-checked:font-semibold peer-checked:text-[var(--grass-11)] peer-checked:shadow-sm peer-focus-visible:ring-3 peer-focus-visible:ring-[var(--primary-8)]/50">Sim</span>
                  </label>
                  <label className="cursor-pointer">
                    <input className="peer sr-only" defaultChecked={item.answer === false} name={`answer:${item.id}`} type="radio" value="false" />
                    <span className="flex h-7 min-w-14 items-center justify-center rounded-md px-2 text-xs text-[var(--gray-11)] transition-colors peer-checked:bg-[var(--gray-1)] peer-checked:font-semibold peer-checked:text-[var(--tomato-11)] peer-checked:shadow-sm peer-focus-visible:ring-3 peer-focus-visible:ring-[var(--primary-8)]/50">Não</span>
                  </label>
                </div>
              </fieldset>
            ))}
            {!activeQualification.length ? <p className="py-6 text-center text-sm text-[var(--gray-10)]">Nenhum critério ativo configurado.</p> : null}
          </div>
          {state?.fieldErrors?.qualification ? <p className="text-xs text-[var(--tomato-11)]">{state.fieldErrors.qualification}</p> : null}
          <DialogFooter>
            <Button disabled={pending} onClick={() => onOpenChange(false)} type="button" variant="outline">Cancelar</Button>
            <Button disabled={pending || !activeQualification.length} type="submit">{pending ? "Salvando..." : "Salvar respostas"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function OpportunityNoteMenu({
  noteId,
  onMessage,
  opportunityId,
}: {
  noteId: string;
  onMessage: (message: string, error?: boolean) => void;
  opportunityId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove() {
    if (!window.confirm("Excluir esta nota da oportunidade?")) return;
    startTransition(async () => {
      const result = await deleteOpportunityNoteAction(opportunityId, noteId);
      onMessage(result.message, !result.ok);
      if (result.ok) router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button aria-label="Ações da nota" disabled={pending} size="icon-xs" variant="ghost" />}><EllipsisVerticalIcon /></DropdownMenuTrigger>
      <DropdownMenuContent align="end"><DropdownMenuItem onClick={remove} variant="destructive"><TrashIcon />Excluir nota</DropdownMenuItem></DropdownMenuContent>
    </DropdownMenu>
  );
}

export function OpportunityDetails({
  actorRole,
  activities,
  attachments,
  companies,
  contacts,
  currentPipeline,
  lossReasons,
  notes,
  opportunity,
  products,
  profiles,
  qualification,
  qualificationParameters,
  sources,
  tasks,
}: OpportunityDetailsProps) {
  const router = useRouter();
  const [movement, setMovement] = useState<PipelineStage | null>(null);
  const [moveRequestKey, setMoveRequestKey] = useState("");
  const [movementSession, setMovementSession] = useState(0);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactDialogSession, setContactDialogSession] = useState(0);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteDialogSession, setNoteDialogSession] = useState(0);
  const [productsDialogOpen, setProductsDialogOpen] = useState(false);
  const [productsDialogSession, setProductsDialogSession] = useState(0);
  const [valueDialogOpen, setValueDialogOpen] = useState(false);
  const [valueDialogSession, setValueDialogSession] = useState(0);
  const [qualificationDialogOpen, setQualificationDialogOpen] = useState(false);
  const [qualificationDialogSession, setQualificationDialogSession] = useState(0);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [detailsDialogSession, setDetailsDialogSession] = useState(0);
  const [responsibleDialogOpen, setResponsibleDialogOpen] = useState(false);
  const [responsibleDialogSession, setResponsibleDialogSession] = useState(0);
  const [feedback, setFeedback] = useState<{ error: boolean; message: string } | null>(null);
  const [removingProduct, startRemovingProduct] = useTransition();
  const isEditable = opportunity.commercial_status === "active"
    || (opportunity.commercial_status === "won" && opportunity.post_sale_status === "active");
  const canEditDetails = opportunity.commercial_status === "active";
  const canEditQualification = opportunity.commercial_status === "active";
  const cooling = opportunity.commercial_status === "active"
    && currentPipeline?.code !== "post_sales"
    && isCooling(opportunity.last_contact_at ?? opportunity.created_at);
  const temperatureLabels = { cold: "Fria", warm: "Morna", hot: "Quente" } as const;

  const handleMoved = useCallback((message: string) => {
    setMovement(null);
    setFeedback({ error: false, message });
  }, []);

  const showFeedback = useCallback((message: string, error = false) => {
    setFeedback({ error, message });
  }, []);

  function openMovement(stage: PipelineStage) {
    if (!isEditable || stage.id === opportunity.current_stage_id) return;
    setMoveRequestKey(crypto.randomUUID());
    setMovementSession((current) => current + 1);
    setMovement(stage);
  }

  function openContactDialog() {
    setContactDialogSession((current) => current + 1);
    setContactDialogOpen(true);
  }

  function openNoteDialog() {
    setNoteDialogSession((current) => current + 1);
    setNoteDialogOpen(true);
  }

  function openProductsDialog() {
    setProductsDialogSession((current) => current + 1);
    setProductsDialogOpen(true);
  }

  function openValueDialog() {
    setValueDialogSession((current) => current + 1);
    setValueDialogOpen(true);
  }

  function openQualificationDialog() {
    setQualificationDialogSession((current) => current + 1);
    setQualificationDialogOpen(true);
  }

  function openDetailsDialog() {
    setDetailsDialogSession((current) => current + 1);
    setDetailsDialogOpen(true);
  }

  function openResponsibleDialog() {
    setResponsibleDialogSession((current) => current + 1);
    setResponsibleDialogOpen(true);
  }

  function removeProduct(productId: string) {
    if (!window.confirm("Remover este produto da oportunidade?")) return;
    const formData = new FormData();
    formData.set("requestKey", crypto.randomUUID());
    formData.set("opportunityId", opportunity.id);
    opportunity.products.filter((product) => product.product_id !== productId).forEach((product) => {
      formData.append("productId", product.product_id);
      formData.set(`quantity:${product.product_id}`, String(product.quantity));
    });
    startRemovingProduct(async () => {
      const result = await saveOpportunityProductsAction(null, formData);
      showFeedback(result.message, !result.ok);
      if (result.ok) router.refresh();
    });
  }

  const wonStage = currentPipeline?.stages.find((stage) => stage.code === "won");
  const lostStage = currentPipeline?.stages.find((stage) => stage.code === "lost");
  const activeQualification = qualification.filter((item) => item.isActive);
  const answeredQualification = activeQualification.filter((item) => item.answer !== null).length;
  const qualificationProgress = activeQualification.length
    ? Math.round((answeredQualification / activeQualification.length) * 100)
    : 0;
  const assignableProfiles = currentPipeline?.code === "post_sales"
    ? profiles.filter((profile) => profile.role === "admin" || profile.role === "commercial")
    : profiles;

  return (
    <main className="mx-auto flex w-full max-w-[970px] flex-col gap-5 px-5 py-10">
      <header className="flex items-end justify-between gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-2xl leading-9 font-semibold">{opportunity.name}</h1>
            {opportunity.temperature ? (
              <span className={`rounded-full px-2 py-0.5 text-xs ${opportunity.temperature === "hot" ? "bg-[var(--tomato-3)] text-[var(--tomato-11)]" : opportunity.temperature === "warm" ? "bg-[var(--amber-3)] text-[var(--amber-11)]" : "bg-[var(--indigo-3)] text-[var(--indigo-11)]"}`}>
                {temperatureLabels[opportunity.temperature]}
              </span>
            ) : null}
          </div>
          <div className="mt-2 flex items-center gap-5 text-sm text-[var(--gray-12)]">
            {opportunity.company_id ? (
              <Link className="inline-flex items-center gap-1 underline decoration-[var(--gray-7)] underline-offset-2 hover:text-[var(--gray-12)]" href={`/cadastros/empresas/${opportunity.company_id}`}>
                <BuildingOffice2Icon className="size-5" />{opportunity.company_name ?? "Empresa"}
              </Link>
            ) : <span className="inline-flex items-center gap-2"><BuildingOffice2Icon className="size-5" />Sem empresa</span>}
            <span className="inline-flex items-center gap-2"><UserCircleIcon className="size-5" />{opportunity.responsible_name}</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="mb-2 text-xs text-[var(--gray-10)]">Criada em&nbsp;&nbsp;&nbsp; {formatDateTime(opportunity.created_at)}</p>
          <div className="flex justify-end gap-3">
            {lostStage && isEditable ? <Button className="h-10" onClick={() => openMovement(lostStage)} variant="outline"><XCircleIcon className="size-5" />Perdida</Button> : null}
            {wonStage && isEditable ? <Button className="h-10" onClick={() => openMovement(wonStage)} variant="outline"><TrophyIcon className="size-5" />Ganha</Button> : null}
            {isEditable ? <Button className="h-10" onClick={openContactDialog}>Registrar um contato<ChevronDownIcon className="size-5" /></Button> : null}
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button aria-label="Mais ações" className="size-10" size="icon" variant="outline" />}><EllipsisHorizontalIcon className="size-5" /></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem render={<Link href={`/oportunidades${currentPipeline ? `?pipeline=${currentPipeline.code}` : ""}`} />}>Voltar para o Pipeline</DropdownMenuItem>
                {opportunity.company_id ? <DropdownMenuItem render={<Link href={`/cadastros/empresas/${opportunity.company_id}`} />}>Abrir empresa</DropdownMenuItem> : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="h-px bg-[var(--gray-6)]" />
      {feedback ? <p className={`rounded-lg border px-3 py-2 text-sm ${feedback.error ? "border-[var(--tomato-6)] bg-[var(--tomato-3)] text-[var(--tomato-11)]" : "border-[var(--grass-6)] bg-[var(--grass-3)] text-[var(--grass-11)]"}`} role={feedback.error ? "alert" : "status"}>{feedback.message}</p> : null}
      {cooling ? (
        <div className="flex items-start gap-2 rounded-lg bg-[var(--amber-3)] px-2.5 py-5 text-sm text-[var(--amber-11)]">
          <ClockIcon className="mt-0.5 size-5 shrink-0" />
          <div><p className="font-semibold">Sem contato há 3 dias úteis</p><p className="mt-1">O lead se encontra em um momento de resfriamento. Registre um contato para mantê-lo aquecido.</p></div>
        </div>
      ) : null}

      {currentPipeline ? (
        <section className="flex items-center gap-[19px]">
          <p className="shrink-0 truncate text-sm font-semibold">{currentPipeline.name}</p>
          <div className="flex min-w-0 flex-1 gap-2.5 overflow-x-auto">
            {currentPipeline.stages.map((stage) => {
              const current = stage.id === opportunity.current_stage_id;
              return (
                <button
                  aria-current={current ? "step" : undefined}
                  className={`h-8 min-w-28 flex-1 rounded-[10px] px-2.5 text-center text-xs outline-none transition-colors focus-visible:ring-3 focus-visible:ring-[var(--primary-8)]/50 ${current ? "bg-[var(--gray-12)] font-medium text-[var(--gray-1)]" : "bg-[var(--gray-3)] hover:bg-[var(--gray-4)]"}`}
                  disabled={!isEditable || current}
                  key={stage.id}
                  onClick={() => openMovement(stage)}
                  type="button"
                >
                  <span className="block truncate font-medium">{stage.name}</span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="grid grid-cols-[minmax(0,3fr)_minmax(360px,2fr)] items-stretch gap-3">
        <section className="min-h-[1000px] rounded-lg border border-[var(--gray-6)] bg-[var(--gray-1)] p-5">
          <h2 className="mb-5 text-sm font-semibold">Histórico de atividades</h2>
          {activities.length ? (
            <ol className="relative ml-2 border-l border-[var(--gray-6)]">
              {activities.map((activity, index) => (
                <li className="relative ml-6 pb-7 last:pb-0" key={activity.id}>
                  <span className={`absolute top-1 -left-[29px] size-2 rounded-full ring-4 ring-[var(--gray-1)] ${index === 0 ? "bg-[var(--primary-11)]" : "bg-[var(--gray-7)]"}`} />
                  <p className={`text-xs font-semibold ${index === 0 ? "text-[var(--primary-11)]" : "text-[var(--gray-12)]"}`}>{activity.summary}</p>
                  <p className="mt-1 text-[10px] text-[var(--gray-10)]">{activity.author_name} · {formatDateTime(activity.occurred_at)}</p>
                </li>
              ))}
            </ol>
          ) : <p className="py-8 text-center text-xs text-[var(--gray-10)]">Nenhuma atividade registrada.</p>}
        </section>

        <aside className="grid content-start gap-3">
          <DetailCard
            action={canEditDetails || isEditable ? (
              <div className="flex items-center gap-2">
                {canEditDetails ? <Button onClick={openDetailsDialog} size="xs" type="button" variant="outline"><PencilSquareIcon />Editar</Button> : null}
                {isEditable ? <Button aria-label="Trocar responsável" onClick={openResponsibleDialog} size="icon-xs" title="Trocar responsável" type="button" variant="outline"><UserCircleIcon /></Button> : null}
              </div>
            ) : undefined}
            title="Detalhes da oportunidade"
          >
            <dl className="grid gap-2.5">
              <InfoRow label="Responsável" value={<span className="inline-flex items-center justify-end gap-1.5"><span className="inline-grid size-5 place-items-center rounded-full bg-[var(--indigo-3)] text-[9px] font-medium text-[var(--indigo-11)]">{initials(opportunity.responsible_name)}</span>{opportunity.responsible_name}</span>} />
              <InfoRow label="Último contato" value={formatDateTime(opportunity.last_contact_at)} />
              <InfoRow label="Previsão de fechamento" value={formatDate(opportunity.expected_close_date)} />
              <InfoRow label="Origem" value={opportunity.source_name ?? "Não informada"} />
            </dl>
            {opportunity.description ? <p className="mt-3 border-t border-[var(--gray-5)] pt-3 text-xs text-[var(--gray-11)]">{opportunity.description}</p> : null}
          </DetailCard>

          <DetailCard
            action={isEditable ? <Button disabled={removingProduct} onClick={openProductsDialog} size="xs" type="button" variant="outline"><ArrowsRightLeftIcon />Vincular produto</Button> : undefined}
            title="Valor da oportunidade"
          >
            <div className={`${opportunity.value_mode === "manual" ? "mb-1" : "mb-4"} flex items-center justify-between gap-3`}>
              <p className="text-xl font-semibold">{formatCurrency(opportunity.final_value)}</p>
              {isEditable ? <Button onClick={openValueDialog} size="xs" type="button" variant="ghost"><PencilSquareIcon />Editar valor</Button> : null}
            </div>
            {opportunity.value_mode === "manual" ? <p className="mb-4 text-[10px] text-[var(--gray-10)]">Valor ajustado manualmente</p> : null}
            <p className="mb-2 text-xs text-[var(--gray-11)]">Produtos vinculados</p>
            <div className="grid gap-2">
              {opportunity.products.map((product) => (
                <div className="flex items-center justify-between gap-3 rounded-md bg-[var(--gray-3)] px-2.5 py-2" key={product.product_id}>
                  <p className="min-w-0 truncate text-xs">{product.name} · {product.quantity} × {formatCurrency(product.unit_price)}</p>
                  {isEditable ? <Button aria-label={`Remover ${product.name}`} disabled={removingProduct} onClick={() => removeProduct(product.product_id)} size="icon-xs" type="button" variant="destructive"><TrashIcon /></Button> : null}
                </div>
              ))}
              {!opportunity.products.length ? <p className="text-xs text-[var(--gray-10)]">Nenhum produto vinculado.</p> : null}
            </div>
          </DetailCard>

          <DetailCard
            action={canEditQualification || actorRole === "admin" ? (
              <div className="flex items-center gap-2">
                {canEditQualification && activeQualification.length ? <Button onClick={openQualificationDialog} size="xs" type="button" variant="outline"><PencilSquareIcon />Editar respostas</Button> : null}
                {actorRole === "admin" ? <Button aria-label="Configurar critérios de qualificação" render={<Link href="/configuracoes?section=opportunities" />} size="icon-xs" title="Ir para configurações" variant="outline"><Cog6ToothIcon /></Button> : null}
              </div>
            ) : undefined}
            title="Qualificação"
          >
            <div className="mb-3 h-1 overflow-hidden rounded-full bg-[var(--gray-4)]" aria-label={`${qualificationProgress}% da qualificação respondida`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={qualificationProgress}>
              <div className="h-full bg-[var(--primary-9)]" style={{ width: `${qualificationProgress}%` }} />
            </div>
            {activeQualification.length ? <p className="mb-3 text-[10px] text-[var(--gray-10)]">{answeredQualification} de {activeQualification.length} critérios respondidos</p> : null}
            <ul className="grid gap-3">
              {qualification.map((item) => (
                <li className={`flex items-start gap-2 text-xs ${item.isActive ? "" : "text-[var(--gray-10)]"}`} key={item.id}>
                  <span className={`mt-0.5 inline-grid size-3.5 shrink-0 place-items-center rounded-[3px] border ${item.answer === true ? "border-[var(--primary-9)] bg-[var(--primary-9)] text-[var(--fixed-dark)]" : item.answer === false ? "border-[var(--tomato-8)] bg-[var(--tomato-3)] text-[var(--tomato-11)]" : "border-[var(--gray-7)] bg-[var(--gray-1)]"}`}>
                    {item.answer === true ? <CheckIcon className="size-3" strokeWidth={3} /> : item.answer === false ? <XMarkIcon className="size-3" strokeWidth={3} /> : null}
                  </span>
                  <span className="min-w-0 flex-1 font-medium">{item.name}{item.isActive ? "" : " · Inativo"}</span>
                  <span className="shrink-0 text-[10px] text-[var(--gray-10)]">{item.answer === null ? "Não respondido" : item.answer ? "Sim" : "Não"}</span>
                </li>
              ))}
              {!qualification.length ? <li className="text-xs text-[var(--gray-10)]">Nenhum parâmetro configurado.</li> : null}
            </ul>
          </DetailCard>

          <section className="overflow-hidden rounded-lg border border-[var(--gray-6)] bg-[var(--gray-1)]">
            <RelatedTasksCard
              canCreate={isEditable}
              createContext={{
                defaultResponsibleId: opportunity.responsible_id,
                label: "esta oportunidade",
                opportunityId: opportunity.id,
              }}
              profiles={assignableProfiles}
              tasks={tasks}
            />
          </section>

          <DetailCard action={isEditable ? <OpportunityAttachmentButton onMessage={showFeedback} opportunityId={opportunity.id} /> : undefined} title="Anexos">
            <div className="grid">
              {attachments.map((attachment) => (
                <div className="flex items-center gap-2 border-b border-[var(--gray-5)] py-2.5 first:pt-0 last:border-0 last:pb-0" key={attachment.id}>
                  <span className="inline-grid size-7 shrink-0 place-items-center rounded-md bg-[var(--gray-3)]"><DocumentIcon className="size-4 text-[var(--gray-11)]" /></span>
                  <div className="min-w-0 flex-1"><p className="truncate text-xs">{attachment.original_name}</p><p className="mt-0.5 text-[10px] text-[var(--gray-10)]">{attachment.mime_type.split("/").at(-1)?.toUpperCase()} · {formatFileSize(attachment.size_bytes)} · {formatDate(attachment.uploaded_at.slice(0, 10))}</p></div>
                  {isEditable ? <OpportunityAttachmentMenu attachmentId={attachment.id} onMessage={showFeedback} opportunityId={opportunity.id} /> : <EllipsisVerticalIcon aria-hidden="true" className="size-4 shrink-0 text-[var(--gray-11)]" />}
                </div>
              ))}
              {!attachments.length ? <p className="flex items-center gap-2 text-xs text-[var(--gray-10)]"><PaperClipIcon className="size-4" />Nenhum anexo.</p> : null}
            </div>
          </DetailCard>

          <DetailCard action={isEditable ? <Button onClick={openNoteDialog} size="xs" type="button" variant="outline"><PlusCircleIcon />Adicionar nota</Button> : undefined} title="Notas da oportunidade">
            <div className="grid">
              {notes.map((note) => (
                <div className="flex items-start gap-2.5 border-b border-[var(--gray-5)] py-3 first:pt-0 last:border-0 last:pb-0" key={note.id}>
                  <span className="inline-grid size-7 shrink-0 place-items-center rounded-full bg-[var(--indigo-3)] text-[10px] font-medium text-[var(--indigo-11)]">{initials(note.author_name)}</span>
                  <div className="min-w-0 flex-1"><p className="text-xs whitespace-pre-wrap">{note.body}</p><p className="mt-2 text-[10px] text-[var(--gray-10)]">{note.author_name} · {formatDateTime(note.created_at)}</p></div>
                  {isEditable ? <OpportunityNoteMenu noteId={note.id} onMessage={showFeedback} opportunityId={opportunity.id} /> : <EllipsisVerticalIcon aria-hidden="true" className="size-4 shrink-0 text-[var(--gray-11)]" />}
                </div>
              ))}
              {!notes.length ? <p className="text-xs text-[var(--gray-10)]">Nenhuma nota adicionada.</p> : null}
            </div>
          </DetailCard>
        </aside>
      </div>

      {movement ? (
        <OpportunityMoveDialog
          companies={companies}
          contacts={contacts}
          key={`${movementSession}:${movement.id}`}
          lossReasons={lossReasons}
          onMoved={handleMoved}
          onOpenChange={(open) => { if (!open) setMovement(null); }}
          open
          opportunity={opportunity}
          products={products}
          profiles={profiles}
          qualificationParameters={qualificationParameters}
          requestKey={moveRequestKey}
          targetStage={movement}
        />
      ) : null}

      {contactDialogOpen ? (
        <RegisterContactDialog
          key={contactDialogSession}
          onOpenChange={setContactDialogOpen}
          onSuccess={showFeedback}
          open
          opportunityId={opportunity.id}
        />
      ) : null}

      {noteDialogOpen ? (
        <AddNoteDialog
          key={noteDialogSession}
          onOpenChange={setNoteDialogOpen}
          onSuccess={showFeedback}
          open
          opportunityId={opportunity.id}
        />
      ) : null}

      {productsDialogOpen ? (
        <ProductsDialog
          catalog={products}
          key={productsDialogSession}
          onOpenChange={setProductsDialogOpen}
          onSuccess={showFeedback}
          open
          opportunity={opportunity}
        />
      ) : null}

      {valueDialogOpen ? (
        <OpportunityValueDialog
          key={valueDialogSession}
          onOpenChange={setValueDialogOpen}
          onSuccess={showFeedback}
          open
          opportunity={opportunity}
        />
      ) : null}

      {qualificationDialogOpen ? (
        <OpportunityQualificationDialog
          key={qualificationDialogSession}
          onOpenChange={setQualificationDialogOpen}
          onSuccess={showFeedback}
          open
          opportunityId={opportunity.id}
          qualification={qualification}
        />
      ) : null}

      {detailsDialogOpen ? (
        <OpportunityDetailsDialog
          companies={companies}
          contacts={contacts}
          key={detailsDialogSession}
          onOpenChange={setDetailsDialogOpen}
          onSuccess={showFeedback}
          open
          opportunity={opportunity}
          sources={sources}
        />
      ) : null}

      {responsibleDialogOpen ? (
        <OpportunityResponsibleDialog
          key={responsibleDialogSession}
          onOpenChange={setResponsibleDialogOpen}
          onSuccess={showFeedback}
          open
          opportunity={opportunity}
          profiles={assignableProfiles}
        />
      ) : null}

    </main>
  );
}
