// ---- Paper types ----

export interface PaperResult {
  arxiv_id: string;
  title: string;
  authors: string[];
  abstract: string;
  arxiv_url: string;
  published_at: string; // ISO date
  source: "arxiv";
}

export interface UserPaper {
  id: string;
  user_id: string;
  arxiv_id: string;
  list: "read" | "to_read";
  added_at: string;
  notes: string | null;
  read_at: string | null;
}

export interface UserPaperWithDetails extends UserPaper {
  title: string;
  authors: string[];
  abstract: string;
  arxiv_url: string;
  published_at: string;
  tags: Tag[];
}

// ---- Tag types ----

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

// ---- API response types ----

export interface ApiError {
  error: string;
}

export interface SearchResponse {
  papers: PaperResult[];
  cached: boolean;
}

// ---- Adapter interface ----

export interface PaperSourceAdapter {
  search(query: string, maxResults?: number): Promise<PaperResult[]>;
  searchByAuthor(authorName: string, maxResults?: number): Promise<PaperResult[]>;
  fetchByIdentifier(id: string): Promise<PaperResult | null>;
}
