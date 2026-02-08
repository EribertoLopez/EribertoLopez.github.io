import fs from "fs/promises";
import type { DocumentLoader } from "./types";

export class TextLoader implements DocumentLoader {
  extensions = [".md", ".txt"];

  async load(filePath: string): Promise<string> {
    return fs.readFile(filePath, "utf-8");
  }
}
