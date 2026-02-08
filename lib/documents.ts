// lib/documents.ts — Document loading using Factory Pattern
import fs from "fs/promises";
import path from "path";
import { getLoader, getSupportedExtensions } from "./loaders";
import { DocumentLoadError } from "./errors";
import type { LoadedDocument } from "./types";

// Re-export for backwards compatibility
export type { LoadedDocument } from "./types";

/**
 * Reads a single file and extracts its text content using the appropriate loader.
 */
async function extractText(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  const loader = getLoader(ext);

  if (!loader) {
    throw new DocumentLoadError(`Unsupported file type: ${ext}`);
  }

  return loader.load(filePath);
}

/**
 * Determines the document type from file extension.
 */
function getDocumentType(ext: string): string {
  if (ext === ".pdf") return "pdf";
  if (ext === ".docx") return "docx";
  if (ext === ".md") return "markdown";
  return "text";
}

/**
 * Loads all documents from a directory.
 *
 * @param dirPath - Path to the documents folder
 * @param recursive - Whether to traverse subdirectories (default: false)
 * @returns Array of loaded documents with their content
 */
export async function loadDocuments(
  dirPath: string,
  recursive = false
): Promise<LoadedDocument[]> {
  const supportedExts = getSupportedExtensions();
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const documents: LoadedDocument[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (recursive) {
        const subDocs = await loadDocuments(fullPath, true);
        documents.push(...subDocs);
      }
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (!supportedExts.includes(ext)) {
      console.log(`Skipping unsupported file: ${entry.name}`);
      continue;
    }

    try {
      const content = await extractText(fullPath);
      documents.push({
        filename: entry.name,
        content,
        type: getDocumentType(ext),
      });
      console.log(`✅ Loaded: ${entry.name} (${content.length} characters)`);
    } catch (error) {
      throw new DocumentLoadError(
        `Failed to load ${entry.name}`,
        error
      );
    }
  }

  return documents;
}
