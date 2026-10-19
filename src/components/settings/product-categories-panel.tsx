"use client";

import { EllipsisVerticalIcon, PencilSquareIcon, PlusCircleIcon } from "@heroicons/react/24/outline";
import { useActionState, useEffect, useState } from "react";

import {
  saveProductCategoryAction,
  setProductCategoryStatusAction,
  type ProductCategoryActionState,
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

export type ProductCategory = {
  id: string;
  is_active: boolean;
  name: string;
  sort_order: number;
  updated_at: string;
};

function ActionMessage({ state }: { state: ProductCategoryActionState | null }) {
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

function CategoryFormDialog({
  category,
  open,
  onClose,
}: {
  category: ProductCategory | null;
  open: boolean;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveProductCategoryAction, null);

  useEffect(() => {
    if (state?.ok) onClose();
  }, [onClose, state]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen && !pending) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? "Editar categoria" : "Nova categoria"}</DialogTitle>
          <DialogDescription>
            {category
              ? "Atualize o nome usado para organizar os produtos."
              : "Crie uma categoria para organizar o catálogo de produtos."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="contents">
          {category ? <input name="id" type="hidden" value={category.id} /> : null}
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="category-name">
              Nome <span className="text-[var(--tomato-11)]">*</span>
            </label>
            <Input
              aria-describedby={state?.fieldErrors?.name ? "category-name-error" : undefined}
              aria-invalid={Boolean(state?.fieldErrors?.name)}
              autoFocus
              defaultValue={category?.name ?? ""}
              id="category-name"
              name="name"
              placeholder="Ex.: Identidade visual"
              required
            />
            {state?.fieldErrors?.name ? (
              <p className="text-xs text-[var(--tomato-11)]" id="category-name-error">
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

function CategoryStatusDialog({
  category,
  nextStatus,
  onClose,
}: {
  category: ProductCategory;
  nextStatus: boolean;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(setProductCategoryStatusAction, null);

  useEffect(() => {
    if (state?.ok) onClose();
  }, [onClose, state]);

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{nextStatus ? "Reativar categoria" : "Desativar categoria"}</DialogTitle>
          <DialogDescription>
            {nextStatus
              ? `A categoria “${category.name}” voltará a ficar disponível em novos produtos.`
              : `A categoria “${category.name}” deixará de aparecer em novos cadastros. Produtos já vinculados não serão alterados.`}
          </DialogDescription>
        </DialogHeader>

        <ActionMessage state={state} />

        <form action={formAction} className="contents">
          <input name="id" type="hidden" value={category.id} />
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

export function ProductCategoriesPanel({
  categories,
  initialError,
}: {
  categories: ProductCategory[];
  initialError?: string;
}) {
  const [formDialog, setFormDialog] = useState<{ open: boolean; category: ProductCategory | null }>({
    open: false,
    category: null,
  });
  const [statusChange, setStatusChange] = useState<{ category: ProductCategory; nextStatus: boolean } | null>(
    null,
  );

  return (
    <>
      <section className="overflow-hidden rounded-lg bg-[var(--gray-1)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--gray-6)] p-5">
          <div>
            <h2 className="text-sm font-semibold">Categorias de produtos</h2>
            <p className="text-sm text-[var(--gray-11)]">Categorias que podem ser atribuídas aos produtos.</p>
          </div>
          <Button onClick={() => setFormDialog({ open: true, category: null })}>
            <PlusCircleIcon />
            Nova categoria
          </Button>
        </div>

        {initialError ? (
          <p className="m-4 rounded-lg bg-[var(--tomato-3)] p-3 text-sm text-[var(--tomato-11)]" role="alert">
            {initialError}
          </p>
        ) : null}

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Categoria</TableHead>
              <TableHead className="w-32">Status</TableHead>
              <TableHead className="w-12"><span className="sr-only">Ações</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell>
                  <Switch
                    aria-label={`${category.is_active ? "Desativar" : "Reativar"} categoria ${category.name}`}
                    checked={category.is_active}
                    onCheckedChange={(checked) => setStatusChange({ category, nextStatus: checked })}
                  />
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button aria-label={`Ações para ${category.name}`} size="icon-sm" variant="ghost" />
                      }
                    >
                      <EllipsisVerticalIcon />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setFormDialog({ open: true, category })}>
                        <PencilSquareIcon />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setStatusChange({ category, nextStatus: !category.is_active })}
                        variant={category.is_active ? "destructive" : "default"}
                      >
                        {category.is_active ? "Desativar" : "Reativar"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {!initialError && categories.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-medium">Nenhuma categoria cadastrada.</p>
            <p className="mt-1 text-sm text-[var(--gray-11)]">
              Crie a primeira categoria para começar a cadastrar produtos.
            </p>
          </div>
        ) : null}
      </section>

      {formDialog.open ? (
        <CategoryFormDialog
          category={formDialog.category}
          key={formDialog.category?.id ?? "new"}
          onClose={() => setFormDialog({ open: false, category: null })}
          open
        />
      ) : null}

      {statusChange ? (
        <CategoryStatusDialog
          category={statusChange.category}
          key={`${statusChange.category.id}-${statusChange.nextStatus}`}
          nextStatus={statusChange.nextStatus}
          onClose={() => setStatusChange(null)}
        />
      ) : null}
    </>
  );
}
