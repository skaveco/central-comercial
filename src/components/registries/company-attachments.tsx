"use client";

import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  DocumentIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  PaperClipIcon,
  PlusCircleIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ChangeEvent, type DragEvent } from "react";

import {
  registerCompanyAttachmentAction,
  removeCompanyAttachmentAction,
} from "@/app/(app)/cadastros/empresas/[id]/actions";
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
import {
  COMPANY_ATTACHMENTS_BUCKET,
  COMPANY_ATTACHMENT_ACCEPT,
  COMPANY_ATTACHMENT_MAX_BYTES,
  getCompanyAttachmentExtension,
  getCompanyAttachmentMimeType,
} from "@/lib/company-attachments";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

export type CompanyAttachmentItem = {
  id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_at: string;
  signed_url: string | null;
  download_url: string | null;
  uploader: { name: string } | null;
};

type UploadStatus = "queued" | "uploading" | "registering" | "success" | "error";

type UploadItem = {
  duplicateName: boolean;
  error?: string;
  file: File;
  id: string;
  mimeType: string | null;
  progress: number;
  status: UploadStatus;
};

type CompanyAttachmentsProps = {
  attachments: CompanyAttachmentItem[];
  companyActive: boolean;
  companyId: string;
  onUploadOpenChange: (open: boolean) => void;
  uploadOpen: boolean;
};

const sixMegabytes = 6 * 1024 * 1024;

function formatBytes(value: number) {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value)).replace(",", " às");
}

function formatType(fileName: string) {
  return getCompanyAttachmentExtension(fileName)?.toLocaleUpperCase("pt-BR") ?? "Arquivo";
}

function getUploadError(file: File, mimeType: string | null) {
  if (!mimeType) return "Formato não permitido.";
  if (file.size <= 0) return "O arquivo está vazio.";
  if (file.size > COMPANY_ATTACHMENT_MAX_BYTES) return "O arquivo deve ter até 20 MB.";
  return undefined;
}

function getTusEndpoint(supabaseUrl: string) {
  const url = new URL(supabaseUrl);
  if (url.hostname.endsWith(".supabase.co")) {
    const projectRef = url.hostname.split(".")[0];
    return `https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`;
  }
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/upload/resumable`;
}

async function uploadWithProgress({
  accessToken,
  file,
  mimeType,
  objectPath,
  onProgress,
  publishableKey,
  supabaseUrl,
}: {
  accessToken: string;
  file: File;
  mimeType: string;
  objectPath: string;
  onProgress: (percentage: number) => void;
  publishableKey: string;
  supabaseUrl: string;
}) {
  const tus = await import("tus-js-client");

  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      chunkSize: sixMegabytes,
      endpoint: getTusEndpoint(supabaseUrl),
      fingerprint: async () => `${objectPath}:${file.lastModified}:${file.size}`,
      headers: {
        apikey: publishableKey,
        authorization: `Bearer ${accessToken}`,
      },
      metadata: {
        bucketName: COMPANY_ATTACHMENTS_BUCKET,
        cacheControl: "3600",
        contentType: mimeType,
        objectName: objectPath,
      },
      onError: reject,
      onProgress: (bytesUploaded, bytesTotal) => {
        onProgress(bytesTotal > 0 ? Math.round((bytesUploaded / bytesTotal) * 100) : 0);
      },
      onSuccess: () => resolve(),
      removeFingerprintOnSuccess: true,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      uploadDataDuringCreation: true,
    });

    void upload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads[0]) upload.resumeFromPreviousUpload(previousUploads[0]);
      upload.start();
    }).catch(reject);
  });
}

function AttachmentPreviewDialog({ attachment, onClose }: { attachment: CompanyAttachmentItem | null; onClose: () => void }) {
  return (
    <Dialog open={Boolean(attachment)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="grid h-[85vh] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-[1000px]">
        <DialogHeader>
          <DialogTitle>{attachment?.original_name ?? "Visualizar anexo"}</DialogTitle>
          <DialogDescription>Pré-visualização temporária do arquivo armazenado com segurança.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 overflow-hidden rounded-lg border border-[var(--gray-6)] bg-[var(--gray-2)]">
          {attachment?.signed_url ? (
            <object className="size-full" data={attachment.signed_url} title={attachment.original_name} type={attachment.mime_type}>
              <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                <DocumentIcon className="size-8 text-[var(--gray-9)]" />
                <p className="text-sm">Este navegador não conseguiu exibir o arquivo.</p>
              </div>
            </object>
          ) : null}
        </div>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Fechar</DialogClose>
          {attachment?.download_url ? <Button render={<a href={attachment.download_url} rel="noreferrer" />}><ArrowDownTrayIcon />Baixar</Button> : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RemoveAttachmentDialog({
  attachment,
  companyId,
  onClose,
}: {
  attachment: CompanyAttachmentItem | null;
  companyId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  async function removeAttachment() {
    if (!attachment) return;
    setRemoving(true);
    setError(null);
    const result = await removeCompanyAttachmentAction(companyId, attachment.id);
    setRemoving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <Dialog open={Boolean(attachment)} onOpenChange={(open) => { if (!open && !removing) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remover anexo?</DialogTitle>
          <DialogDescription>“{attachment?.original_name}” será removido da empresa. Esta ação ficará registrada no histórico.</DialogDescription>
        </DialogHeader>
        {error ? <p className="text-sm text-[var(--tomato-11)]" role="alert">{error}</p> : null}
        <DialogFooter>
          <DialogClose disabled={removing} render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
          <Button disabled={removing} onClick={() => void removeAttachment()} variant="destructive"><TrashIcon />{removing ? "Removendo..." : "Remover"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UploadDialog({
  attachments,
  companyId,
  onOpenChange,
  open,
}: {
  attachments: CompanyAttachmentItem[];
  companyId: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [dragging, setDragging] = useState(false);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [uploading, setUploading] = useState(false);

  const readyCount = items.filter((item) =>
    !getUploadError(item.file, item.mimeType)
    && item.status !== "success"
    && item.status !== "uploading"
    && item.status !== "registering",
  ).length;

  function updateItem(id: string, update: Partial<UploadItem>) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...update } : item));
  }

  function addFiles(fileList: FileList | File[]) {
    const knownNames = new Set([
      ...attachments.map((attachment) => attachment.original_name.toLocaleLowerCase("pt-BR")),
      ...items.map((item) => item.file.name.toLocaleLowerCase("pt-BR")),
    ]);
    const additions = Array.from(fileList).map((file) => {
      const mimeType = getCompanyAttachmentMimeType(file.name);
      const normalizedName = file.name.toLocaleLowerCase("pt-BR");
      const duplicateName = knownNames.has(normalizedName);
      knownNames.add(normalizedName);
      const error = getUploadError(file, mimeType);
      return {
        duplicateName,
        error,
        file,
        id: crypto.randomUUID(),
        mimeType,
        progress: 0,
        status: error ? "error" as const : "queued" as const,
      };
    });
    setItems((current) => [...current, ...additions]);
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files?.length) addFiles(event.target.files);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && uploading) return;
    if (!nextOpen && items.some((item) => item.status !== "success") && !window.confirm("Descartar a fila de anexos?")) return;
    if (!nextOpen) setItems([]);
    onOpenChange(nextOpen);
  }

  async function runUploads(itemIds?: string[]) {
    const selectedItems = items.filter((item) =>
      !getUploadError(item.file, item.mimeType)
      && item.status !== "success"
      && (!itemIds || itemIds.includes(item.id)),
    );
    if (!selectedItems.length) return;

    setUploading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      selectedItems.forEach((item) => updateItem(item.id, { error: "Sua sessão expirou. Entre novamente.", status: "error" }));
      setUploading(false);
      return;
    }

    const { publishableKey, url } = getSupabaseConfig();
    let uploadedAny = false;

    for (const item of selectedItems) {
      const extension = getCompanyAttachmentExtension(item.file.name);
      if (!item.mimeType || !extension) continue;
      const objectPath = `${companyId}/${crypto.randomUUID()}.${extension}`;
      let storageUploadCompleted = false;
      updateItem(item.id, { error: undefined, progress: 0, status: "uploading" });

      try {
        await uploadWithProgress({
          accessToken,
          file: item.file,
          mimeType: item.mimeType,
          objectPath,
          onProgress: (progress) => updateItem(item.id, { progress }),
          publishableKey,
          supabaseUrl: url,
        });
        storageUploadCompleted = true;
        updateItem(item.id, { progress: 100, status: "registering" });
        const result = await registerCompanyAttachmentAction({
          companyId,
          mimeType: item.mimeType,
          objectPath,
          originalName: item.file.name,
          sizeBytes: item.file.size,
        });
        if (!result.ok) throw new Error(result.message);
        updateItem(item.id, { progress: 100, status: "success" });
        uploadedAny = true;
      } catch (uploadError) {
        if (storageUploadCompleted) {
          const { data: registeredAttachment } = await supabase
            .from("attachments")
            .select("id")
            .eq("company_id", companyId)
            .eq("object_path", objectPath)
            .is("removed_at", null)
            .maybeSingle();
          if (registeredAttachment) {
            updateItem(item.id, { progress: 100, status: "success" });
            uploadedAny = true;
            continue;
          }
          await supabase.storage.from(COMPANY_ATTACHMENTS_BUCKET).remove([objectPath]);
        }
        updateItem(item.id, {
          error: uploadError instanceof Error ? uploadError.message : "Não foi possível enviar o arquivo.",
          status: "error",
        });
      }
    }

    setUploading(false);
    if (uploadedAny) router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[680px]" showCloseButton={!uploading}>
        <DialogHeader>
          <DialogTitle>Adicionar anexos</DialogTitle>
          <DialogDescription>Selecione um ou mais arquivos. Cada arquivo pode ter até 20 MB.</DialogDescription>
        </DialogHeader>

        <label
          className={`flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-6 py-5 text-center transition-colors ${dragging ? "border-[var(--primary-9)] bg-[var(--primary-3)]" : "border-[var(--gray-7)] hover:bg-[var(--gray-2)]"}`}
          onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          <PaperClipIcon className="size-6 text-[var(--gray-10)]" />
          <span className="mt-2 text-sm font-medium">Escolha os arquivos ou arraste-os até aqui</span>
          <span className="mt-1 text-xs text-[var(--gray-11)]">PDF, PNG, JPG, WEBP, DOCX, XLSX, CSV, PPTX ou TXT</span>
          <input accept={COMPANY_ATTACHMENT_ACCEPT} className="sr-only" multiple onChange={handleInput} type="file" />
        </label>

        {items.length ? (
          <div className="max-h-72 overflow-y-auto rounded-lg border border-[var(--gray-6)]" aria-live="polite">
            {items.map((item) => (
              <div className="flex items-center gap-3 border-b border-[var(--gray-6)] p-3 last:border-b-0" key={item.id}>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[var(--gray-3)]"><DocumentIcon className="size-4" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{item.file.name}</p>
                    {item.duplicateName ? <span className="shrink-0 rounded-full bg-[var(--amber-3)] px-2 py-0.5 text-[10px] text-[var(--amber-11)]">Nome repetido</span> : null}
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--gray-11)]">{formatType(item.file.name)} · {formatBytes(item.file.size)}</p>
                  {item.status === "uploading" || item.status === "registering" ? (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--gray-4)]"><div className="h-full rounded-full bg-[var(--primary-9)] transition-[width]" style={{ width: `${item.progress}%` }} /></div>
                      <span className="w-9 text-right text-[10px] text-[var(--gray-11)]">{item.status === "registering" ? "Salvando" : `${item.progress}%`}</span>
                    </div>
                  ) : null}
                  {item.error ? <p className="mt-1 text-xs text-[var(--tomato-11)]">{item.error}</p> : null}
                </div>
                {item.status === "success" ? <CheckCircleIcon className="size-5 shrink-0 text-[var(--grass-11)]" /> : null}
                {item.status === "error" && !getUploadError(item.file, item.mimeType) ? <Button aria-label={`Tentar novamente ${item.file.name}`} disabled={uploading} onClick={() => void runUploads([item.id])} size="icon-sm" variant="ghost"><ArrowPathIcon /></Button> : null}
                {item.status !== "uploading" && item.status !== "registering" && item.status !== "success" ? <Button aria-label={`Remover ${item.file.name} da fila`} disabled={uploading} onClick={() => setItems((current) => current.filter((currentItem) => currentItem.id !== item.id))} size="icon-sm" variant="ghost"><XMarkIcon /></Button> : null}
              </div>
            ))}
          </div>
        ) : null}

        <DialogFooter>
          <DialogClose disabled={uploading} render={<Button type="button" variant="outline" />}>{items.some((item) => item.status === "success") ? "Concluir" : "Cancelar"}</DialogClose>
          <Button disabled={uploading || readyCount === 0} onClick={() => void runUploads()}><ArrowDownTrayIcon />{uploading ? "Enviando..." : `Enviar${readyCount > 1 ? ` ${readyCount} arquivos` : ""}`}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CompanyAttachments({
  attachments,
  companyActive,
  companyId,
  onUploadOpenChange,
  uploadOpen,
}: CompanyAttachmentsProps) {
  const [previewing, setPreviewing] = useState<CompanyAttachmentItem | null>(null);
  const [removing, setRemoving] = useState<CompanyAttachmentItem | null>(null);

  return (
    <section className="rounded-lg bg-[var(--gray-1)]">
      <div className="flex min-h-14 items-center justify-between gap-4 px-5 py-3">
        <h2 className="text-sm font-semibold">Anexos</h2>
        <Button disabled={!companyActive} onClick={() => onUploadOpenChange(true)} size="sm" variant="outline"><PlusCircleIcon />Adicionar anexo</Button>
      </div>

      {attachments.length ? (
        <div className="px-5 pb-3">
          {attachments.map((attachment) => {
            const canPreview = attachment.mime_type === "application/pdf" || attachment.mime_type.startsWith("image/");
            return (
              <div className="flex min-h-16 items-center gap-3 border-b border-[var(--gray-6)] last:border-b-0" key={attachment.id}>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[var(--gray-3)]"><DocumentIcon className="size-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{attachment.original_name}</p>
                  <p className="mt-0.5 truncate text-xs text-[var(--gray-11)]">{formatType(attachment.original_name)} · {formatBytes(attachment.size_bytes)} · {attachment.uploader?.name ?? "Sistema"} · {formatDate(attachment.uploaded_at)}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button aria-label={`Ações do anexo ${attachment.original_name}`} size="icon-sm" variant="ghost" />}><EllipsisVerticalIcon /></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem disabled={!canPreview || !attachment.signed_url} onClick={() => setPreviewing(attachment)}><EyeIcon />Visualizar</DropdownMenuItem>
                    <DropdownMenuItem disabled={!attachment.download_url} render={attachment.download_url ? <a href={attachment.download_url} rel="noreferrer" /> : undefined}><ArrowDownTrayIcon />Baixar</DropdownMenuItem>
                    <DropdownMenuItem disabled={!companyActive} onClick={() => setRemoving(attachment)} variant="destructive"><TrashIcon />Remover</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex min-h-28 flex-col items-center justify-center px-5 pb-5 text-center">
          <PaperClipIcon className="size-6 text-[var(--gray-9)]" />
          <p className="mt-2 text-sm font-medium">Nenhum anexo adicionado</p>
          <p className="mt-1 text-xs text-[var(--gray-11)]">Adicione documentos e arquivos relacionados à empresa.</p>
        </div>
      )}

      <UploadDialog attachments={attachments} companyId={companyId} onOpenChange={onUploadOpenChange} open={uploadOpen} />
      <AttachmentPreviewDialog attachment={previewing} onClose={() => setPreviewing(null)} />
      <RemoveAttachmentDialog attachment={removing} companyId={companyId} onClose={() => setRemoving(null)} />
    </section>
  );
}
