import { PaperSourceAdapter } from "@/lib/types";
import { ArxivAdapter } from "./arxiv";

// Adapter registry — add new paper sources here
const adapters: Record<string, PaperSourceAdapter> = {
  arxiv: new ArxivAdapter(),
};

export function getAdapter(source: string = "arxiv"): PaperSourceAdapter {
  const adapter = adapters[source];
  if (!adapter) {
    throw new Error(`Unknown paper source: ${source}`);
  }
  return adapter;
}

export function getDefaultAdapter(): PaperSourceAdapter {
  return adapters.arxiv;
}
