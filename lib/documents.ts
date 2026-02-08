// lib/documents.ts
import fs from "fs";
import path from "path";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

// Parse PDF using pdf-parse v2 API
async function parsePdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  await parser.destroy();
  return result.text;
}

// This type describes what a loaded document looks like
export interface LoadedDocument {
  filename: string;
  content: string;
  type: "pdf" | "docx" | "markdown" | "text";
}

/**
 * Reads a single file and extracts its text content.
 *
 * @param filePath - Full path to the file
 * @returns The extracted text content
 */
async function extractText(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".pdf") {
    // PDF files need special parsing
    const buffer = fs.readFileSync(filePath);
    return parsePdf(buffer);
  }

  if (ext === ".docx") {
    // Word documents need mammoth to extract text
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  if ([".md", ".txt"].includes(ext)) {
    // Plain text files can be read directly
    return fs.readFileSync(filePath, "utf-8");
  }

  throw new Error(`Unsupported file type: ${ext}`);
}

/**
 * Loads all documents from a directory.
 *
 * @param dirPath - Path to the documents folder
 * @returns Array of loaded documents with their content
 */
export async function loadDocuments(
  dirPath: string
): Promise<LoadedDocument[]> {
  // Get list of all files in the directory
  const files = fs.readdirSync(dirPath);

  const documents: LoadedDocument[] = [];

  for (const filename of files) {
    const filePath = path.join(dirPath, filename);

    // Skip directories
    if (fs.statSync(filePath).isDirectory()) {
      continue;
    }

    // Skip unsupported files
    const ext = path.extname(filename).toLowerCase();
    if (![".pdf", ".docx", ".md", ".txt"].includes(ext)) {
      console.log(`Skipping unsupported file: ${filename}`);
      continue;
    }

    try {
      const content = await extractText(filePath);

      documents.push({
        filename,
        content,
        type:
          ext === ".pdf"
            ? "pdf"
            : ext === ".docx"
            ? "docx"
            : ext === ".md"
            ? "markdown"
            : "text",
      });

      console.log(`✅ Loaded: ${filename} (${content.length} characters)`);
    } catch (error) {
      console.error(`❌ Failed to load ${filename}:`, error);
    }
  }

  return documents;
}
