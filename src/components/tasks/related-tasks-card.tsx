"use client";

import {
  ArrowPathIcon,
  CalendarDaysIcon,
  CheckIcon,
  ChevronDownIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  reopenTaskAction,
  saveTaskAction,
  type TaskActionState,
} from "@/app/(app)/tarefas/actions";
import {
  CompleteTaskDialog,
  RescheduleDialog,
  type TaskItem,
  type TaskProfileOption,
  type TaskType,
} from "@/components/tasks/tasks-workspace";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type TaskStatus = TaskItem["status"];

type CreateContext = {
  companyId?: string;
  contactId?: string;
  defaultResponsibleId: string;
  label: string;
  opportunityId?: string;
};

type RelatedTasksCardProps = {
  canCreate?: boolean;
  createContext: CreateContext;
  profiles: TaskProfileOption[];
  tasks: TaskItem[];
};

const taskTypeLabels: Record<TaskType, string> = {
  first_contact: "Primeiro contato",
  qualification: "Qualificação",
  follow_up: "Follow-up",
  scheduling: "Agendamento",
  proposal: "Proposta",
  management: "Gestão",
};

const selectClasses = "mt-1 h-8 w-full rounded-lg border border-[var(--gray-6)] bg-[var(--gray-1)] px-2.5 text-sm outline-none focus:border-[var(--primary-8)] focus:ring-3 focus:ring-[var(--primary-8)]/50 aria-invalid:border-[var(--tomato-9)]";

function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function currentDate() {
  const values = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).formatToParts(new Date()).map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function Feedback({ state }: { state: TaskActionState | null }) {
  if (!state || state.ok) return null;
  return <p className="rounded-lg bg-[var(--tomato-3)] p-3 text-sm text-[var(--tomato-11)]" role="alert">{state.message}</p>;
}

function FieldError({ children }: { children?: string }) {
  return children ? <p className="mt-1 text-xs text-[var(--tomato-11)]">{children}</p> : null;
}

function SubmitButton({ children }: { children: string }) {
  const { pending } = useFormStatus();
  return <Button disabled={pending} type="submit">{pending ? "Salvando..." : children}</Button>;
}

function CreateTaskDialog({ context, onClose, profiles }: {
  context: CreateContext;
  onClose: () => void;
  profiles: TaskProfileOption[];
}) {
  const router = useRouter();
  const [state, action] = useActionState(saveTaskAction, null);
  const [requestKey] = useState(() => crypto.randomUUID());

  useEffect(() => {
    if (!state?.ok) return;
    onClose();
    router.refresh();
  }, [onClose, router, state]);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Criar tarefa</DialogTitle>
          <DialogDescription>A tarefa será vinculada a {context.label}.</DialogDescription>
        </DialogHeader>
        <form action={action} className="grid grid-cols-2 gap-4">
          <input name="requestKey" type="hidden" value={requestKey} />
          <input name="opportunityId" type="hidden" value={context.opportunityId ?? ""} />
          <input name="companyId" type="hidden" value={context.companyId ?? ""} />
          <input name="contactId" type="hidden" value={context.contactId ?? ""} />
          <div className="col-span-2"><Feedback state={state} /></div>
          <label className="col-span-2 text-sm font-medium">Nome <span className="text-[var(--tomato-11)]">*</span><Input aria-invalid={Boolean(state?.fieldErrors?.title)} className="mt-1" maxLength={180} name="title" required /><FieldError>{state?.fieldErrors?.title}</FieldError></label>
          <label className="text-sm font-medium">Tipo <span className="text-[var(--tomato-11)]">*</span><select className={selectClasses} defaultValue="follow_up" name="type" required>{Object.entries(taskTypeLabels).filter(([value]) => !context.opportunityId || value !== "management").map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><FieldError>{state?.fieldErrors?.type}</FieldError></label>
          <label className="text-sm font-medium">Responsável <span className="text-[var(--tomato-11)]">*</span><select className={selectClasses} defaultValue={context.defaultResponsibleId} name="responsibleId" required>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select><FieldError>{state?.fieldErrors?.responsibleId}</FieldError></label>
          <label className="text-sm font-medium">Data <span className="text-[var(--tomato-11)]">*</span><Input className="mt-1" defaultValue={currentDate()} name="dueDate" required type="date" /><FieldError>{state?.fieldErrors?.dueDate}</FieldError></label>
          <label className="text-sm font-medium">Horário<Input className="mt-1" name="dueTime" type="time" /></label>
          <label className="col-span-2 text-sm font-medium">Descrição<Textarea className="mt-1 min-h-20" maxLength={4000} name="description" /></label>
          <DialogFooter className="col-span-2"><DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose><SubmitButton>Criar tarefa</SubmitButton></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReopenTaskDialog({ onClose, task }: { onClose: () => void; task: TaskItem }) {
  const router = useRouter();
  const [state, action] = useActionState(reopenTaskAction, null);
  const [requestKey] = useState(() => crypto.randomUUID());
  useEffect(() => {
    if (!state?.ok) return;
    onClose();
    router.refresh();
  }, [onClose, router, state]);
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader><DialogTitle>Marcar como pendente?</DialogTitle><DialogDescription>O vencimento original será preservado. Interações já registradas não serão removidas.</DialogDescription></DialogHeader>
        <form action={action}>
          <input name="requestKey" type="hidden" value={requestKey} /><input name="taskId" type="hidden" value={task.id} />
          <Feedback state={state} />
          <DialogFooter className="mt-4"><DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose><SubmitButton>Marcar como pendente</SubmitButton></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TaskDetailsDialog({ onClose, onComplete, onReopen, task }: {
  onClose: () => void;
  onComplete: () => void;
  onReopen: () => void;
  task: TaskItem;
}) {
  const statusLabel = task.status === "pending" ? "Pendente" : task.status === "completed" ? "Concluída" : "Cancelada";
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader><DialogTitle>{task.title}</DialogTitle><DialogDescription>{taskTypeLabels[task.type]} · {statusLabel}</DialogDescription></DialogHeader>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <div><p className="text-xs text-[var(--gray-11)]">Responsável</p><p className="mt-1">{task.responsible_name}</p></div>
          <div><p className="text-xs text-[var(--gray-11)]">Vencimento</p><p className="mt-1">{formatDate(task.due_date)}{task.due_time ? ` às ${task.due_time.slice(0, 5)}` : " · Sem horário"}</p></div>
          <div><p className="text-xs text-[var(--gray-11)]">Origem</p><p className="mt-1">{task.creation_source === "system" ? "Automática" : "Manual"}</p></div>
          <div><p className="text-xs text-[var(--gray-11)]">Criada por</p><p className="mt-1">{task.creator_name} · {formatDateTime(task.created_at)}</p></div>
          {task.opportunity ? <div className="col-span-2"><p className="text-xs text-[var(--gray-11)]">Oportunidade</p><Link className="mt-1 inline-block text-[var(--primary-11)] hover:underline" href={`/oportunidades/${task.opportunity.id}`}>{task.opportunity.name}</Link></div> : null}
          {task.description ? <div className="col-span-2"><p className="text-xs text-[var(--gray-11)]">Descrição</p><p className="mt-1 whitespace-pre-wrap text-[var(--gray-11)]">{task.description}</p></div> : null}
          {task.completed_at ? <div className="col-span-2"><p className="text-xs text-[var(--gray-11)]">Conclusão</p><p className="mt-1">{task.completed_by_name ?? "Usuário"} · {formatDateTime(task.completed_at)}</p></div> : null}
          {task.cancellation_reason ? <div className="col-span-2"><p className="text-xs text-[var(--gray-11)]">Motivo do cancelamento</p><p className="mt-1">{task.cancellation_reason}</p></div> : null}
        </div>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Fechar</DialogClose>
          {task.status === "pending" ? <Button onClick={onComplete} type="button"><CheckIcon />Concluir</Button> : null}
          {task.status === "completed" ? <Button onClick={onReopen} type="button" variant="outline"><ArrowPathIcon />Marcar como pendente</Button> : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RelatedTasksCard({ canCreate = true, createContext, profiles, tasks }: RelatedTasksCardProps) {
  const [tab, setTab] = useState<TaskStatus>("pending");
  const [open, setOpen] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [completingTask, setCompletingTask] = useState<TaskItem | null>(null);
  const [reschedulingTask, setReschedulingTask] = useState<TaskItem | null>(null);
  const [reopeningTask, setReopeningTask] = useState<TaskItem | null>(null);
  const visibleTasks = useMemo(() => tasks.filter((task) => task.status === tab), [tab, tasks]);

  function openCompletion(task: TaskItem) {
    setSelectedTask(null);
    setCompletingTask(task);
  }

  function openReopen(task: TaskItem) {
    setSelectedTask(null);
    setReopeningTask(task);
  }

  return (
    <>
      <div className={`flex items-center justify-between gap-3 px-5 py-4 ${open ? "border-b border-[var(--gray-6)]" : ""}`}>
        <h2 className="text-sm font-semibold">Tarefas</h2>
        <div className="flex items-center gap-2">
          {canCreate ? <Button onClick={() => setCreating(true)} size="sm" type="button" variant="outline"><PlusCircleIcon />Criar tarefa</Button> : null}
          <Button aria-expanded={open} aria-label={`${open ? "Recolher" : "Expandir"} tarefas`} onClick={() => setOpen((current) => !current)} size="icon-sm" type="button" variant="outline"><ChevronDownIcon className={`transition-transform ${open ? "" : "-rotate-90"}`} /></Button>
        </div>
      </div>
      {open ? <div className="px-5 pb-5 pt-4">
        <Tabs className="mb-4 gap-0" onValueChange={(value) => setTab(value as TaskStatus)} value={tab}>
          <TabsList className="h-8 p-0.5"><TabsTrigger className="h-7 text-xs" value="pending">Pendentes</TabsTrigger><TabsTrigger className="h-7 text-xs" value="completed">Concluídas</TabsTrigger><TabsTrigger className="h-7 text-xs" value="cancelled">Canceladas</TabsTrigger></TabsList>
        </Tabs>
        <div className="grid gap-1">
          {visibleTasks.map((task) => (
            <div className="group flex items-start gap-3 rounded-lg px-1 py-2 hover:bg-[var(--gray-2)]" key={task.id}>
              <button
                aria-label={task.status === "pending" ? `Concluir ${task.title}` : task.status === "completed" ? `Marcar ${task.title} como pendente` : `Tarefa cancelada: ${task.title}`}
                className={`mt-0.5 inline-grid size-4 shrink-0 place-items-center rounded-[4px] border ${task.status === "completed" ? "border-[var(--primary-9)] bg-[var(--primary-9)] text-[var(--fixed-dark)]" : "border-[var(--gray-7)]"}`}
                disabled={task.status === "cancelled"}
                onClick={() => task.status === "pending" ? openCompletion(task) : openReopen(task)}
                type="button"
              >{task.status === "completed" ? <CheckIcon className="size-3" strokeWidth={3} /> : null}</button>
              <button className="min-w-0 flex-1 text-left" onClick={() => setSelectedTask(task)} type="button">
                <span className="flex items-start justify-between gap-3"><span className="text-xs font-semibold group-hover:text-[var(--primary-11)]">{task.title}</span><span className="shrink-0 text-[10px]">Tipo: {taskTypeLabels[task.type]}</span></span>
                <span className="mt-1 flex items-center gap-1 text-[10px] text-[var(--gray-10)]"><CalendarDaysIcon className="size-3" />{formatDate(task.due_date)}{task.due_time ? ` às ${task.due_time.slice(0, 5)}` : ""} · {task.responsible_name}</span>
              </button>
            </div>
          ))}
          {!visibleTasks.length ? <p className="py-3 text-xs text-[var(--gray-10)]">Nenhuma tarefa nesta situação.</p> : null}
        </div>
      </div> : null}
      {creating ? <CreateTaskDialog context={createContext} onClose={() => setCreating(false)} profiles={profiles} /> : null}
      {selectedTask ? <TaskDetailsDialog onClose={() => setSelectedTask(null)} onComplete={() => openCompletion(selectedTask)} onReopen={() => openReopen(selectedTask)} task={selectedTask} /> : null}
      {completingTask ? <CompleteTaskDialog onClose={() => setCompletingTask(null)} onReschedule={(task) => { setCompletingTask(null); setReschedulingTask(task); }} task={completingTask} /> : null}
      {reschedulingTask ? <RescheduleDialog onClose={() => setReschedulingTask(null)} task={reschedulingTask} today={currentDate()} /> : null}
      {reopeningTask ? <ReopenTaskDialog onClose={() => setReopeningTask(null)} task={reopeningTask} /> : null}
    </>
  );
}
