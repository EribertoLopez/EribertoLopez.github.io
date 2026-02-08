// lib/loaders/types.ts — DocumentLoader interface

export interface DocumentLoader {
  extensions: string[];
  load(filePath: string): Promise<string>;
}
