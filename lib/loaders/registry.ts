import type { DocumentLoader } from "./types";
import { PdfLoader } from "./pdf";
import { DocxLoader } from "./docx";
import { TextLoader } from "./text";

const loaders: DocumentLoader[] = [
  new PdfLoader(),
  new DocxLoader(),
  new TextLoader(),
];

export function getLoader(ext: string): DocumentLoader | undefined {
  return loaders.find((l) => l.extensions.includes(ext));
}

export function getSupportedExtensions(): string[] {
  return loaders.flatMap((l) => l.extensions);
}
