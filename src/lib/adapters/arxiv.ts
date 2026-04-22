import { XMLParser } from "fast-xml-parser";
import { PaperResult, PaperSourceAdapter } from "@/lib/types";

const ARXIV_API_BASE = "http://export.arxiv.org/api/query";
const USER_AGENT = "ArXivReader/1.0 (mailto:dan.arturi@gmail.com)";

// No per-request throttle — server-side rate limiting (20 searches/hr/user)
// already prevents abuse, and on serverless each invocation is isolated
// so an in-memory throttle doesn't work anyway.

function parseArxivId(entry: Record<string, unknown>): string {
  const id = String(entry.id || "");
  // ArXiv IDs in the API look like http://arxiv.org/abs/2301.12345v1
  const match = id.match(/abs\/(.+?)(?:v\d+)?$/);
  return match ? match[1] : id;
}

function parseAuthors(
  entry: Record<string, unknown>
): string[] {
  const authorField = entry.author;
  if (!authorField) return [];
  const authors = Array.isArray(authorField) ? authorField : [authorField];
  return authors.map((a: Record<string, unknown>) =>
    String(a.name || "Unknown")
  );
}

function entryToPaperResult(entry: Record<string, unknown>): PaperResult {
  const links = Array.isArray(entry.link) ? entry.link : [entry.link];
  const absLink = links.find(
    (l: Record<string, unknown>) => l?.["@_type"] === "text/html"
  );
  const arxivId = parseArxivId(entry);

  return {
    arxiv_id: arxivId,
    title: String(entry.title || "")
      .replace(/\s+/g, " ")
      .trim(),
    authors: parseAuthors(entry),
    abstract: String(entry.summary || "")
      .replace(/\s+/g, " ")
      .trim(),
    arxiv_url:
      absLink && typeof absLink === "object" && "@_href" in absLink
        ? String(absLink["@_href"])
        : `https://arxiv.org/abs/${arxivId}`,
    published_at: String(entry.published || ""),
    source: "arxiv",
  };
}

export class ArxivAdapter implements PaperSourceAdapter {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    });
  }

  async search(query: string, maxResults = 20): Promise<PaperResult[]> {

    const params = new URLSearchParams({
      search_query: `all:${query}`,
      start: "0",
      max_results: String(maxResults),
      sortBy: "relevance",
      sortOrder: "descending",
    });

    const response = await fetch(`${ARXIV_API_BASE}?${params}`, {
      headers: { "User-Agent": USER_AGENT },
    });

    if (!response.ok) {
      throw new Error(`ArXiv API error: ${response.status}`);
    }

    const xml = await response.text();
    const parsed = this.parser.parse(xml);
    const feed = parsed.feed;

    if (!feed || !feed.entry) return [];

    const entries = Array.isArray(feed.entry) ? feed.entry : [feed.entry];
    return entries.map(entryToPaperResult);
  }

  async searchByAuthor(authorName: string, maxResults = 40): Promise<PaperResult[]> {

    const params = new URLSearchParams({
      search_query: `au:"${authorName}"`,
      start: "0",
      max_results: String(maxResults),
      sortBy: "submittedDate",
      sortOrder: "descending",
    });

    const response = await fetch(`${ARXIV_API_BASE}?${params}`, {
      headers: { "User-Agent": USER_AGENT },
    });

    if (!response.ok) {
      throw new Error(`ArXiv API error: ${response.status}`);
    }

    const xml = await response.text();
    const parsed = this.parser.parse(xml);
    const feed = parsed.feed;

    if (!feed || !feed.entry) return [];

    const entries = Array.isArray(feed.entry) ? feed.entry : [feed.entry];
    return entries.map(entryToPaperResult);
  }

  async fetchByIdentifier(id: string): Promise<PaperResult | null> {

    const response = await fetch(
      `${ARXIV_API_BASE}?id_list=${encodeURIComponent(id)}`,
      { headers: { "User-Agent": USER_AGENT } }
    );

    if (!response.ok) {
      throw new Error(`ArXiv API error: ${response.status}`);
    }

    const xml = await response.text();
    const parsed = this.parser.parse(xml);
    const feed = parsed.feed;

    if (!feed || !feed.entry) return null;

    const entry = Array.isArray(feed.entry) ? feed.entry[0] : feed.entry;
    // Check if the entry is a valid result (not an error)
    if (!entry.title || String(entry.title).startsWith("Error")) return null;

    return entryToPaperResult(entry);
  }
}
