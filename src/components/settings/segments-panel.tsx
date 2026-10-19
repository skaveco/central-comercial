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
  reorderSegmentAction,
  saveSegmentAction,
  setSegmentStatusAction,
  type SegmentActionState,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type Segment = {
  id: string;
  is_active: boolean;
  name: string;
  sort_order: number;
  updated_at: string;
};

function ActionMessage({ state }: { state: SegmentActionState | null }) {
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

function SegmentFormDialog({
  onClose,
  open,
  segment,
}: {
  onClose: () => void;
  open: boolean;
  segment: Segment | null;
}) {
  const [state, formAction, pending] = useActionState(saveSegmentAction, null);

  useEffect(() => {
    if (state?.ok) onClose();
  }, [onClose, state]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen && !pending) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{segment ? "Editar segmento" : "Novo segmento"}</DialogTitle>
          <DialogDescription>
            {segment
              ? "Atualize o nome usado para classificar as empresas."
              : "Crie uma opção para classificar as empresas por segmento de mercado."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="contents">
          {segment ? <input name="id" type="hidden" value={segment.id} /> : null}
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="segment-name">
              Nome <span className="text-[var(--tomato-11)]">*</span>
            </label>
            <Input
              aria-describedby={state?.fieldErrors?.name ? "segment-name-error" : undefined}
              aria-invalid={Boolean(state?.fieldErrors?.name)}
              autoFocus
              defaultValue={segment?.name ?? ""}
              id="segment-name"
              name="name"
              placeholder="Ex.: Tecnologia e software"
              required
            />
            {state?.fieldErrors?.name ? (
              <p className="text-xs text-[var(--tomato-11)]" id="segment-name-error">
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

function SegmentStatusDialog({
  nextStatus,
  onClose,
  segment,
}: {
  nextStatus: boolean;
  onClose: () => void;
  segment: Segment;
}) {
  const [state, formAction, pending] = useActionState(setSegmentStatusAction, null);

  useEffect(() => {
    if (state?.ok) onClose();
  }, [onClose, state]);

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{nextStatus ? "Reativar segmento" : "Desativar segmento"}</DialogTitle>
          <DialogDescription>
            {nextStatus
              ? `O segmento “${segment.name}” voltará a ficar disponível para novas empresas.`
              : `O segmento “${segment.name}” deixará de aparecer em novos vínculos. Empresas já vinculadas não serão alteradas.`}
          </DialogDescription>
        </DialogHeader>

        <ActionMessage state={state} />

        <form action={formAction} className="contents">
          <input name="id" type="hidden" value={segment.id} />
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

export function SegmentsPanel({
  initialError,
  segments,
}: {
  initialError?: string;
  segments: Segment[];
}) {
  const router = useRouter();
  const [formDialog, setFormDialog] = useState<{ open: boolean; segment: Segment | null }>({
    open: false,
    segment: null,
  });
  const [statusChange, setStatusChange] = useState<{ nextStatus: boolean; segment: Segment } | null>(null);
  const [reorderState, setReorderState] = useState<SegmentActionState | null>(null);
  const [reorderPending, startReorderTransition] = useTransition();

  function moveSegment(segment: Segment, direction: "up" | "down") {
    const formData = new FormData();
    formData.set("id", segment.id);
    formData.set("direction", direction);
    startReorderTransition(async () => {
      const result = await reorderSegmentAction(null, formData);
      setReorderState(result);
      if (result.ok) router.refresh();
    });
  }

  return (
    <>
      <section className="overflow-hidden rounded-lg bg-[var(--gray-1)]">
        <div className="flex items-start justify-between gap-4 p-5">
          <div>
            <h2 className="text-sm font-semibold">Segmentos</h2>
            <p className="text-sm text-[var(--gray-11)]">
              Lista de segmentos de mercado para atribuir às empresas.
            </p>
          </div>
          <Button onClick={() => setFormDialog({ open: true, segment: null })}>
            <PlusCircleIcon />
            Novo segmento
          </Button>
        </div>

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
                <TableHead>Segmento</TableHead>
                <TableHead className="w-12"><span className="sr-only">Ações</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {segments.map((segment, index) => (
                <TableRow key={segment.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span>{segment.name}</span>
                      {!segment.is_active ? (
                        <span className="rounded-full bg-[var(--gray-3)] px-2 py-0.5 text-xs font-normal text-[var(--gray-11)]">
                          Desativado
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        disabled={reorderPending}
                        render={<Button aria-label={`Ações para ${segment.name}`} size="icon-sm" variant="ghost" />}
                      >
                        <EllipsisVerticalIcon />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setFormDialog({ open: true, segment })}>
                          <PencilSquareIcon />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled={index === 0} onClick={() => moveSegment(segment, "up")}>
                          <ArrowUpIcon />
                          Mover para cima
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={index === segments.length - 1}
                          onClick={() => moveSegment(segment, "down")}
                        >
                          <ArrowDownIcon />
                          Mover para baixo
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setStatusChange({ nextStatus: !segment.is_active, segment })}
                          variant={segment.is_active ? "destructive" : "default"}
                        >
                          {segment.is_active ? "Desativar" : "Reativar"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {!initialError && segments.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm font-medium">Nenhum segmento cadastrado.</p>
              <p className="mt-1 text-sm text-[var(--gray-11)]">
                Crie o primeiro segmento para organizar o cadastro de empresas.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {formDialog.open ? (
        <SegmentFormDialog
          key={formDialog.segment?.id ?? "new"}
          onClose={() => setFormDialog({ open: false, segment: null })}
          open
          segment={formDialog.segment}
        />
      ) : null}

      {statusChange ? (
        <SegmentStatusDialog
          key={`${statusChange.segment.id}-${statusChange.nextStatus}`}
          nextStatus={statusChange.nextStatus}
          onClose={() => setStatusChange(null)}
          segment={statusChange.segment}
        />
      ) : null}
    </>
  );
}
