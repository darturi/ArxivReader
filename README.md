# ArxivReader

A personal research library for saving, organizing, and annotating papers from arXiv. Available as a web app (Next.js) and a native iOS app (SwiftUI), both backed by Supabase.

**Elevator pitch:** ArxivReader lets you search arXiv, save papers to "Read" and "To Read" lists, tag them with color-coded labels, take notes, and track what you've read — all synced across web and mobile through a shared backend.

---

## Features

- **Search arXiv** — full-text keyword search, arXiv ID lookup (e.g. `2301.12345`), and DOI detection, all powered by the arXiv API
- **Reading lists** — organize papers into "Read" and "To Read" lists; move papers between them freely
- **Tags** — create user-owned tags with automatic color assignment (deterministic 12-color palette); filter paper lists by tag
- **Notes** — add freeform notes to any paper, with debounced auto-save
- **Read date tracking** — record when you finished reading a paper
- **Author pages** — tap any author name to see their other papers on arXiv
- **Paper cache** — shared across all users so repeated lookups don't hit the arXiv API
- **Rate limiting & quotas** — per-user limits to keep things sustainable (20 searches/hr, max 500 papers, max 100 tags)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Web frontend | Next.js 16, React 19, Tailwind CSS 4, TypeScript |
| iOS app | SwiftUI, iOS 17+, Swift 5.9+ |
| Backend | Next.js API routes (server-side), Supabase (PostgreSQL, Auth, RLS) |
| ArXiv parsing | fast-xml-parser |
| iOS dependencies | Supabase Swift SDK 2.0+ (via SPM) |
| Hosting | Vercel (web), Supabase (database & auth) |

## Project Structure

```
arxiv-reader/
├── src/                        # Next.js web app
│   ├── app/
│   │   ├── (app)/              # Authenticated routes
│   │   │   ├── search/         # ArXiv search page
│   │   │   ├── list/read/      # "Read" papers list
│   │   │   ├── list/to-read/   # "To Read" papers list
│   │   │   ├── tags/           # Tag manager page
│   │   │   └── author/[name]/  # Author search results
│   │   ├── api/                # Server-side API routes
│   │   │   ├── papers/         # CRUD for user papers
│   │   │   ├── tags/           # CRUD for tags
│   │   │   ├── search/         # ArXiv search proxy
│   │   │   └── author/         # Author search proxy
│   │   └── login/              # OAuth login page
│   ├── components/             # React UI components
│   └── lib/                    # Hooks, types, DB queries, adapters
├── ios/                        # Native iOS app (SwiftUI)
│   ├── ArxivReader/
│   │   ├── Models/             # Data models (Paper, Tag, etc.)
│   │   ├── Views/              # SwiftUI views (Search, Lists, Tags, etc.)
│   │   ├── Services/           # SupabaseService, AuthService
│   │   ├── Components/         # Reusable UI (TagPill, PaperCard, etc.)
│   │   └── Config.swift        # Reads Secrets.plist for keys
│   └── Package.swift           # SPM manifest
├── supabase/
│   └── migrations/             # SQL schema & security migrations
└── package.json
```

## Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Xcode** 15+ (for the iOS app)
- A **Supabase** project ([supabase.com](https://supabase.com))

### 1. Set Up Supabase

Create a new Supabase project, then run the migrations in order against your database (via the Supabase SQL editor or CLI):

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_add_read_at.sql
supabase/migrations/003_security_hardening.sql
```

These create the `users`, `paper_cache`, `user_papers`, `tags`, `paper_tags`, and `rate_limit_log` tables, along with Row Level Security policies, triggers, and quota constraints.

Enable **OAuth** (e.g. Google or GitHub) in your Supabase project's Auth settings.

### 2. Web App

Copy the environment template and fill in your Supabase credentials:

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the app.

**Deploying to production:** push to a Git repository connected to [Vercel](https://vercel.com). Set the same three environment variables in the Vercel project settings. No additional configuration is needed — Vercel auto-detects Next.js.

### 3. iOS App

The iOS app lives in the `ios/` directory and uses Swift Package Manager for dependencies.

1. Open `ios/` in Xcode (File → Open → select the `ios` folder or `Package.swift`).
2. Copy `Secrets.plist.example` to `Secrets.plist` and fill in your values:

```xml
<dict>
    <key>SUPABASE_URL</key>
    <string>https://your-project.supabase.co</string>
    <key>SUPABASE_ANON_KEY</key>
    <string>your-supabase-anon-key</string>
    <key>API_BASE_URL</key>
    <string>https://your-deployed-web-app.vercel.app</string>
</dict>
```

3. `Secrets.plist` is gitignored — never commit it.
4. Build and run on a simulator or device (iOS 17+).

The iOS app authenticates via Supabase OAuth and then calls the same Next.js API routes as the web app (using `Authorization: Bearer <token>` headers), so the web app must be deployed before the iOS app can function.

## API Routes

All write operations are routed through the Next.js API (which uses the Supabase service role key) to enforce rate limiting and quotas server-side.

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/search?q=` | Search arXiv papers |
| `GET` | `/api/author?name=` | Search papers by author |
| `GET` | `/api/papers?list=` | List user's papers (with tags) |
| `POST` | `/api/papers` | Add a paper to a list |
| `GET` | `/api/papers/:id` | Get paper details |
| `PATCH` | `/api/papers/:id` | Update notes, list, or read date |
| `DELETE` | `/api/papers/:id` | Remove paper from library |
| `GET` | `/api/tags` | List user's tags |
| `POST` | `/api/tags` | Create a new tag |
| `DELETE` | `/api/tags/:id` | Delete a tag (removes from all papers) |
| `POST` | `/api/papers/:id/tags` | Attach a tag to a paper |
| `DELETE` | `/api/papers/:id/tags/:tagId` | Remove a tag from a paper |

## Database Schema

Five main tables, all protected by Row Level Security:

- **paper_cache** — shared arXiv metadata cache (keyed by `arxiv_id`); writable only by the service role
- **user_papers** — a user's saved papers, linking to `paper_cache`; includes `list`, `notes`, and `read_at` fields
- **tags** — user-owned tags (unique per user by name)
- **paper_tags** — join table connecting `user_papers` to `tags`
- **rate_limit_log** — tracks API usage per user per action for rate limiting

## Architecture Notes

**Authentication:** The web app uses Supabase SSR cookies. The iOS app uses Supabase OAuth and passes the access token as a `Bearer` header to the Next.js API routes, which verify it server-side.

**Paper source adapter pattern:** ArXiv fetching is abstracted behind a `PaperSourceAdapter` interface (`src/lib/types.ts`), making it possible to add other sources (e.g. Semantic Scholar, IEEE) in the future.

**Tag colors:** Each tag name is hashed to one of 12 colors in a warm, neutral palette. The same tag always gets the same color, with no user configuration needed.

## License

Private project — not currently published under an open-source license.
