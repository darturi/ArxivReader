# ArXiv Reader — API Reference

All routes return JSON. Authentication is via Supabase session cookie (web) or Bearer token in the Authorization header (mobile).

## Search

### `GET /api/search?q=...`

Search for papers on ArXiv. Detects ArXiv IDs (e.g. `2301.12345`) and DOI patterns automatically.

**Response:** `{ papers: PaperResult[], remaining: number }`

Rate limited to 20 searches per user per hour. Returns 429 when exceeded.

---

## Papers

### `GET /api/papers?list=read|to_read`

Get all papers in a user's reading list, including tags.

**Response:** `{ papers: UserPaperWithTags[] }`

### `POST /api/papers`

Add a paper to a list. The paper must already exist in the cache (i.e. returned from search).

**Body:** `{ arxiv_id: string, list: "read" | "to_read" }`

**Response:** `{ user_paper_id: string }` (201)

### `GET /api/papers/:id`

Get full detail for a single paper, including tags and notes.

**Response:** `UserPaperWithTags`

### `PATCH /api/papers/:id`

Update a paper's list assignment or notes.

**Body:** `{ list?: "read" | "to_read", notes?: string }`

**Response:** `{ ok: true }`

### `DELETE /api/papers/:id`

Remove a paper from the user's library.

**Response:** `{ ok: true }`

---

## Paper Tags

### `POST /api/papers/:id/tags`

Attach a tag to a paper.

**Body:** `{ tag_id: string }`

**Response:** `{ ok: true }`

### `DELETE /api/papers/:id/tags/:tagId`

Detach a tag from a paper.

**Response:** `{ ok: true }`

---

## Tags

### `GET /api/tags`

List all tags belonging to the authenticated user.

**Response:** `{ tags: Tag[] }`

### `POST /api/tags`

Create a new tag.

**Body:** `{ name: string }`

**Response:** `{ tag: Tag }` (201)

### `DELETE /api/tags/:id`

Delete a tag. Cascades to all paper-tag associations.

**Response:** `{ ok: true }`

---

## Types

```typescript
interface PaperResult {
  arxiv_id: string;
  title: string;
  authors: string[];
  abstract: string;
  arxiv_url: string;
  published_at: string;
  source: "arxiv";
  user_list?: string | null; // present in search results
}

interface UserPaperWithTags {
  id: string;
  user_id: string;
  arxiv_id: string;
  list: "read" | "to_read";
  added_at: string;
  notes: string | null;
  title: string;
  authors: string[];
  abstract: string;
  arxiv_url: string;
  published_at: string;
  tags: Tag[];
}

interface Tag {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}
```
