import fs from "fs/promises";
import { PDFParse } from "pdf-parse";
import type { DocumentLoader } from "./types";

export class PdfLoader implements DocumentLoader {
  extensions = [".pdf"];

  async load(filePath: string): Promise<string> {
    const buffer = await fs.readFile(filePath);
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    return result.text;
  }
}
