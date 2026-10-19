"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  EllipsisVerticalIcon,
  PencilSquareIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";

import {
  reorderOpportunityCatalogItemAction,
  saveOpportunityCatalogItemAction,
  setOpportunityCatalogItemStatusAction,
  type OpportunityCatalog,
  type OpportunityCatalogActionState,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type OpportunityCatalogItem = {
  id: string;
  is_active: boolean;
  name: string;
  sort_order: number;
  updated_at: string;
};

type CatalogConfig = {
  catalog: OpportunityCatalog;
  description: string;
  emptyDescription: string;
  emptyTitle: string;
  fieldLabel: string;
  itemLabel: string;
  newLabel: string;
  title: string;
};

const catalogConfigs: Record<OpportunityCatalog, CatalogConfig> = {
  qualification: {
    catalog: "qualification",
    description: "Itens necessários para qualificar o lead. Mantenha de 2 a 5 ativos.",
    emptyDescription: "Cadastre de 2 a 5 itens para habilitar a qualificação das oportunidades.",
    emptyTitle: "Nenhum item de qualificação cadastrado.",
    fieldLabel: "Item de qualificação",
    itemLabel: "item de qualificação",
    newLabel: "Novo item de qualificação",
    title: "Qualificação",
  },
  source: {
    catalog: "source",
    description: "Cadastro de origem dos leads.",
    emptyDescription: "Crie a primeira origem para disponibilizá-la nas oportunidades.",
    emptyTitle: "Nenhuma origem cadastrada.",
    fieldLabel: "Origem",
    itemLabel: "origem",
    newLabel: "Nova origem",
    title: "Origens",
  },
  "loss-reason": {
    catalog: "loss-reason",
    description: "Motivos obrigatórios ao registrar uma oportunidade como perdida.",
    emptyDescription: "Crie o primeiro motivo para registrar perdas de oportunidades.",
    emptyTitle: "Nenhum motivo de perda cadastrado.",
    fieldLabel: "Motivo de perda",
    itemLabel: "motivo de perda",
    newLabel: "Novo motivo de perda",
    title: "Motivos de perda",
  },
};

function ActionMessage({ state }: { state: OpportunityCatalogActionState | null }) {
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

function CatalogFormDialog({
  config,
  item,
  onClose,
}: {
  config: CatalogConfig;
  item: OpportunityCatalogItem | null;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveOpportunityCatalogItemAction, null);

  useEffect(() => {
    if (state?.ok) onClose();
  }, [onClose, state]);

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? `Editar ${config.itemLabel}` : config.newLabel}</DialogTitle>
          <DialogDescription>
            {item ? "Atualize o nome exibido nas oportunidades." : config.description}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="contents">
          <input name="catalog" type="hidden" value={config.catalog} />
          {item ? <input name="id" type="hidden" value={item.id} /> : null}
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor={`${config.catalog}-name`}>
              {config.fieldLabel} <span className="text-[var(--tomato-11)]">*</span>
            </label>
            <Input
              aria-describedby={state?.fieldErrors?.name ? `${config.catalog}-name-error` : undefined}
              aria-invalid={Boolean(state?.fieldErrors?.name)}
              autoFocus
              defaultValue={item?.name ?? ""}
              id={`${config.catalog}-name`}
              name="name"
              required
            />
            {state?.fieldErrors?.name ? (
              <p className="text-xs text-[var(--tomato-11)]" id={`${config.catalog}-name-error`}>
                {state.fieldErrors.name}
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

function CatalogStatusDialog({
  config,
  item,
  nextStatus,
  onClose,
}: {
  config: CatalogConfig;
  item: OpportunityCatalogItem;
  nextStatus: boolean;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(setOpportunityCatalogItemStatusAction, null);
  const linkedRecordsMessage =
    config.catalog === "qualification"
      ? "As respostas anteriores serão preservadas."
      : "Os vínculos existentes serão preservados.";

  useEffect(() => {
    if (state?.ok) onClose();
  }, [onClose, state]);

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{nextStatus ? `Reativar ${config.itemLabel}` : `Desativar ${config.itemLabel}`}</DialogTitle>
          <DialogDescription>
            {nextStatus
              ? `“${item.name}” voltará a ficar disponível em novas seleções.`
              : `“${item.name}” deixará de aparecer em novas seleções. ${linkedRecordsMessage}`}
          </DialogDescription>
        </DialogHeader>

        <ActionMessage state={state} />

        <form action={formAction} className="contents">
          <input name="catalog" type="hidden" value={config.catalog} />
          <input name="id" type="hidden" value={item.id} />
          <input name="nextStatus" type="hidden" value={String(nextStatus)} />
          <DialogFooter>
            <DialogClose disabled={pending} render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button disabled={pending} type="submit" variant={nextStatus ? "default" : "destructive"}>
              {pending ? "Salvando..." : nextStatus ? "Reativar" : "Desativar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function OpportunityCatalogCard({
  config,
  initialError,
  items,
  onEdit,
  onNew,
  onStatusChange,
}: {
  config: CatalogConfig;
  initialError?: string;
  items: OpportunityCatalogItem[];
  onEdit: (config: CatalogConfig, item: OpportunityCatalogItem) => void;
  onNew: (config: CatalogConfig) => void;
  onStatusChange: (config: CatalogConfig, item: OpportunityCatalogItem, nextStatus: boolean) => void;
}) {
  const router = useRouter();
  const [reorderState, setReorderState] = useState<OpportunityCatalogActionState | null>(null);
  const [reorderPending, startReorderTransition] = useTransition();
  const activeCount = items.filter((item) => item.is_active).length;

  function moveItem(item: OpportunityCatalogItem, direction: "up" | "down") {
    const formData = new FormData();
    formData.set("catalog", config.catalog);
    formData.set("id", item.id);
    formData.set("direction", direction);
    startReorderTransition(async () => {
      const result = await reorderOpportunityCatalogItemAction(null, formData);
      setReorderState(result);
      if (result.ok) router.refresh();
    });
  }

  return (
    <section className="overflow-hidden rounded-lg bg-[var(--gray-1)]">
      <div className="flex items-start justify-between gap-4 p-5">
        <div>
          <h2 className="text-sm font-semibold">{config.title}</h2>
          <p className="text-sm text-[var(--gray-11)]">{config.description}</p>
        </div>
        <Button onClick={() => onNew(config)}>
          <PlusCircleIcon />
          {config.newLabel}
        </Button>
      </div>

      {config.catalog === "qualification" && !initialError && activeCount < 2 ? (
        <p
          className="mx-5 mb-4 rounded-lg border border-[var(--amber-6)] bg-[var(--amber-3)] px-3 py-2 text-sm text-[var(--amber-11)]"
          role="status"
        >
          Cadastre e mantenha pelo menos 2 itens ativos para concluir a qualificação de oportunidades.
        </p>
      ) : null}
      {initialError ? (
        <p className="mx-5 mb-4 rounded-lg bg-[var(--tomato-3)] p-3 text-sm text-[var(--tomato-11)]" role="alert">
          {initialError}
        </p>
      ) : null}
      {reorderState ? (
        <div className="mx-5 mb-4">
          <ActionMessage state={reorderState} />
        </div>
      ) : null}

      <div className="mx-5 mb-5 overflow-hidden rounded-lg border border-[var(--gray-6)]">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>{config.fieldLabel}</TableHead>
              <TableHead className="w-32">Status</TableHead>
              <TableHead className="w-12"><span className="sr-only">Ações</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>
                  <Switch
                    aria-label={`${item.is_active ? "Desativar" : "Reativar"} ${config.itemLabel} ${item.name}`}
                    checked={item.is_active}
                    onCheckedChange={(checked) => onStatusChange(config, item, checked)}
                  />
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      disabled={reorderPending}
                      render={<Button aria-label={`Ações para ${item.name}`} size="icon-sm" variant="ghost" />}
                    >
                      <EllipsisVerticalIcon />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(config, item)}>
                        <PencilSquareIcon />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled={index === 0} onClick={() => moveItem(item, "up")}>
                        <ArrowUpIcon />
                        Mover para cima
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled={index === items.length - 1} onClick={() => moveItem(item, "down")}>
                        <ArrowDownIcon />
                        Mover para baixo
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onStatusChange(config, item, !item.is_active)}
                        variant={item.is_active ? "destructive" : "default"}
                      >
                        {item.is_active ? "Desativar" : "Reativar"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {!initialError && items.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-medium">{config.emptyTitle}</p>
            <p className="mt-1 text-sm text-[var(--gray-11)]">{config.emptyDescription}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function OpportunitySettingsPanel({
  initialErrors,
  lossReasons,
  qualificationParameters,
  sources,
}: {
  initialErrors: Partial<Record<"lossReason" | "qualification" | "source", string>>;
  lossReasons: OpportunityCatalogItem[];
  qualificationParameters: OpportunityCatalogItem[];
  sources: OpportunityCatalogItem[];
}) {
  const [formDialog, setFormDialog] = useState<{
    config: CatalogConfig;
    item: OpportunityCatalogItem | null;
  } | null>(null);
  const [statusDialog, setStatusDialog] = useState<{
    config: CatalogConfig;
    item: OpportunityCatalogItem;
    nextStatus: boolean;
  } | null>(null);

  const cards = [
    { config: catalogConfigs.qualification, initialError: initialErrors.qualification, items: qualificationParameters },
    { config: catalogConfigs.source, initialError: initialErrors.source, items: sources },
    { config: catalogConfigs["loss-reason"], initialError: initialErrors.lossReason, items: lossReasons },
  ];

  return (
    <>
      {cards.map(({ config, initialError, items }) => (
        <OpportunityCatalogCard
          config={config}
          initialError={initialError}
          items={items}
          key={config.catalog}
          onEdit={(selectedConfig, item) => setFormDialog({ config: selectedConfig, item })}
          onNew={(selectedConfig) => setFormDialog({ config: selectedConfig, item: null })}
          onStatusChange={(selectedConfig, item, nextStatus) =>
            setStatusDialog({ config: selectedConfig, item, nextStatus })
          }
        />
      ))}

      {formDialog ? (
        <CatalogFormDialog
          config={formDialog.config}
          item={formDialog.item}
          key={`${formDialog.config.catalog}-${formDialog.item?.id ?? "new"}`}
          onClose={() => setFormDialog(null)}
        />
      ) : null}

      {statusDialog ? (
        <CatalogStatusDialog
          config={statusDialog.config}
          item={statusDialog.item}
          key={`${statusDialog.config.catalog}-${statusDialog.item.id}-${statusDialog.nextStatus}`}
          nextStatus={statusDialog.nextStatus}
          onClose={() => setStatusDialog(null)}
        />
      ) : null}
    </>
  );
}
