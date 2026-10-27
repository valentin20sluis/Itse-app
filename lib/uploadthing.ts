import { generateReactHelpers } from "@uploadthing/react";
import type { DocumentoFileRouter } from "@/app/api/uploadthing/core";

export const { useUploadThing } = generateReactHelpers<DocumentoFileRouter>();
