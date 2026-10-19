"use client";

import {
  ArrowPathIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  EllipsisVerticalIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusCircleIcon,
  TrashIcon,
  UserCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  completeTaskAction,
  deleteTaskAction,
  reopenTaskAction,
  rescheduleTaskAction,
  saveTaskAction,
  type TaskActionState,
} from "@/app/(app)/tarefas/actions";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

export type TaskTab = "today" | "overdue" | "upcoming" | "completed";
export type TaskType = "first_contact" | "qualification" | "follow_up" | "scheduling" | "proposal" | "management";
export type AppRole = "admin" | "pre_sales" | "commercial";

export type TaskProfileOption = { id: string; name: string; role: AppRole };
export type TaskCompanyOption = { id: string; name: string };
export type TaskContactOption = { id: string; name: string };
export type TaskContactLink = { company_id: string; contact_id: string };
export type TaskOpportunityOption = {
  id: string;
  name: string;
  company_id: string | null;
  contact_id: string | null;
  current_pipeline_id: string;
  pipeline_code: "pre_sales" | "sales" | "post_sales" | null;
  commercial_status: string;
  post_sale_status: string | null;
};

export type TaskItem = {
  id: string;
  title: string;
  type: TaskType;
  responsible_id: string;
  responsible_name: string;
  due_date: string;
  due_time: string | null;
  description: string | null;
  opportunity_id: string | null;
  company_id: string | null;
  contact_id: string | null;
  post_sale_cycle_id: string | null;
  status: "pending" | "completed" | "cancelled";
  creation_source: "manual" | "system";
  created_by: string | null;
  creator_name: string;
  completed_by: string | null;
  completed_by_name: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  opportunity: { id: string; name: string } | null;
  company: { id: string; name: string; is_active: boolean } | null;
  contact: { id: string; name: string; is_active: boolean } | null;
};

type TaskFilters = {
  companyId: string;
  completedFrom: string;
  completedTo: string;
  contactId: string;
  dueFrom: string;
  dueTo: string;
  opportunityId: string;
  query: string;
  responsibleId: string;
  tab: TaskTab;
  type: string;
};

const taskTypeLabels: Record<TaskType, string> = {
  first_contact: "Primeiro contato",
  qualification: "Qualificação",
  follow_up: "Follow-up",
  scheduling: "Agendamento",
  proposal: "Proposta",
  management: "Gestão",
};

const channelLabels = {
  whatsapp: "WhatsApp",
  phone: "Ligação",
  email: "E-mail",
  online_meeting: "Reunião online",
  in_person_meeting: "Reunião presencial",
  other: "Outro",
};

const selectClasses = "mt-1 h-8 w-full rounded-lg border border-[var(--gray-6)] bg-[var(--gray-1)] px-2.5 text-sm outline-none focus:border-[var(--primary-8)] focus:ring-3 focus:ring-[var(--primary-8)]/50 aria-invalid:border-[var(--tomato-9)] disabled:bg-[var(--gray-3)] disabled:text-[var(--gray-10)]";

function dateOrdinal(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

function formatCivilDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

function formatTime(value: string | null) {
  return value ? value.slice(0, 5) : "Sem horário";
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function dateInSaoPaulo(value: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function currentDateTimeInput() {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const hour = values.hour === "24" ? "00" : values.hour;
  return `${values.year}-${values.month}-${values.day}T${hour}:${values.minute}`;
}

function canProfileAccessOpportunity(profile: TaskProfileOption, opportunity?: TaskOpportunityOption) {
  if (!opportunity || !opportunity.pipeline_code) return true;
  return profile.role === "admin"
    || opportunity.pipeline_code === "pre_sales"
    || opportunity.pipeline_code === "sales"
    || (opportunity.pipeline_code === "post_sales" && profile.role === "commercial");
}

function FieldError({ children }: { children?: string }) {
  return children ? <p className="mt-1 text-xs text-[var(--tomato-11)]">{children}</p> : null;
}

function SubmitButton({ idle, pending = "Salvando...", variant = "default" }: { idle: string; pending?: string; variant?: "default" | "destructive" }) {
  const { pending: isPending } = useFormStatus();
  return <Button disabled={isPending} type="submit" variant={variant}>{isPending ? pending : idle}</Button>;
}

function ActionFeedback({ state }: { state: TaskActionState | null }) {
  return state && !state.ok ? (
    <p className="rounded-lg border border-[var(--tomato-6)] bg-[var(--tomato-3)] px-3 py-2 text-sm text-[var(--tomato-11)]" role="alert">
      {state.message}
    </p>
  ) : null;
}

function buildHref(filters: TaskFilters, changes: Partial<Record<keyof TaskFilters, string>>) {
  const values = { ...filters, ...changes };
  const params = new URLSearchParams();
  params.set("tab", values.tab);
  if (values.query) params.set("q", values.query);
  if (values.responsibleId) params.set("responsible", values.responsibleId);
  if (values.type) params.set("type", values.type);
  if (values.opportunityId) params.set("opportunity", values.opportunityId);
  if (values.companyId) params.set("company", values.companyId);
  if (values.contactId) params.set("contact", values.contactId);
  if (values.dueFrom) params.set("dueFrom", values.dueFrom);
  if (values.dueTo) params.set("dueTo", values.dueTo);
  if (values.completedFrom) params.set("completedFrom", values.completedFrom);
  if (values.completedTo) params.set("completedTo", values.completedTo);
  return `/tarefas?${params.toString()}`;
}

function groupTasks(tasks: TaskItem[], tab: TaskTab, today: string) {
  const groups = new Map<string, TaskItem[]>();
  const todayOrdinal = dateOrdinal(today);
  const add = (label: string, task: TaskItem) => groups.set(label, [...(groups.get(label) ?? []), task]);

  for (const task of tasks) {
    if (tab === "today") {
      add("Hoje", task);
      continue;
    }
    if (tab === "completed" && task.completed_at) {
      const difference = todayOrdinal - dateOrdinal(dateInSaoPaulo(task.completed_at));
      add(difference <= 0 ? "Hoje" : difference <= 7 ? "Últimos 7 dias" : difference <= 30 ? "Últimos 30 dias" : "Mais antigas", task);
      continue;
    }
    const difference = dateOrdinal(task.due_date) - todayOrdinal;
    if (tab === "overdue") {
      const age = Math.abs(difference);
      add(age === 1 ? "Ontem" : age <= 7 ? "2–7 dias" : age <= 30 ? "8–30 dias" : "Mais de 30 dias", task);
    } else {
      add(difference === 1 ? "Amanhã" : difference <= 7 ? "Próximos 7 dias" : difference <= 30 ? "Próximos 30 dias" : "Após 30 dias", task);
    }
  }
  return [...groups.entries()].map(([label, items]) => ({ label, items }));
}

function TaskFormDialog({
  actorId,
  companies,
  contactLinks,
  contacts,
  onOpenChange,
  open,
  opportunities,
  profiles,
  task,
  today,
}: {
  actorId: string;
  companies: TaskCompanyOption[];
  contactLinks: TaskContactLink[];
  contacts: TaskContactOption[];
  onOpenChange: (open: boolean) => void;
  open: boolean;
  opportunities: TaskOpportunityOption[];
  profiles: TaskProfileOption[];
  task: TaskItem | null;
  today: string;
}) {
  const router = useRouter();
  const [state, action] = useActionState(saveTaskAction, null);
  const [requestKey] = useState(() => crypto.randomUUID());
  const [type, setType] = useState<TaskType>(task?.type ?? "follow_up");
  const [opportunityId, setOpportunityId] = useState(task?.opportunity_id ?? "");
  const [companyId, setCompanyId] = useState(task?.opportunity_id ? "" : task?.company_id ?? "");
  const [contactId, setContactId] = useState(task?.opportunity_id ? "" : task?.contact_id ?? "");
  const [dueDate, setDueDate] = useState(task?.due_date ?? today);
  const selectedOpportunity = opportunities.find((opportunity) => opportunity.id === opportunityId);
  const availableProfiles = profiles.filter((profile) => canProfileAccessOpportunity(profile, selectedOpportunity));
  const availableContacts = companyId
    ? contacts.filter((contact) => contactLinks.some((link) => link.company_id === companyId && link.contact_id === contact.id))
    : contacts;
  const linkedCompany = companies.find((company) => company.id === selectedOpportunity?.company_id);
  const linkedContact = contacts.find((contact) => contact.id === selectedOpportunity?.contact_id);

  useEffect(() => {
    if (!state?.ok) return;
    onOpenChange(false);
    router.refresh();
  }, [onOpenChange, router, state]);

  function selectOpportunity(nextId: string) {
    setOpportunityId(nextId);
    if (nextId) {
      setCompanyId("");
      setContactId("");
    }
  }

  function selectCompany(nextId: string) {
    setCompanyId(nextId);
    if (contactId && !contactLinks.some((link) => link.company_id === nextId && link.contact_id === contactId)) {
      setContactId("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[660px]">
        <DialogHeader>
          <DialogTitle>{task ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
          <DialogDescription>Organize a próxima atividade e, se necessário, vincule-a a uma negociação.</DialogDescription>
        </DialogHeader>
        <form action={action} className="grid grid-cols-2 gap-4">
          <input name="requestKey" type="hidden" value={requestKey} />
          <input name="taskId" type="hidden" value={task?.id ?? ""} />
          <input name="postSaleCycleId" type="hidden" value={task?.post_sale_cycle_id ?? ""} />
          <div className="col-span-2"><ActionFeedback state={state} /></div>

          <label className="col-span-2 text-sm font-medium">
            Nome <span className="text-[var(--tomato-11)]">*</span>
            <Input aria-invalid={Boolean(state?.fieldErrors?.title)} className="mt-1" defaultValue={task?.title ?? ""} maxLength={180} name="title" required />
            <FieldError>{state?.fieldErrors?.title}</FieldError>
          </label>

          <label className="text-sm font-medium">
            Tipo <span className="text-[var(--tomato-11)]">*</span>
            <select className={selectClasses} name="type" onChange={(event) => {
              const nextType = event.target.value as TaskType;
              setType(nextType);
              if (nextType === "management") setOpportunityId("");
            }} value={type}>
              {Object.entries(taskTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <FieldError>{state?.fieldErrors?.type}</FieldError>
          </label>

          <label className="text-sm font-medium">
            Responsável <span className="text-[var(--tomato-11)]">*</span>
            <select aria-invalid={Boolean(state?.fieldErrors?.responsibleId)} className={selectClasses} defaultValue={task?.responsible_id ?? actorId} name="responsibleId" required>
              {availableProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
            </select>
            <FieldError>{state?.fieldErrors?.responsibleId}</FieldError>
          </label>

          <label className="col-span-2 text-sm font-medium">
            Oportunidade
            <select aria-invalid={Boolean(state?.fieldErrors?.opportunityId)} className={selectClasses} disabled={type === "management"} name="opportunityId" onChange={(event) => selectOpportunity(event.target.value)} value={opportunityId}>
              <option value="">Sem oportunidade</option>
              {opportunities.map((opportunity) => <option key={opportunity.id} value={opportunity.id}>{opportunity.name}</option>)}
            </select>
            <FieldError>{state?.fieldErrors?.opportunityId}</FieldError>
          </label>

          {opportunityId ? (
            <div className="col-span-2 grid grid-cols-2 gap-4 rounded-lg bg-[var(--gray-2)] p-3 text-sm">
              <div><p className="text-xs text-[var(--gray-11)]">Empresa herdada</p><p className="mt-1">{linkedCompany?.name ?? "Sem empresa"}</p></div>
              <div><p className="text-xs text-[var(--gray-11)]">Contato herdado</p><p className="mt-1">{linkedContact?.name ?? "Sem contato"}</p></div>
            </div>
          ) : (
            <>
              <label className="text-sm font-medium">
                Empresa
                <select aria-invalid={Boolean(state?.fieldErrors?.companyId)} className={selectClasses} name="companyId" onChange={(event) => selectCompany(event.target.value)} value={companyId}>
                  <option value="">Sem empresa</option>
                  {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                </select>
                <FieldError>{state?.fieldErrors?.companyId}</FieldError>
              </label>
              <label className="text-sm font-medium">
                Contato
                <select aria-invalid={Boolean(state?.fieldErrors?.contactId)} className={selectClasses} name="contactId" onChange={(event) => setContactId(event.target.value)} value={contactId}>
                  <option value="">Sem contato</option>
                  {availableContacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}</option>)}
                </select>
                <FieldError>{state?.fieldErrors?.contactId}</FieldError>
              </label>
            </>
          )}

          <label className="text-sm font-medium">
            Data de vencimento <span className="text-[var(--tomato-11)]">*</span>
            <Input aria-invalid={Boolean(state?.fieldErrors?.dueDate)} className="mt-1" name="dueDate" onChange={(event) => setDueDate(event.target.value)} required type="date" value={dueDate} />
            <FieldError>{state?.fieldErrors?.dueDate}</FieldError>
            {dueDate && dueDate < today ? <p className="mt-1 text-xs text-[var(--amber-11)]">Esta tarefa ficará atrasada.</p> : null}
          </label>
          <label className="text-sm font-medium">
            Horário
            <Input aria-invalid={Boolean(state?.fieldErrors?.dueTime)} className="mt-1" defaultValue={task?.due_time?.slice(0, 5) ?? ""} name="dueTime" type="time" />
            <FieldError>{state?.fieldErrors?.dueTime}</FieldError>
          </label>

          <label className="col-span-2 text-sm font-medium">
            Descrição
            <Textarea className="mt-1 min-h-20" defaultValue={task?.description ?? ""} maxLength={4000} name="description" />
          </label>

          <DialogFooter className="col-span-2 mt-1">
            <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
            <SubmitButton idle="Salvar" />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CompleteTaskDialog({ task, onClose, onReschedule }: { task: TaskItem | null; onClose: () => void; onReschedule: (task: TaskItem) => void }) {
  const router = useRouter();
  const [state, action] = useActionState(completeTaskAction, null);
  const [requestKey] = useState(() => crypto.randomUUID());
  const [hadContact, setHadContact] = useState<"yes" | "no" | "">("");
  const isManagement = task?.type === "management";
  const canRegisterContact = Boolean(task?.opportunity_id);

  useEffect(() => {
    if (!state?.ok) return;
    onClose();
    router.refresh();
  }, [onClose, router, state]);

  return (
    <Dialog open={Boolean(task)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Concluir tarefa</DialogTitle>
          <DialogDescription>{isManagement ? "Confirme a conclusão desta atividade de gestão." : "Informe se a atividade resultou em um contato realizado."}</DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <input name="requestKey" type="hidden" value={requestKey} />
          <input name="taskId" type="hidden" value={task?.id ?? ""} />
          <input name="taskType" type="hidden" value={task?.type ?? ""} />
          <ActionFeedback state={state} />

          {!isManagement ? (
            <fieldset>
              <legend className="text-sm font-medium">Houve contato? <span className="text-[var(--tomato-11)]">*</span></legend>
              <div className="mt-2 flex gap-3">
                <label className={`flex flex-1 items-center gap-2 rounded-lg border p-3 text-sm ${!canRegisterContact ? "opacity-50" : "cursor-pointer"}`}>
                  <input checked={hadContact === "yes"} disabled={!canRegisterContact} name="hadContact" onChange={() => setHadContact("yes")} type="radio" value="yes" /> Sim
                </label>
                <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm">
                  <input checked={hadContact === "no"} name="hadContact" onChange={() => setHadContact("no")} type="radio" value="no" /> Não
                </label>
              </div>
              {!canRegisterContact ? <p className="mt-2 text-xs text-[var(--gray-11)]">Sem oportunidade vinculada, a tarefa pode ser concluída apenas sem registrar contato.</p> : null}
              <FieldError>{state?.fieldErrors?.hadContact}</FieldError>
            </fieldset>
          ) : null}

          {hadContact === "yes" ? (
            <div className="grid grid-cols-2 gap-4 rounded-lg bg-[var(--gray-2)] p-3">
              <label className="text-sm font-medium">Canal
                <select className={selectClasses} name="contactChannel" required>
                  {Object.entries(channelLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium">Data e horário reais
                <Input aria-invalid={Boolean(state?.fieldErrors?.contactOccurredAt)} className="mt-1" defaultValue={currentDateTimeInput()} name="contactOccurredAt" required type="datetime-local" />
                <FieldError>{state?.fieldErrors?.contactOccurredAt}</FieldError>
              </label>
              <label className="col-span-2 text-sm font-medium">Observação
                <Textarea className="mt-1 min-h-16" maxLength={4000} name="contactNotes" />
              </label>
            </div>
          ) : null}

          <DialogFooter>
            {task && !isManagement && hadContact === "no" ? (
              <Button onClick={() => onReschedule(task)} type="button" variant="outline"><CalendarDaysIcon />Reagendar</Button>
            ) : null}
            <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
            <SubmitButton idle={isManagement ? "Concluir tarefa" : hadContact === "no" ? "Concluir sem contato" : "Concluir tarefa"} pending="Concluindo..." />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RescheduleDialog({ task, onClose, today }: { task: TaskItem | null; onClose: () => void; today: string }) {
  const router = useRouter();
  const [state, action] = useActionState(rescheduleTaskAction, null);
  const [requestKey] = useState(() => crypto.randomUUID());
  const [dueDate, setDueDate] = useState(task?.due_date ?? today);

  useEffect(() => {
    if (!state?.ok) return;
    onClose();
    router.refresh();
  }, [onClose, router, state]);

  return (
    <Dialog open={Boolean(task)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Reagendar tarefa</DialogTitle><DialogDescription>O responsável e os vínculos serão preservados.</DialogDescription></DialogHeader>
        <form action={action} className="grid grid-cols-2 gap-4">
          <input name="requestKey" type="hidden" value={requestKey} />
          <input name="taskId" type="hidden" value={task?.id ?? ""} />
          <div className="col-span-2"><ActionFeedback state={state} /></div>
          <label className="text-sm font-medium">Nova data
            <Input className="mt-1" name="dueDate" onChange={(event) => setDueDate(event.target.value)} required type="date" value={dueDate} />
            <FieldError>{state?.fieldErrors?.dueDate}</FieldError>
            {dueDate && dueDate < today ? <p className="mt-1 text-xs text-[var(--amber-11)]">A tarefa ficará atrasada.</p> : null}
          </label>
          <label className="text-sm font-medium">Horário
            <Input className="mt-1" defaultValue={task?.due_time?.slice(0, 5) ?? ""} name="dueTime" type="time" />
            <FieldError>{state?.fieldErrors?.dueTime}</FieldError>
          </label>
          <DialogFooter className="col-span-2"><DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose><SubmitButton idle="Reagendar" pending="Reagendando..." /></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmationDialog({ action, description, idle, onClose, open, task, title, variant = "default" }: {
  action: typeof deleteTaskAction | typeof reopenTaskAction;
  description: string;
  idle: string;
  onClose: () => void;
  open: boolean;
  task: TaskItem | null;
  title: string;
  variant?: "default" | "destructive";
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, null);
  const [requestKey] = useState(() => crypto.randomUUID());
  useEffect(() => {
    if (!state?.ok) return;
    onClose();
    router.refresh();
  }, [onClose, router, state]);
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
        <form action={formAction}>
          <input name="requestKey" type="hidden" value={requestKey} /><input name="taskId" type="hidden" value={task?.id ?? ""} />
          <ActionFeedback state={state} />
          <DialogFooter className="mt-4"><DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose><SubmitButton idle={idle} pending="Processando..." variant={variant} /></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FiltersDialog({ actorId, companies, contacts, filters, onClose, open, opportunities, profiles }: {
  actorId: string;
  companies: TaskCompanyOption[];
  contacts: TaskContactOption[];
  filters: TaskFilters;
  onClose: () => void;
  open: boolean;
  opportunities: TaskOpportunityOption[];
  profiles: TaskProfileOption[];
}) {
  const router = useRouter();
  const [values, setValues] = useState(filters);
  function update(key: keyof TaskFilters, value: string) { setValues((current) => ({ ...current, [key]: value })); }
  function apply(event: React.FormEvent) {
    event.preventDefault();
    onClose();
    router.push(buildHref(filters, values));
  }
  function clear() {
    const cleared = { ...filters, companyId: "", completedFrom: "", completedTo: "", contactId: "", dueFrom: "", dueTo: "", opportunityId: "", responsibleId: actorId, type: "" };
    setValues(cleared);
    onClose();
    router.push(buildHref(filters, cleared));
  }
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader><DialogTitle>Filtros</DialogTitle><DialogDescription>Os campos são combinados para refinar a lista atual.</DialogDescription></DialogHeader>
        <form className="grid grid-cols-2 gap-4" onSubmit={apply}>
          <label className="text-sm font-medium">Responsável<select className={selectClasses} onChange={(event) => update("responsibleId", event.target.value)} value={values.responsibleId}><option value="all">Todos os responsáveis</option>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label>
          <label className="text-sm font-medium">Tipo<select className={selectClasses} onChange={(event) => update("type", event.target.value)} value={values.type}><option value="">Todos os tipos</option>{Object.entries(taskTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="text-sm font-medium">Oportunidade<select className={selectClasses} onChange={(event) => update("opportunityId", event.target.value)} value={values.opportunityId}><option value="">Todas</option>{opportunities.map((opportunity) => <option key={opportunity.id} value={opportunity.id}>{opportunity.name}</option>)}</select></label>
          <label className="text-sm font-medium">Empresa<select className={selectClasses} onChange={(event) => update("companyId", event.target.value)} value={values.companyId}><option value="">Todas</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
          <label className="text-sm font-medium">Contato<select className={selectClasses} onChange={(event) => update("contactId", event.target.value)} value={values.contactId}><option value="">Todos</option>{contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}</option>)}</select></label>
          <div />
          {filters.tab === "completed" ? (
            <><label className="text-sm font-medium">Conclusão a partir de<Input className="mt-1" onChange={(event) => update("completedFrom", event.target.value)} type="date" value={values.completedFrom} /></label><label className="text-sm font-medium">Conclusão até<Input className="mt-1" onChange={(event) => update("completedTo", event.target.value)} type="date" value={values.completedTo} /></label></>
          ) : (
            <><label className="text-sm font-medium">Vencimento a partir de<Input className="mt-1" onChange={(event) => update("dueFrom", event.target.value)} type="date" value={values.dueFrom} /></label><label className="text-sm font-medium">Vencimento até<Input className="mt-1" onChange={(event) => update("dueTo", event.target.value)} type="date" value={values.dueTo} /></label></>
          )}
          <DialogFooter className="col-span-2"><Button onClick={clear} type="button" variant="ghost">Limpar</Button><DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose><Button type="submit">Aplicar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TaskDetailsPanel({ onClose, onComplete, onDelete, onEdit, onReopen, onReschedule, task }: {
  onClose: () => void;
  onComplete: (task: TaskItem) => void;
  onDelete: (task: TaskItem) => void;
  onEdit: (task: TaskItem) => void;
  onReopen: (task: TaskItem) => void;
  onReschedule: (task: TaskItem) => void;
  task: TaskItem | null;
}) {
  if (!task) return null;
  return (
    <div className="fixed inset-0 z-40 bg-[var(--fixed-dark)]/10" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside aria-label="Detalhes da tarefa" className="absolute top-0 right-0 flex h-full w-[440px] max-w-[42vw] flex-col border-l border-[var(--gray-6)] bg-[var(--gray-1)] shadow-xl">
        <header className="flex items-start justify-between gap-4 border-b border-[var(--gray-6)] p-5">
          <div className="min-w-0"><p className="text-xs font-medium text-[var(--gray-11)]">{taskTypeLabels[task.type]}</p><h2 className="mt-1 text-lg font-semibold leading-6">{task.title}</h2></div>
          <Button aria-label="Fechar detalhes" onClick={onClose} size="icon-sm" variant="ghost"><XMarkIcon /></Button>
        </header>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          <div className="flex gap-2">
            {task.status === "pending" ? <Button onClick={() => onComplete(task)}><CheckCircleIcon />Concluir</Button> : <Button onClick={() => onReopen(task)} variant="outline"><ArrowPathIcon />Marcar como pendente</Button>}
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button aria-label="Mais ações" size="icon" variant="outline" />}><EllipsisVerticalIcon /></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled={task.status !== "pending"} onClick={() => onEdit(task)}><PencilSquareIcon />Editar</DropdownMenuItem>
                <DropdownMenuItem disabled={task.status !== "pending"} onClick={() => onReschedule(task)}><CalendarDaysIcon />Reagendar</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(task)} variant="destructive"><TrashIcon />Excluir</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <section className="rounded-xl border border-[var(--gray-6)] p-4">
            <h3 className="text-sm font-semibold">Informações</h3>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
              <div><dt className="text-xs text-[var(--gray-11)]">Status</dt><dd className="mt-1">{task.status === "pending" ? "Pendente" : "Concluída"}</dd></div>
              <div><dt className="text-xs text-[var(--gray-11)]">Responsável</dt><dd className="mt-1">{task.responsible_name}</dd></div>
              <div><dt className="text-xs text-[var(--gray-11)]">Vencimento</dt><dd className="mt-1">{formatCivilDate(task.due_date)} · {formatTime(task.due_time)}</dd></div>
              <div><dt className="text-xs text-[var(--gray-11)]">Origem</dt><dd className="mt-1">{task.creation_source === "system" ? "Automática" : "Manual"}</dd></div>
              <div className="col-span-2"><dt className="text-xs text-[var(--gray-11)]">Oportunidade</dt><dd className="mt-1">{task.opportunity ? <Link className="text-[var(--primary-11)] hover:underline" href={`/oportunidades/${task.opportunity.id}`}>{task.opportunity.name}</Link> : "Sem oportunidade"}</dd></div>
              <div><dt className="text-xs text-[var(--gray-11)]">Empresa</dt><dd className="mt-1">{task.company?.name ?? "—"}</dd></div>
              <div><dt className="text-xs text-[var(--gray-11)]">Contato</dt><dd className="mt-1">{task.contact?.name ?? "—"}</dd></div>
            </dl>
          </section>
          <section className="rounded-xl border border-[var(--gray-6)] p-4"><h3 className="text-sm font-semibold">Descrição</h3><p className="mt-3 whitespace-pre-wrap text-sm text-[var(--gray-11)]">{task.description || "Nenhuma descrição informada."}</p></section>
          <section className="rounded-xl border border-[var(--gray-6)] p-4"><h3 className="text-sm font-semibold">Registro</h3><dl className="mt-3 space-y-3 text-sm"><div><dt className="text-xs text-[var(--gray-11)]">Criada por</dt><dd className="mt-1">{task.creator_name} · {formatDateTime(task.created_at)}</dd></div>{task.completed_at ? <div><dt className="text-xs text-[var(--gray-11)]">Concluída por</dt><dd className="mt-1">{task.completed_by_name ?? "Usuário"} · {formatDateTime(task.completed_at)}</dd></div> : null}</dl></section>
        </div>
      </aside>
    </div>
  );
}

export function TasksWorkspace({ actor, companies, contactLinks, contacts, error, filters, opportunities, profiles, tasks, today }: {
  actor: { id: string; name: string; role: AppRole };
  companies: TaskCompanyOption[];
  contactLinks: TaskContactLink[];
  contacts: TaskContactOption[];
  error?: string;
  filters: TaskFilters;
  opportunities: TaskOpportunityOption[];
  profiles: TaskProfileOption[];
  tasks: TaskItem[];
  today: string;
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [completingTask, setCompletingTask] = useState<TaskItem | null>(null);
  const [reschedulingTask, setReschedulingTask] = useState<TaskItem | null>(null);
  const [deletingTask, setDeletingTask] = useState<TaskItem | null>(null);
  const [reopeningTask, setReopeningTask] = useState<TaskItem | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [visibleByGroup, setVisibleByGroup] = useState<Record<string, number>>({});
  const groups = useMemo(() => groupTasks(tasks, filters.tab, today), [filters.tab, tasks, today]);
  const activeFilterCount = [filters.type, filters.opportunityId, filters.companyId, filters.contactId, filters.dueFrom, filters.dueTo, filters.completedFrom, filters.completedTo, filters.responsibleId !== actor.id ? filters.responsibleId : ""].filter(Boolean).length;
  const currentTime = currentDateTimeInput().slice(11);

  function changeTab(value: string | number | null) {
    if (!validTaskTab(value) || value === filters.tab) return;
    router.push(buildHref(filters, { tab: value }));
  }
  function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    router.push(buildHref(filters, { query: String(formData.get("q") ?? "").trim() }));
  }
  function openNew() { setEditingTask(null); setFormOpen(true); }
  function openEdit(task: TaskItem) { setSelectedTask(null); setEditingTask(task); setFormOpen(true); }
  function toggleGroup(label: string) { setCollapsedGroups((current) => { const next = new Set(current); if (next.has(label)) next.delete(label); else next.add(label); return next; }); }

  return (
    <main className="mx-auto w-full max-w-[1440px] p-5">
      <header className="mb-4 flex items-end justify-between gap-4">
        <div><h1 className="text-xl font-semibold leading-8">Tarefas</h1><p className="text-sm text-[var(--gray-11)]">Organize atividades comerciais e próximos passos da rotina.</p></div>
        <Button onClick={openNew}><PlusCircleIcon />Nova tarefa</Button>
      </header>

      <section className="overflow-hidden rounded-[10px] bg-[var(--gray-1)] p-3">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2">
            <form onSubmit={search}><label className="relative block w-[280px] max-w-[26vw]"><span className="sr-only">Buscar tarefas</span><MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-[var(--gray-11)]" /><Input className="pl-8" defaultValue={filters.query} name="q" placeholder="Buscar tarefas..." /></label></form>
            <Tabs className="gap-0" onValueChange={changeTab} value={filters.tab}><TabsList aria-label="Classificação das tarefas"><TabsTrigger value="today">Hoje</TabsTrigger><TabsTrigger value="overdue">Atrasadas</TabsTrigger><TabsTrigger value="upcoming">Próximas</TabsTrigger><TabsTrigger value="completed">Concluídas</TabsTrigger></TabsList></Tabs>
          </div>
          <Button onClick={() => setFiltersOpen(true)} variant="outline"><FunnelIcon />Filtros{activeFilterCount ? <span className="rounded-full bg-[var(--primary-9)] px-1.5 text-[10px] text-[var(--fixed-dark)]">{activeFilterCount}</span> : null}</Button>
        </div>

        {error ? <div className="p-10 text-center"><p className="text-sm text-[var(--tomato-11)]" role="alert">{error}</p><Button className="mt-3" onClick={() => window.location.reload()} variant="outline">Tentar novamente</Button></div> : groups.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-10 text-center"><CalendarDaysIcon className="size-9 text-[var(--gray-9)]" /><div><p className="text-sm font-medium">Nenhuma tarefa nesta visualização.</p><p className="mt-1 text-sm text-[var(--gray-11)]">{filters.query || activeFilterCount ? "Revise a busca ou limpe os filtros aplicados." : filters.tab === "today" ? "Você não possui tarefas com vencimento hoje." : "As tarefas aparecerão aqui conforme suas datas e status."}</p></div>{filters.query || activeFilterCount ? <Button onClick={() => router.push(buildHref(filters, { companyId: "", completedFrom: "", completedTo: "", contactId: "", dueFrom: "", dueTo: "", opportunityId: "", query: "", responsibleId: actor.id, type: "" }))} variant="outline">Limpar critérios</Button> : <Button onClick={openNew}><PlusCircleIcon />Nova tarefa</Button>}</div>
        ) : groups.map((group) => {
          const collapsed = collapsedGroups.has(group.label);
          const visible = visibleByGroup[group.label] ?? 20;
          return <section className="border-t border-[var(--gray-6)] first:border-t-0" key={group.label}>
            <button className="flex w-full items-center gap-2 px-3 py-3 text-left text-sm font-semibold hover:bg-[var(--gray-2)]" onClick={() => toggleGroup(group.label)} type="button">{collapsed ? <ChevronRightIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}<span>{group.label}</span><span className="rounded-full bg-[var(--gray-3)] px-2 py-0.5 text-xs font-medium text-[var(--gray-11)]">{group.items.length}</span></button>
            {!collapsed ? <>
              <Table><TableHeader><TableRow className="hover:bg-transparent"><TableHead>Tarefa</TableHead><TableHead className="w-[210px]">Oportunidade</TableHead><TableHead className="w-[150px]">Tipo</TableHead><TableHead className="w-[170px]">{filters.tab === "completed" ? "Concluída em" : "Vencimento"}</TableHead><TableHead className="w-[180px]">Responsável</TableHead><TableHead className="w-12"><span className="sr-only">Ações</span></TableHead></TableRow></TableHeader><TableBody>
                {group.items.slice(0, visible).map((task) => {
                  const timePassed = filters.tab === "today" && Boolean(task.due_time && task.due_time.slice(0, 5) < currentTime);
                  return <TableRow className="cursor-pointer focus-visible:bg-[var(--gray-2)] focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[var(--primary-8)]" key={task.id} onClick={() => setSelectedTask(task)} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); setSelectedTask(task); } }} tabIndex={0}>
                    <TableCell><div className="flex min-w-0 items-center gap-2"><CheckCircleIcon className={`size-5 shrink-0 ${task.status === "completed" ? "text-[var(--grass-10)]" : "text-[var(--gray-8)]"}`} /><span className="max-w-[340px] truncate font-medium">{task.title}</span>{task.creation_source === "system" ? <span className="rounded-full bg-[var(--indigo-3)] px-1.5 py-0.5 text-[10px] text-[var(--indigo-11)]">Automática</span> : null}</div></TableCell>
                    <TableCell onClick={(event) => event.stopPropagation()}>{task.opportunity ? <Link className="block max-w-[190px] truncate text-[var(--primary-11)] hover:underline" href={`/oportunidades/${task.opportunity.id}`}>{task.opportunity.name}</Link> : <span className="text-[var(--gray-10)]">—</span>}</TableCell>
                    <TableCell>{taskTypeLabels[task.type]}</TableCell>
                    <TableCell>{filters.tab === "completed" ? formatDateTime(task.completed_at) : <div><p>{formatCivilDate(task.due_date)} · {formatTime(task.due_time)}</p>{timePassed ? <p className="text-xs text-[var(--amber-11)]">Horário ultrapassado</p> : null}</div>}</TableCell>
                    <TableCell><span className="inline-flex items-center gap-1.5"><UserCircleIcon className="size-4 text-[var(--gray-10)]" />{task.responsible_name}</span></TableCell>
                    <TableCell onClick={(event) => event.stopPropagation()}><DropdownMenu><DropdownMenuTrigger render={<Button aria-label={`Ações de ${task.title}`} size="icon-sm" variant="ghost" />}><EllipsisVerticalIcon /></DropdownMenuTrigger><DropdownMenuContent align="end">{task.status === "pending" ? <><DropdownMenuItem onClick={() => setCompletingTask(task)}><CheckCircleIcon />Concluir</DropdownMenuItem><DropdownMenuItem onClick={() => openEdit(task)}><PencilSquareIcon />Editar</DropdownMenuItem><DropdownMenuItem onClick={() => setReschedulingTask(task)}><ClockIcon />Reagendar</DropdownMenuItem></> : <DropdownMenuItem onClick={() => setReopeningTask(task)}><ArrowPathIcon />Marcar como pendente</DropdownMenuItem>}<DropdownMenuItem onClick={() => setDeletingTask(task)} variant="destructive"><TrashIcon />Excluir</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
                  </TableRow>;
                })}
              </TableBody></Table>
              {visible < group.items.length ? <div className="flex justify-center border-t border-[var(--gray-6)] py-2"><Button onClick={() => setVisibleByGroup((current) => ({ ...current, [group.label]: visible + 20 }))} size="sm" variant="ghost">Carregar mais</Button></div> : null}
            </> : null}
          </section>;
        })}
      </section>

      <TaskDetailsPanel onClose={() => setSelectedTask(null)} onComplete={setCompletingTask} onDelete={setDeletingTask} onEdit={openEdit} onReopen={setReopeningTask} onReschedule={setReschedulingTask} task={selectedTask} />
      <TaskFormDialog key={`${editingTask?.id ?? "new"}-${formOpen}`} actorId={actor.id} companies={companies} contactLinks={contactLinks} contacts={contacts} onOpenChange={setFormOpen} open={formOpen} opportunities={opportunities} profiles={profiles} task={editingTask} today={today} />
      <CompleteTaskDialog key={`${completingTask?.id ?? "none"}`} onClose={() => setCompletingTask(null)} onReschedule={(task) => { setCompletingTask(null); setReschedulingTask(task); }} task={completingTask} />
      <RescheduleDialog key={`${reschedulingTask?.id ?? "none"}`} onClose={() => setReschedulingTask(null)} task={reschedulingTask} today={today} />
      <ConfirmationDialog action={deleteTaskAction} description="A tarefa sairá definitivamente das listas. Os eventos de auditoria e contatos já registrados serão preservados." idle="Excluir tarefa" key={`delete-${deletingTask?.id ?? "none"}`} onClose={() => setDeletingTask(null)} open={Boolean(deletingTask)} task={deletingTask} title="Excluir tarefa?" variant="destructive" />
      <ConfirmationDialog action={reopenTaskAction} description="A tarefa voltará à classificação correspondente ao seu vencimento. Isso só é permitido enquanto o fluxo relacionado estiver ativo." idle="Marcar como pendente" key={`reopen-${reopeningTask?.id ?? "none"}`} onClose={() => setReopeningTask(null)} open={Boolean(reopeningTask)} task={reopeningTask} title="Reabrir tarefa?" />
      <FiltersDialog actorId={actor.id} companies={companies} contacts={contacts} filters={filters} onClose={() => setFiltersOpen(false)} open={filtersOpen} opportunities={opportunities} profiles={profiles} />
    </main>
  );
}

function validTaskTab(value: string | number | null): value is TaskTab {
  return value === "today" || value === "overdue" || value === "upcoming" || value === "completed";
}
