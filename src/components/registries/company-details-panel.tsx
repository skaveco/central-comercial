"use client";

import {
  ArrowPathIcon,
  ArrowsRightLeftIcon,
  BoltIcon,
  BriefcaseIcon,
  ChevronRightIcon,
  CurrencyDollarIcon,
  EllipsisVerticalIcon,
  LinkIcon,
  PaperClipIcon,
  PencilSquareIcon,
  PlusCircleIcon,
  TrashIcon,
  TrophyIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

import {
  addCompanyNoteAction,
  deleteCompanyNoteAction,
  linkCompanyContactAction,
  unlinkCompanyContactAction,
  updateCompanyNoteAction,
  type CompanyDetailActionState,
} from "@/app/(app)/cadastros/empresas/[id]/actions";
import { CompanyAttachments, type CompanyAttachmentItem } from "@/components/registries/company-attachments";
import { CompanyFormDialog, type CompanyListItem, type SegmentOption } from "@/components/registries/companies-panel";
import { RelatedTasksCard } from "@/components/tasks/related-tasks-card";
import type { TaskItem, TaskProfileOption } from "@/components/tasks/tasks-workspace";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

export type CompanyContactItem = {
  contact_id: string;
  job_title: string | null;
  contact: { id: string; name: string; email: string | null; phone: string | null; is_active: boolean } | null;
};

export type CompanyOpportunityItem = {
  id: string;
  name: string;
  commercial_status: "active" | "won" | "lost" | "disqualified" | "archived";
  final_value: number | null;
  created_at: string;
  responsible: { name: string } | null;
  contact: { name: string } | null;
  stage: { name: string } | null;
};

export type CompanyNoteItem = {
  id: string;
  body: string;
  created_at: string;
  updated_at: string;
  creator: { name: string } | null;
};

export type CompanyActivityItem = {
  id: string;
  event_type: string;
  summary: string;
  metadata: Record<string, unknown>;
  occurred_at: string;
  actor: { name: string } | null;
};

export type ContactOption = { id: string; name: string; email: string | null };

export type CompanyMetrics = {
  total: number;
  won: number;
  lost: number;
  wonValue: number;
};

type CompanyDetailsPanelProps = {
  actorId: string;
  activities: CompanyActivityItem[];
  activityCount: number;
  activityLimit: number;
  attachments: CompanyAttachmentItem[];
  availableContacts: ContactOption[];
  company: CompanyListItem;
  contacts: CompanyContactItem[];
  initialEditOpen: boolean;
  metrics: CompanyMetrics;
  notes: CompanyNoteItem[];
  opportunities: CompanyOpportunityItem[];
  opportunityPage: number;
  opportunityPages: number;
  opportunityTotal: number;
  segments: SegmentOption[];
  taskProfiles: TaskProfileOption[];
  tasks: TaskItem[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value)).replace(",", " às");
}

function formatDateOnly(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatCnpj(value: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";
  if (digits.length !== 14) return value || "—";
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function formatPhone(value: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";
  if (digits.length === 11) return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  if (digits.length === 10) return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  return value || "—";
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase("pt-BR");
}

function avatarClasses(name: string) {
  const palettes = [
    "bg-[var(--indigo-4)] text-[var(--indigo-12)]",
    "bg-[var(--plum-4)] text-[var(--plum-12)]",
    "bg-[var(--grass-5)] text-[var(--grass-12)]",
  ];
  const index = Array.from(name).reduce((total, character) => total + character.charCodeAt(0), 0) % palettes.length;
  return palettes[index];
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-lg bg-[var(--gray-1)] ${className}`}>{children}</section>;
}

function SectionHeader({ action, title }: { action?: ReactNode; title: string }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 px-5 py-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      {action}
    </div>
  );
}

function MetricCard({ icon, label, subtitle, value, highlighted = false }: { icon: ReactNode; label: string; subtitle: string; value: string; highlighted?: boolean }) {
  return (
    <Card className={`min-h-[116px] p-4 ${highlighted ? "bg-[var(--primary-9)] text-[var(--primary-12)]" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{label}</p>
          <p className={`mt-1 text-xs ${highlighted ? "text-[var(--primary-12)]/80" : "text-[var(--gray-11)]"}`}>{subtitle}</p>
        </div>
        <span className={`flex size-8 items-center justify-center rounded-md ${highlighted ? "bg-[var(--gray-1)]" : "bg-[var(--gray-3)]"}`}>{icon}</span>
      </div>
      <p className="mt-6 text-xl font-semibold">{value}</p>
    </Card>
  );
}

function PendingButton({ children, variant = "default" }: { children: ReactNode; variant?: "default" | "destructive" }) {
  const { pending } = useFormStatus();
  return <Button disabled={pending} type="submit" variant={variant}>{pending ? "Salvando..." : children}</Button>;
}

type DetailAction = (
  previousState: CompanyDetailActionState | null,
  formData: FormData,
) => Promise<CompanyDetailActionState>;

function NoteDialog({ companyId, note, open, onOpenChange }: { companyId: string; note: CompanyNoteItem | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const initialBody = note?.body ?? "";
  const [draft, setDraft] = useState(initialBody);
  const noteAction: DetailAction = note ? updateCompanyNoteAction : addCompanyNoteAction;
  const [state, action] = useActionState(noteAction, null);

  useEffect(() => {
    if (state?.ok) {
      onOpenChange(false);
      router.refresh();
    }
  }, [onOpenChange, router, state]);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && draft !== initialBody && !window.confirm("Descartar as alterações desta nota?")) return;
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{note ? "Editar nota" : "Adicionar nota"}</DialogTitle>
          <DialogDescription>{note ? "A autoria e a data de criação serão preservadas." : "Registre uma informação relevante sobre a empresa."}</DialogDescription>
        </DialogHeader>
        <form action={action}>
          <input name="companyId" type="hidden" value={companyId} />
          <input name="noteId" type="hidden" value={note?.id ?? ""} />
          {state && !state.ok ? <p className="mb-3 text-sm text-[var(--tomato-11)]" role="alert">{state.message}</p> : null}
          <label className="text-sm font-medium">
            Nota
            <Textarea aria-invalid={Boolean(state?.fieldErrors?.body)} autoFocus className="mt-1 min-h-28" name="body" onChange={(event) => setDraft(event.target.value)} required value={draft} />
          </label>
          <DialogFooter className="mt-4">
            <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
            <PendingButton>Salvar</PendingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteNoteDialog({ companyId, note, onClose }: { companyId: string; note: CompanyNoteItem | null; onClose: () => void }) {
  const router = useRouter();
  const [state, action] = useActionState(deleteCompanyNoteAction, null);
  useEffect(() => {
    if (state?.ok) {
      onClose();
      router.refresh();
    }
  }, [onClose, router, state]);
  return (
    <Dialog open={Boolean(note)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir nota?</DialogTitle>
          <DialogDescription>A nota deixará de aparecer no cadastro. A exclusão será registrada no histórico.</DialogDescription>
        </DialogHeader>
        {state && !state.ok ? <p className="text-sm text-[var(--tomato-11)]">{state.message}</p> : null}
        <form action={action}>
          <input name="companyId" type="hidden" value={companyId} />
          <input name="noteId" type="hidden" value={note?.id ?? ""} />
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
            <PendingButton variant="destructive">Excluir</PendingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LinkContactDialog({ companyId, contacts, open, onOpenChange }: { companyId: string; contacts: ContactOption[]; open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [state, action] = useActionState(linkCompanyContactAction, null);
  useEffect(() => {
    if (state?.ok) {
      onOpenChange(false);
      router.refresh();
    }
  }, [onOpenChange, router, state]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Vincular contato</DialogTitle>
          <DialogDescription>Selecione um contato ativo e informe seu cargo nesta empresa, se necessário.</DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <input name="companyId" type="hidden" value={companyId} />
          {state && !state.ok ? <p className="text-sm text-[var(--tomato-11)]" role="alert">{state.message}</p> : null}
          <label className="block text-sm font-medium">
            Contato <span className="text-[var(--tomato-11)]">*</span>
            <select className="mt-1 h-8 w-full rounded-lg border border-[var(--gray-6)] bg-[var(--gray-1)] px-2.5 text-sm" name="contactId" required>
              <option value="">Selecione um contato</option>
              {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}{contact.email ? ` — ${contact.email}` : ""}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Cargo ou função
            <Input className="mt-1" name="jobTitle" placeholder="Ex.: Diretor comercial" />
          </label>
          {contacts.length === 0 ? <p className="text-xs text-[var(--gray-11)]">Não há contatos ativos disponíveis. Cadastre um contato primeiro.</p> : null}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
            <PendingButton>Vincular</PendingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UnlinkContactDialog({ companyId, link, onClose }: { companyId: string; link: CompanyContactItem | null; onClose: () => void }) {
  const router = useRouter();
  const [state, action] = useActionState(unlinkCompanyContactAction, null);
  useEffect(() => {
    if (state?.ok) {
      onClose();
      router.refresh();
    }
  }, [onClose, router, state]);
  return (
    <Dialog open={Boolean(link)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Desvincular contato?</DialogTitle>
          <DialogDescription>O vínculo deixará de ser usado em novas oportunidades. Relações anteriores serão preservadas.</DialogDescription>
        </DialogHeader>
        {state && !state.ok ? <p className="text-sm text-[var(--tomato-11)]">{state.message}</p> : null}
        <form action={action}>
          <input name="companyId" type="hidden" value={companyId} />
          <input name="contactId" type="hidden" value={link?.contact_id ?? ""} />
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
            <PendingButton variant="destructive">Desvincular</PendingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function opportunityStatus(opportunity: CompanyOpportunityItem) {
  if (opportunity.commercial_status === "active") return { label: opportunity.stage?.name ?? "Em andamento", className: "bg-[var(--indigo-3)] text-[var(--indigo-11)]" };
  if (opportunity.commercial_status === "won") return { label: "Ganho", className: "bg-[var(--grass-3)] text-[var(--grass-11)]" };
  if (opportunity.commercial_status === "lost") return { label: "Perdido", className: "bg-[var(--tomato-3)] text-[var(--tomato-11)]" };
  if (opportunity.commercial_status === "disqualified") return { label: "Desqualificado", className: "bg-[var(--amber-3)] text-[var(--amber-11)]" };
  return { label: "Arquivado", className: "bg-[var(--gray-3)] text-[var(--gray-11)]" };
}

function activityCategory(eventType: string) {
  if (eventType.includes("note")) return "notes";
  if (eventType.includes("interaction") || eventType === "contact_registered") return "interactions";
  if (eventType.includes("contact")) return "contacts";
  if (eventType.includes("opportunity") || eventType.includes("stage") || eventType.includes("won") || eventType.includes("lost")) return "opportunities";
  if (eventType.includes("attachment")) return "attachments";
  return "company";
}

export function CompanyDetailsPanel({
  actorId,
  activities,
  activityCount,
  activityLimit,
  attachments,
  availableContacts,
  company,
  contacts,
  initialEditOpen,
  metrics,
  notes,
  opportunities,
  opportunityPage,
  opportunityPages,
  opportunityTotal,
  segments,
  taskProfiles,
  tasks,
}: CompanyDetailsPanelProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(initialEditOpen);
  const [noteOpen, setNoteOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<CompanyNoteItem | null>(null);
  const [deletingNote, setDeletingNote] = useState<CompanyNoteItem | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [unlinkingContact, setUnlinkingContact] = useState<CompanyContactItem | null>(null);
  const [activityFilter, setActivityFilter] = useState("all");
  const closed = metrics.won + metrics.lost;
  const wonRate = closed ? (metrics.won / closed) * 100 : 0;
  const lostRate = closed ? (metrics.lost / closed) * 100 : 0;
  const filteredActivities = useMemo(
    () => activityFilter === "all" ? activities : activities.filter((activity) => activityCategory(activity.event_type) === activityFilter),
    [activities, activityFilter],
  );
  const firstOpportunity = opportunityTotal ? (opportunityPage - 1) * 10 + 1 : 0;
  const lastOpportunity = Math.min(opportunityPage * 10, opportunityTotal);

  function closeEdit(open: boolean) {
    setEditOpen(open);
    if (!open && initialEditOpen) router.replace(`/cadastros/empresas/${company.id}`);
  }

  return (
    <main className="mx-auto w-full max-w-[1440px] p-5">
      <header className="mb-4 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-xl font-semibold leading-8">{company.name}</h1>
          <p className="text-sm text-[var(--gray-11)]">Cliente desde {formatDateOnly(company.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button disabled={!company.is_active} onClick={() => setEditOpen(true)} variant="outline"><PencilSquareIcon />Editar empresa</Button>
          <DropdownMenu>
            <DropdownMenuTrigger disabled={!company.is_active} render={<Button variant="outline" />}><BoltIcon />Ações rápidas</DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled title="O cadastro de oportunidades será implementado no módulo correspondente"><PlusCircleIcon />Criar oportunidade</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLinkOpen(true)}><ArrowsRightLeftIcon />Vincular contato</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setEditingNote(null); setNoteOpen(true); }}><PlusCircleIcon />Adicionar nota</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAttachmentOpen(true)}><PaperClipIcon />Adicionar anexo</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button disabled title="Disponível após a implementação do cadastro de oportunidades"><PlusCircleIcon />Nova oportunidade</Button>
        </div>
      </header>

      {!company.is_active ? (
        <div className="mb-4 rounded-lg border border-[var(--amber-6)] bg-[var(--amber-3)] px-4 py-3 text-sm text-[var(--amber-12)]">
          Esta empresa está desativada. Os dados permanecem disponíveis para consulta, mas novas alterações e vínculos estão bloqueados até a reativação.
        </div>
      ) : null}

      <div className="grid grid-cols-4 gap-3">
        <MetricCard icon={<BriefcaseIcon className="size-4" />} label="Oportunidades" subtitle="Total de oportunidades" value={String(metrics.total)} />
        <MetricCard icon={<BriefcaseIcon className="size-4" />} label="Perdidos" subtitle={`${lostRate.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% de taxa de perda`} value={String(metrics.lost)} />
        <MetricCard icon={<TrophyIcon className="size-4" />} label="Ganhos" subtitle={`${wonRate.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% de taxa de ganho`} value={String(metrics.won)} />
        <MetricCard highlighted icon={<CurrencyDollarIcon className="size-4" />} label="Valor ganho" subtitle="Total vendido" value={formatCurrency(metrics.wonValue)} />
      </div>

      <div className="mt-3 grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_350px]">
        <div className="space-y-3">
          <Card>
            <SectionHeader title="Informações principais" />
            <dl className="grid grid-cols-2 px-5 pb-5">
              {[
                ["Nome", company.name], ["CNPJ", formatCnpj(company.cnpj)],
                ["E-mail", company.email ?? "—"], ["Telefone", formatPhone(company.phone)],
                ["Endereço", company.address ?? "—"], ["Segmento", company.segment?.name ?? "—"],
              ].map(([label, value]) => (
                <div className="border-b border-[var(--gray-6)] py-3 last:border-b-0 even:pl-6" key={label}>
                  <dt className="text-xs text-[var(--gray-11)]">{label}</dt>
                  <dd className="mt-1 text-sm">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="overflow-hidden">
            <RelatedTasksCard
              canCreate={company.is_active}
              createContext={{ companyId: company.id, defaultResponsibleId: actorId, label: "esta empresa" }}
              profiles={taskProfiles}
              tasks={tasks}
            />
          </Card>

          <Card>
            <SectionHeader
              action={<Button disabled={!company.is_active} onClick={() => setLinkOpen(true)} size="sm" variant="outline"><ArrowsRightLeftIcon />Vincular contato</Button>}
              title="Contatos vinculados"
            />
            {contacts.length ? (
              <div className="px-5 pb-3">
                {contacts.map((link) => link.contact ? (
                  <div className="flex min-h-16 items-center gap-3 border-b border-[var(--gray-6)] last:border-b-0" key={link.contact_id}>
                    <span className={`flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarClasses(link.contact.name)}`}>{initials(link.contact.name)}</span>
                    <Link className="min-w-0 flex-1" href={`/cadastros/contatos/${link.contact.id}`}>
                      <p className="truncate text-sm font-medium">{link.contact.name}</p>
                      <p className="mt-0.5 truncate text-xs text-[var(--gray-11)]">{link.job_title ?? "Cargo não informado"}{link.contact.is_active ? "" : " · Contato desativado"}</p>
                    </Link>
                    {company.is_active ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button aria-label={`Ações do vínculo de ${link.contact.name}`} size="icon-sm" variant="ghost" />}><EllipsisVerticalIcon /></DropdownMenuTrigger>
                        <DropdownMenuContent align="end"><DropdownMenuItem onClick={() => setUnlinkingContact(link)} variant="destructive"><LinkIcon />Desvincular</DropdownMenuItem></DropdownMenuContent>
                      </DropdownMenu>
                    ) : <ChevronRightIcon className="size-4 text-[var(--gray-11)]" />}
                  </div>
                ) : null)}
              </div>
            ) : (
              <div className="flex min-h-28 flex-col items-center justify-center px-5 pb-5 text-center">
                <UserGroupIcon className="size-6 text-[var(--gray-9)]" />
                <p className="mt-2 text-sm font-medium">Nenhum contato vinculado</p>
                <p className="mt-1 text-xs text-[var(--gray-11)]">Vincule um contato ativo para associá-lo a esta empresa.</p>
              </div>
            )}
          </Card>

          <Card>
            <SectionHeader action={<Button disabled size="sm" title="Disponível com o módulo de oportunidades" variant="outline"><PlusCircleIcon />Criar oportunidade</Button>} title="Oportunidades" />
            {opportunities.length ? (
              <Table>
                <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Oportunidade</TableHead><TableHead>Responsável</TableHead><TableHead>Contato</TableHead><TableHead>Etapa</TableHead><TableHead className="w-[130px]">Valor</TableHead></TableRow></TableHeader>
                <TableBody>
                  {opportunities.map((opportunity) => {
                    const status = opportunityStatus(opportunity);
                    return <TableRow key={opportunity.id}><TableCell>{opportunity.name}</TableCell><TableCell>{opportunity.responsible?.name ?? "—"}</TableCell><TableCell>{opportunity.contact?.name ?? "—"}</TableCell><TableCell><span className={`rounded-full px-2 py-1 text-xs ${status.className}`}>{status.label}</span></TableCell><TableCell>{opportunity.final_value === null ? "—" : formatCurrency(opportunity.final_value)}</TableCell></TableRow>;
                  })}
                </TableBody>
              </Table>
            ) : <p className="px-5 pb-5 text-sm text-[var(--gray-11)]">Nenhuma oportunidade vinculada a esta empresa.</p>}
            <div className="flex min-h-12 items-center justify-between gap-4 px-5 py-2">
              <p className="text-sm text-[var(--gray-11)]">Mostrando {firstOpportunity}–{lastOpportunity} de {opportunityTotal} oportunidades</p>
              <div className="flex items-center gap-3"><span className="text-sm text-[var(--gray-11)]">Página {opportunityPage} de {opportunityPages}</span><Button disabled={opportunityPage <= 1} onClick={() => router.push(`?oppPage=${opportunityPage - 1}`)} size="sm" variant="outline">Anterior</Button><Button disabled={opportunityPage >= opportunityPages} onClick={() => router.push(`?oppPage=${opportunityPage + 1}`)} size="sm" variant="outline">Próxima</Button></div>
            </div>
          </Card>

          <Card>
            <SectionHeader action={<Button disabled={!company.is_active} onClick={() => { setEditingNote(null); setNoteOpen(true); }} size="sm" variant="outline"><PlusCircleIcon />Adicionar nota</Button>} title="Notas da empresa" />
            {notes.length ? (
              <div className="px-5">
                {notes.map((note) => (
                  <article className="flex gap-3 border-b border-[var(--gray-6)] py-4 last:border-b-0" key={note.id}>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--indigo-4)] text-xs font-semibold text-[var(--indigo-12)]">{initials(note.creator?.name ?? "Sistema")}</span>
                    <div className="min-w-0 flex-1"><p className="whitespace-pre-wrap text-sm">{note.body}</p><p className="mt-2 text-xs text-[var(--gray-11)]">{note.creator?.name ?? "Sistema"} · {formatDate(note.created_at)}{note.updated_at !== note.created_at ? " · Editada" : ""}</p></div>
                    {company.is_active ? <DropdownMenu><DropdownMenuTrigger render={<Button aria-label="Ações da nota" size="icon-sm" variant="ghost" />}><EllipsisVerticalIcon /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => { setEditingNote(note); setNoteOpen(true); }}><PencilSquareIcon />Editar</DropdownMenuItem><DropdownMenuItem onClick={() => setDeletingNote(note)} variant="destructive"><TrashIcon />Excluir</DropdownMenuItem></DropdownMenuContent></DropdownMenu> : null}
                  </article>
                ))}
              </div>
            ) : <p className="px-5 pb-5 text-sm text-[var(--gray-11)]">Nenhuma nota adicionada.</p>}
          </Card>

          <CompanyAttachments
            attachments={attachments}
            companyActive={company.is_active}
            companyId={company.id}
            onUploadOpenChange={setAttachmentOpen}
            uploadOpen={attachmentOpen}
          />
        </div>

        <Card className="sticky top-3 max-h-[calc(100vh-108px)] overflow-y-auto">
          <SectionHeader action={<select aria-label="Filtrar histórico" className="h-7 rounded-md border border-[var(--gray-6)] bg-[var(--gray-1)] px-2 text-xs" onChange={(event) => setActivityFilter(event.target.value)} value={activityFilter}><option value="all">Todos os tipos</option><option value="company">Empresa</option><option value="contacts">Contatos</option><option value="opportunities">Oportunidades</option><option value="notes">Notas</option><option value="attachments">Anexos</option><option value="interactions">Interações</option></select>} title="Histórico de atividades" />
          {filteredActivities.length ? (
            <div className="px-5 pb-5">
              {filteredActivities.map((activity, index) => <article className="relative flex gap-4 pb-7 last:pb-0" key={activity.id}>{index < filteredActivities.length - 1 ? <span className="absolute top-4 bottom-0 left-[3px] w-px bg-[var(--gray-6)]" /> : null}<span className={`relative mt-1 size-2 shrink-0 rounded-full ${index === 0 ? "bg-[var(--primary-11)]" : "bg-[var(--gray-7)]"}`} /><div><p className={`text-sm font-semibold ${index === 0 ? "text-[var(--primary-11)]" : ""}`}>{activity.summary}</p><p className="mt-1 text-xs text-[var(--gray-11)]">{activity.actor?.name ?? "Sistema"} · {formatDate(activity.occurred_at)}</p></div></article>)}
              {activityCount > activityLimit ? <Button className="mt-4 w-full" onClick={() => router.push(`?activities=${activityLimit + 20}`)} size="sm" variant="outline"><ArrowPathIcon />Carregar mais</Button> : null}
            </div>
          ) : <p className="px-5 pb-5 text-sm text-[var(--gray-11)]">Nenhuma atividade encontrada.</p>}
        </Card>
      </div>

      <CompanyFormDialog company={company} onOpenChange={closeEdit} open={editOpen} segments={segments} />
      <NoteDialog key={`${editingNote?.id ?? "new"}-${noteOpen}`} companyId={company.id} note={editingNote} onOpenChange={setNoteOpen} open={noteOpen} />
      <DeleteNoteDialog companyId={company.id} note={deletingNote} onClose={() => setDeletingNote(null)} />
      <LinkContactDialog companyId={company.id} contacts={availableContacts} onOpenChange={setLinkOpen} open={linkOpen} />
      <UnlinkContactDialog companyId={company.id} link={unlinkingContact} onClose={() => setUnlinkingContact(null)} />
    </main>
  );
}
