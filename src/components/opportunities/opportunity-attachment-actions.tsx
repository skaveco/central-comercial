"use client";

import { EllipsisVerticalIcon, PaperClipIcon, PlusCircleIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { ChangeEvent, useState, useTransition } from "react";

import {
  registerOpportunityAttachmentAction,
  removeOpportunityAttachmentAction,
} from "@/app/(app)/oportunidades/actions";
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
import { createClient } from "@/lib/supabase/client";

const acceptedTypes = new Map([
  ["pdf", "application/pdf"],
  ["png", "image/png"],
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["svg", "image/svg+xml"],
]);

function fileExtension(fileName: string) {
  return fileName.split(".").at(-1)?.toLocaleLowerCase("pt-BR") ?? "";
}

export function OpportunityAttachmentButton({
  onMessage,
  opportunityId,
}: {
  onMessage: (message: string, error?: boolean) => void;
  opportunityId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setError(null);
  }

  async function upload() {
    if (!file) {
      setError("Selecione um arquivo.");
      return;
    }
    const extension = fileExtension(file.name);
    const mimeType = acceptedTypes.get(extension);
    if (!mimeType || file.type && file.type !== mimeType) {
      setError("Use PDF, PNG, JPG/JPEG ou SVG.");
      return;
    }
    if (file.size <= 0 || file.size > 20 * 1024 * 1024) {
      setError("O arquivo deve ter no máximo 20 MB.");
      return;
    }

    setUploading(true);
    setError(null);
    const objectPath = `${opportunityId}/${crypto.randomUUID()}.${extension === "jpeg" ? "jpg" : extension}`;
    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from("opportunity-attachments")
      .upload(objectPath, file, { contentType: mimeType, upsert: false });
    if (uploadError) {
      setError("Não foi possível enviar o arquivo.");
      setUploading(false);
      return;
    }

    const result = await registerOpportunityAttachmentAction({
      mimeType,
      objectPath,
      opportunityId,
      originalName: file.name,
      sizeBytes: file.size,
    });
    setUploading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setFile(null);
    setOpen(false);
    onMessage(result.message);
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="xs" type="button" variant="outline"><PlusCircleIcon />Adicionar anexo</Button>
      <Dialog open={open} onOpenChange={(nextOpen) => { if (!uploading) setOpen(nextOpen); }}>
        <DialogContent className="sm:max-w-[520px]" showCloseButton={!uploading}>
          <DialogHeader>
            <DialogTitle>Adicionar anexo</DialogTitle>
            <DialogDescription>Envie PDF, PNG, JPG/JPEG ou SVG com até 20 MB.</DialogDescription>
          </DialogHeader>
          <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[var(--gray-7)] px-5 py-4 text-center hover:bg-[var(--gray-2)]">
            <PaperClipIcon className="size-5 text-[var(--gray-10)]" />
            <span className="mt-2 text-sm font-medium">{file?.name ?? "Escolher arquivo"}</span>
            <span className="mt-1 text-xs text-[var(--gray-10)]">Um arquivo por vez</span>
            <input accept=".pdf,.png,.jpg,.jpeg,.svg" className="sr-only" disabled={uploading} onChange={selectFile} type="file" />
          </label>
          {error ? <p className="rounded-lg bg-[var(--tomato-3)] p-3 text-sm text-[var(--tomato-11)]" role="alert">{error}</p> : null}
          <DialogFooter>
            <Button disabled={uploading} onClick={() => setOpen(false)} type="button" variant="outline">Cancelar</Button>
            <Button disabled={uploading || !file} onClick={upload} type="button">{uploading ? "Enviando..." : "Adicionar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function OpportunityAttachmentMenu({
  attachmentId,
  onMessage,
  opportunityId,
}: {
  attachmentId: string;
  onMessage: (message: string, error?: boolean) => void;
  opportunityId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove() {
    if (!window.confirm("Remover este anexo da oportunidade?")) return;
    startTransition(async () => {
      const result = await removeOpportunityAttachmentAction(opportunityId, attachmentId);
      onMessage(result.message, !result.ok);
      if (result.ok) router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button aria-label="Ações do anexo" disabled={pending} size="icon-xs" variant="ghost" />}><EllipsisVerticalIcon /></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={remove} variant="destructive"><TrashIcon />Remover anexo</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
