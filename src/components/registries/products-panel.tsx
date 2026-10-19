"use client";

import {
  CubeIcon,
  EllipsisVerticalIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";

import { saveProductAction, setProductStatusAction } from "@/app/(app)/cadastros/produtos/actions";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export type ProductCategory = {
  id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
};

export type ProductListItem = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  base_price: number | string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category: { id: string; name: string; is_active: boolean } | null;
};

type ProductFilters = {
  status: "all" | "active" | "inactive";
  query: string;
  category: string;
  page: number;
  pageSize: number;
};

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
}

function maskCurrency(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (!digits) return "";
  return formatCurrency(Number(digits) / 100);
}

function initialCurrency(value: number | string | null) {
  return value === null ? "" : formatCurrency(value);
}

function buildHref(
  filters: ProductFilters,
  changes: Partial<Record<"status" | "query" | "category" | "page" | "size", string | number>>,
) {
  const params = new URLSearchParams();
  const status = changes.status ?? filters.status;
  const query = changes.query ?? filters.query;
  const category = changes.category ?? filters.category;
  params.set("status", String(status));
  if (query) params.set("query", String(query));
  if (category) params.set("category", String(category));
  params.set("size", String(changes.size ?? filters.pageSize));
  params.set("page", String(changes.page ?? filters.page));
  return `/cadastros/produtos?${params.toString()}`;
}

function FieldError({ children }: { children?: string }) {
  return children ? <p className="mt-1 text-xs text-[var(--tomato-11)]">{children}</p> : null;
}

function ProductFormDialog({
  categories,
  onOpenChange,
  open,
  product,
}: {
  categories: ProductCategory[];
  onOpenChange: (open: boolean) => void;
  open: boolean;
  product: ProductListItem | null;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveProductAction, null);
  const [dirty, setDirty] = useState(false);
  const [basePrice, setBasePrice] = useState(() => initialCurrency(product?.base_price ?? null));
  const availableCategories = useMemo(
    () => categories.filter((category) => category.is_active || category.id === product?.category_id),
    [categories, product?.category_id],
  );
  const hasSelectableCategory = availableCategories.some((category) => category.is_active || category.id === product?.category_id);

  useEffect(() => {
    if (state?.ok) {
      onOpenChange(false);
      router.refresh();
    }
  }, [onOpenChange, router, state]);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && dirty && !window.confirm("Descartar as alterações deste produto?")) return;
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>{product ? "Editar produto" : "Novo produto"}</DialogTitle>
          <DialogDescription>{product ? "Atualize as informações do catálogo." : "Cadastre um produto ou serviço comercializado pela empresa."}</DialogDescription>
        </DialogHeader>

        <form action={action} className="grid grid-cols-2 gap-4" onChange={() => setDirty(true)}>
          <input name="id" type="hidden" value={product?.id ?? ""} />
          {state && !state.ok ? (
            <div className={`col-span-2 rounded-lg border px-3 py-2 text-sm ${state.duplicate ? "border-[var(--amber-6)] bg-[var(--amber-3)] text-[var(--amber-12)]" : "border-[var(--tomato-6)] bg-[var(--tomato-3)] text-[var(--tomato-11)]"}`} role="alert">
              <p>{state.message}</p>
              {state.duplicate ? (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs">Produto encontrado: {state.duplicate.name}{state.duplicate.isActive ? "" : " (desativado)"}</span>
                  <Button disabled={pending} name="allowDuplicate" size="xs" type="submit" value="true">Continuar mesmo assim</Button>
                </div>
              ) : null}
            </div>
          ) : null}

          <label className="col-span-2 text-sm font-medium">
            Nome <span className="text-[var(--tomato-11)]">*</span>
            <Input aria-invalid={Boolean(state?.fieldErrors?.name)} className="mt-1" defaultValue={product?.name ?? ""} name="name" required />
            <FieldError>{state?.fieldErrors?.name}</FieldError>
          </label>

          <label className="text-sm font-medium">
            Categoria <span className="text-[var(--tomato-11)]">*</span>
            <select aria-invalid={Boolean(state?.fieldErrors?.categoryId)} className="mt-1 h-8 w-full rounded-lg border border-[var(--gray-6)] bg-[var(--gray-1)] px-2.5 text-sm outline-none focus:border-[var(--primary-8)] focus:ring-3 focus:ring-[var(--primary-8)]/50 aria-invalid:border-[var(--tomato-9)]" defaultValue={product?.category_id ?? ""} name="categoryId" required>
              <option value="">Selecione uma categoria</option>
              {availableCategories.map((category) => <option key={category.id} value={category.id}>{category.name}{category.is_active ? "" : " (inativa)"}</option>)}
            </select>
            <FieldError>{state?.fieldErrors?.categoryId}</FieldError>
          </label>

          <label className="text-sm font-medium">
            Valor base
            <Input aria-invalid={Boolean(state?.fieldErrors?.basePrice)} className="mt-1" inputMode="decimal" name="basePrice" onChange={(event) => setBasePrice(maskCurrency(event.target.value))} placeholder="R$ 0,00" value={basePrice} />
            <FieldError>{state?.fieldErrors?.basePrice}</FieldError>
          </label>

          <label className="col-span-2 text-sm font-medium">
            Descrição
            <Textarea className="mt-1 min-h-28" defaultValue={product?.description ?? ""} name="description" placeholder="Descreva brevemente o produto ou serviço" />
          </label>

          {!hasSelectableCategory ? (
            <p className="col-span-2 rounded-lg border border-[var(--amber-6)] bg-[var(--amber-3)] px-3 py-2 text-sm text-[var(--amber-12)]">
              Nenhuma categoria ativa está disponível. Cadastre ou reative uma categoria em Configurações antes de salvar o produto.
            </p>
          ) : null}

          <DialogFooter className="col-span-2 mt-1">
            <Button disabled={pending} onClick={() => handleOpenChange(false)} type="button" variant="outline">Cancelar</Button>
            <Button disabled={pending || !hasSelectableCategory} type="submit">{pending ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StatusDialog({ onClose, product }: { onClose: () => void; product: ProductListItem | null }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(setProductStatusAction, null);
  const nextStatus = !product?.is_active;

  useEffect(() => {
    if (state?.ok) {
      onClose();
      router.refresh();
    }
  }, [onClose, router, state]);

  return (
    <Dialog open={Boolean(product)} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar {nextStatus ? "reativação" : "desativação"}?</DialogTitle>
          <DialogDescription>
            {nextStatus
              ? "O produto voltará a ficar disponível para novas oportunidades. Vínculos e valores anteriores não serão alterados."
              : "O produto ficará indisponível para novas seleções, mas continuará nas oportunidades em que já foi utilizado."}
          </DialogDescription>
        </DialogHeader>
        {state && !state.ok ? <p className="text-sm text-[var(--tomato-11)]" role="alert">{state.message}</p> : null}
        <form action={action}>
          <input name="id" type="hidden" value={product?.id ?? ""} />
          <input name="nextStatus" type="hidden" value={String(nextStatus)} />
          <DialogFooter>
            <Button disabled={pending} onClick={onClose} type="button" variant="outline">Cancelar</Button>
            <Button disabled={pending} type="submit" variant={nextStatus ? "default" : "destructive"}>{pending ? "Salvando..." : "Confirmar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ProductsPanel({
  canManage,
  categories,
  error,
  filters,
  products,
  total,
  totalPages,
}: {
  canManage: boolean;
  categories: ProductCategory[];
  error?: string;
  filters: ProductFilters;
  products: ProductListItem[];
  total: number;
  totalPages: number;
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductListItem | null>(null);
  const [statusProduct, setStatusProduct] = useState<ProductListItem | null>(null);
  const firstItem = total ? (filters.page - 1) * filters.pageSize + 1 : 0;
  const lastItem = Math.min(filters.page * filters.pageSize, total);
  const activeCategoryName = categories.find((category) => category.id === filters.category)?.name;
  const hasActiveCategories = categories.some((category) => category.is_active);
  const emptyMessage = filters.query || filters.category
    ? "Nenhum produto corresponde aos critérios informados."
    : filters.status === "inactive"
      ? "Nenhum produto desativado."
      : filters.status === "active"
        ? "Nenhum produto ativo."
        : "Nenhum produto cadastrado.";

  function openNewProduct() {
    setEditingProduct(null);
    setFormOpen(true);
  }

  function openEditProduct(product: ProductListItem) {
    setEditingProduct(product);
    setFormOpen(true);
  }

  function changeStatusTab(value: string | number | null) {
    if (value !== "all" && value !== "active" && value !== "inactive") return;
    if (value === filters.status) return;
    router.push(buildHref(filters, { status: value, page: 1 }));
  }

  return (
    <main className="mx-auto w-full max-w-[1440px] p-5">
      <header className="mb-4">
        <h1 className="text-xl font-semibold leading-8">Produtos</h1>
        <p className="text-sm text-[var(--gray-11)]">Gerencie o catálogo de produtos e serviços comercializados pela empresa.</p>
      </header>

      <Tabs className="gap-0" onValueChange={changeStatusTab} value={filters.status}>
        <div className="mb-2 flex min-h-14 items-center justify-between gap-4 rounded-lg bg-[var(--gray-1)] px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <form className="flex items-center" method="get">
              <input name="status" type="hidden" value={filters.status} />
              <input name="size" type="hidden" value={filters.pageSize} />
              <input name="category" type="hidden" value={filters.category} />
              <label className="relative block w-[280px] max-w-[28vw]">
                <span className="sr-only">Buscar produtos</span>
                <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-[var(--gray-11)]" />
                <Input className="pl-8" defaultValue={filters.query} name="query" placeholder="Busque por um produto" />
              </label>
            </form>

            <TabsList aria-label="Status dos produtos">
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="active">Ativos</TabsTrigger>
              <TabsTrigger value="inactive">Inativos</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button aria-label="Filtrar por categoria" variant="outline" />}>
                <FunnelIcon />
                {activeCategoryName ?? "Todas as categorias"}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(buildHref(filters, { category: "", page: 1 }))}>Todas as categorias</DropdownMenuItem>
                {categories.map((category) => <DropdownMenuItem key={category.id} onClick={() => router.push(buildHref(filters, { category: category.id, page: 1 }))}>{category.name}{category.is_active ? "" : " (inativa)"}</DropdownMenuItem>)}
                {categories.length === 0 ? <DropdownMenuItem disabled>Nenhuma categoria cadastrada</DropdownMenuItem> : null}
              </DropdownMenuContent>
            </DropdownMenu>
            {canManage ? <Button onClick={openNewProduct}><PlusCircleIcon />Novo produto</Button> : null}
          </div>
        </div>

        {canManage && !hasActiveCategories ? (
          <div className="mb-2 rounded-lg border border-[var(--amber-6)] bg-[var(--amber-3)] px-4 py-3 text-sm text-[var(--amber-12)]" role="status">
            Nenhuma categoria ativa está cadastrada. O catálogo pode ser consultado, mas novos produtos dependem da gestão de categorias em Configurações.
          </div>
        ) : null}

        <TabsContent className="contents" value={filters.status}>
          {error ? (
            <div className="rounded-lg bg-[var(--gray-1)] p-10 text-center">
              <p className="text-sm text-[var(--tomato-11)]" role="alert">{error}</p>
              <Button className="mt-3" onClick={() => window.location.reload()} variant="outline">Tentar novamente</Button>
            </div>
          ) : products.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-lg bg-[var(--gray-1)] p-10 text-center">
              <CubeIcon className="size-8 text-[var(--gray-9)]" />
              <div><p className="text-sm font-medium">{emptyMessage}</p><p className="mt-1 text-sm text-[var(--gray-11)]">{filters.query || filters.category ? "Limpe os filtros para visualizar todo o catálogo." : "Cadastre o primeiro produto para começar."}</p></div>
              {filters.query || filters.category ? <Button render={<Link href={buildHref(filters, { query: "", category: "", page: 1 })} />} variant="outline">Limpar critérios</Button> : canManage ? <Button onClick={openNewProduct}><PlusCircleIcon />Novo produto</Button> : null}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {products.map((product) => (
                <article
                  aria-label={canManage ? `Editar ${product.name}` : undefined}
                  className={`flex min-h-[170px] flex-col rounded-lg bg-[var(--gray-1)] p-5 ${canManage ? "cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-8)]" : ""}`}
                  key={product.id}
                  onClick={canManage ? () => openEditProduct(product) : undefined}
                  onKeyDown={canManage ? (event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); openEditProduct(product); } } : undefined}
                  tabIndex={canManage ? 0 : undefined}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3"><span className="h-px w-5 shrink-0 bg-[var(--primary-9)]" /><span className="truncate text-xs font-semibold">{product.category?.name ?? "Sem categoria"}</span></div>
                    {canManage ? (
                      <div onClick={(event) => event.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button aria-label={`Ações de ${product.name}`} size="icon-sm" variant="ghost" />}><EllipsisVerticalIcon /></DropdownMenuTrigger>
                          <DropdownMenuContent align="end"><DropdownMenuItem onClick={() => openEditProduct(product)}><PencilSquareIcon />Editar</DropdownMenuItem></DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-3 min-w-0 flex-1">
                    <h2 className="truncate text-sm font-semibold" title={product.name}>{product.name}</h2>
                    <p className="mt-1 line-clamp-3 min-h-12 text-xs leading-4 text-[var(--gray-11)]" title={product.description ?? undefined}>{product.description ?? "Sem descrição."}</p>
                  </div>

                  <div className="mt-3 flex items-end justify-between gap-4 border-t border-[var(--gray-6)] pt-3">
                    <div className="min-w-0"><p className="text-xs text-[var(--gray-11)]">Valor base</p><p className="mt-1 truncate text-xl font-semibold">{product.base_price === null ? "Não definido" : formatCurrency(product.base_price)}</p></div>
                    {canManage ? (
                      <button aria-checked={product.is_active} aria-label={`${product.is_active ? "Desativar" : "Reativar"} ${product.name}`} className={`relative h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-8)] ${product.is_active ? "bg-[var(--primary-9)]" : "bg-[var(--gray-7)]"}`} onClick={(event) => { event.stopPropagation(); setStatusProduct(product); }} role="switch" type="button"><span className={`absolute top-0.5 size-4 rounded-full bg-[var(--gray-1)] shadow-sm transition-[left] ${product.is_active ? "left-[18px]" : "left-0.5"}`} /></button>
                    ) : (
                      <span aria-label={product.is_active ? "Ativo" : "Desativado"} className={`relative h-5 w-9 shrink-0 rounded-full ${product.is_active ? "bg-[var(--primary-9)]" : "bg-[var(--gray-7)]"}`} role="img"><span className={`absolute top-0.5 size-4 rounded-full bg-[var(--gray-1)] shadow-sm ${product.is_active ? "left-[18px]" : "left-0.5"}`} /></span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="flex min-h-12 items-center justify-between gap-4 px-3 py-2">
            <p className="text-sm text-[var(--gray-11)]">Mostrando {firstItem}–{lastItem} de {total} produtos</p>
            <div className="flex items-center gap-4">
              <select aria-label="Produtos por página" className="h-7 rounded-lg border border-[var(--gray-6)] bg-[var(--gray-1)] px-2 text-xs" onChange={(event) => router.push(buildHref(filters, { size: event.target.value, page: 1 }))} value={filters.pageSize}><option value="10">10 por página</option><option value="20">20 por página</option><option value="50">50 por página</option></select>
              <p className="text-sm text-[var(--gray-11)]">Página {filters.page} de {totalPages}</p>
              {filters.page <= 1 ? <Button disabled size="sm" variant="outline">Anterior</Button> : <Button render={<Link href={buildHref(filters, { page: filters.page - 1 })} />} size="sm" variant="outline">Anterior</Button>}
              {filters.page >= totalPages ? <Button disabled size="sm" variant="outline">Próxima</Button> : <Button render={<Link href={buildHref(filters, { page: filters.page + 1 })} />} size="sm" variant="outline">Próxima</Button>}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {canManage ? <ProductFormDialog categories={categories} key={`${editingProduct?.id ?? "new"}-${formOpen}`} onOpenChange={setFormOpen} open={formOpen} product={editingProduct} /> : null}
      {canManage ? <StatusDialog onClose={() => setStatusProduct(null)} product={statusProduct} /> : null}
    </main>
  );
}
