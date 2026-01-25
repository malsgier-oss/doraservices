import type { ComponentType } from "react";
import React from "react";

/**
 * Thrown when a dynamic route chunk fails to load after retries (e.g. 404 after deploy,
 * or HTML served instead of JS). Use in AppErrorBoundary to show "New version – please refresh".
 */
export class ChunkLoadError extends Error {
  readonly name = "ChunkLoadError";

  constructor(
    message = "Failed to load app chunk. A new version may be available.",
    public readonly cause?: unknown
  ) {
    super(message);
    Object.setPrototypeOf(this, ChunkLoadError.prototype);
  }
}

function isChunkLoadError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const s = msg.toLowerCase();
  if (/failed to fetch dynamically imported module/i.test(s)) return true;
  if (/unexpected end of script/i.test(s)) return true;
  if (err instanceof SyntaxError && /unexpected end of script/i.test((err as Error).message)) return true;
  if (err instanceof TypeError && /fetch/i.test((err as Error).message)) return true;
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wraps a dynamic import with retries. On permanent failure after retries, throws ChunkLoadError
 * so the error boundary can show "New version – please refresh".
 */
async function retryingImport<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  retries: number,
  delayMs: number
): Promise<{ default: T }> {
  try {
    return await importFn();
  } catch (err) {
    if (!isChunkLoadError(err)) throw err;
    if (retries <= 0) throw new ChunkLoadError(undefined, err);
    await sleep(delayMs);
    return retryingImport(importFn, retries - 1, delayMs);
  }
}

export type LazyWithRetryOptions = {
  retries?: number;
  delay?: number;
};

/**
 * Like React.lazy but retries the import on chunk load failure (e.g. "Failed to fetch
 * dynamically imported module" or "Unexpected end of script"). After retries are exhausted,
 * throws ChunkLoadError for the error boundary to show a refresh prompt.
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  options?: LazyWithRetryOptions
): React.LazyExoticComponent<T> {
  const retries = options?.retries ?? 2;
  const delayMs = options?.delay ?? 500;
  return React.lazy(() => retryingImport(importFn, retries, delayMs));
}
