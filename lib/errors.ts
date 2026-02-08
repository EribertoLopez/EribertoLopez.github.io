// lib/errors.ts — Typed error hierarchy for the pipeline

export class PipelineError extends Error {
  constructor(
    message: string,
    public readonly step: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "PipelineError";
  }
}

export class DocumentLoadError extends PipelineError {
  constructor(message: string, cause?: unknown) {
    super(message, "document-load", cause);
    this.name = "DocumentLoadError";
  }
}

export class EmbeddingError extends PipelineError {
  constructor(message: string, cause?: unknown) {
    super(message, "embedding", cause);
    this.name = "EmbeddingError";
  }
}

export class VectorStoreError extends PipelineError {
  constructor(message: string, cause?: unknown) {
    super(message, "vector-store", cause);
    this.name = "VectorStoreError";
  }
}

export class ChatError extends PipelineError {
  constructor(message: string, cause?: unknown) {
    super(message, "chat", cause);
    this.name = "ChatError";
  }
}
