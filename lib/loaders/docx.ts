import mammoth from "mammoth";
import type { DocumentLoader } from "./types";

export class DocxLoader implements DocumentLoader {
  extensions = [".docx"];

  async load(filePath: string): Promise<string> {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }
}
