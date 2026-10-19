export const COMPANY_ATTACHMENTS_BUCKET = "company-attachments";
export const COMPANY_ATTACHMENT_MAX_BYTES = 20 * 1024 * 1024;

export const COMPANY_ATTACHMENT_MIME_TYPES = {
  csv: "text/csv",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  pdf: "application/pdf",
  png: "image/png",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  webp: "image/webp",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
} as const;

export const COMPANY_ATTACHMENT_ACCEPT = Object.keys(COMPANY_ATTACHMENT_MIME_TYPES)
  .map((extension) => `.${extension}`)
  .join(",");

export function getCompanyAttachmentExtension(fileName: string) {
  const extension = fileName.split(".").at(-1)?.toLocaleLowerCase("pt-BR") ?? "";
  return extension in COMPANY_ATTACHMENT_MIME_TYPES
    ? extension as keyof typeof COMPANY_ATTACHMENT_MIME_TYPES
    : null;
}

export function getCompanyAttachmentMimeType(fileName: string) {
  const extension = getCompanyAttachmentExtension(fileName);
  return extension ? COMPANY_ATTACHMENT_MIME_TYPES[extension] : null;
}

export function isCompanyAttachmentObjectPath(companyId: string, objectPath: string) {
  const [parentId, objectName, extraSegment] = objectPath.split("/");
  if (parentId !== companyId || !objectName || extraSegment) return false;

  const [objectId, extension, extraExtension] = objectName.split(".");
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(objectId) && !extraExtension && Boolean(extension && extension in COMPANY_ATTACHMENT_MIME_TYPES);
}
