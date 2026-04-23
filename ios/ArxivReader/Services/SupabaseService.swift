import Foundation
import Supabase
import Combine

class SupabaseService: ObservableObject {
    static let shared = SupabaseService()

    let client: SupabaseClient

    private init() {
        client = SupabaseClient(
            supabaseURL: Config.supabaseURL,
            supabaseKey: Config.supabaseAnonKey,
            options: .init(
                auth: .init(
                    redirectToURL: URL(string: "arxivreader://auth/callback"),
                    emitLocalSessionAsInitialSession: true
                )
            )
        )
    }

    // MARK: - Authenticated API request helper

    /// All write operations go through the Next.js API to enforce server-side
    /// rate limiting and quotas. This helper builds an authenticated request.
    private func apiRequest(
        path: String,
        method: String = "GET",
        body: [String: Any]? = nil,
        accessToken: String
    ) async throws -> (Data, HTTPURLResponse) {
        guard let url = URL(string: "\(Config.apiBaseURL)\(path)") else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }

        if httpResponse.statusCode == 429 {
            throw APIError.rateLimited
        }
        if httpResponse.statusCode == 403 {
            let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
            let msg = json?["error"] as? String ?? "Quota exceeded"
            throw APIError.quotaExceeded(msg)
        }
        if httpResponse.statusCode == 401 {
            throw APIError.unauthorized
        }

        return (data, httpResponse)
    }

    // MARK: - User Papers (reads and writes both go through API for consistency)

    struct PapersAPIResponse: Decodable {
        let papers: [UserPaperAPI]
    }

    /// Fetch papers via the Next.js API (service role — no RLS issues with tags).
    func getUserPapersViaAPI(list: ReadingList, accessToken: String) async throws -> [UserPaper] {
        let (data, response) = try await apiRequest(
            path: "/api/papers?list=\(list.rawValue)",
            accessToken: accessToken
        )

        guard response.statusCode == 200 else {
            if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let msg = json["error"] as? String {
                throw APIError.searchFailed(msg)
            }
            throw APIError.serverError(response.statusCode)
        }

        let result = try JSONDecoder().decode(PapersAPIResponse.self, from: data)
        return result.papers.map { $0.toUserPaper() }
    }

    // MARK: - Direct Supabase reads (used as fallback)

    func getUserPapers(userId: String, list: ReadingList, limit: Int = 50, offset: Int = 0) async throws -> [UserPaper] {
        // Single query with embedded tags — avoids separate paper_tags query
        let rows: [UserPaperRowWithTags] = try await client
            .from("user_papers")
            .select("""
                id,
                user_id,
                arxiv_id,
                list,
                added_at,
                notes,
                read_at,
                paper_cache (
                    title,
                    authors,
                    abstract,
                    arxiv_url,
                    published_at
                ),
                paper_tags (
                    tags (
                        id,
                        user_id,
                        name,
                        created_at
                    )
                )
            """)
            .eq("user_id", value: userId)
            .eq("list", value: list.rawValue)
            .order("added_at", ascending: false)
            .range(from: offset, to: offset + limit - 1)
            .execute()
            .value

        return rows.map { row in
            let cache = row.paperCache
            let tags = (row.paperTags ?? []).compactMap { $0.tags }
            return UserPaper(
                id: row.id,
                userId: row.userId,
                arxivId: row.arxivId,
                list: row.list,
                addedAt: row.addedAt,
                notes: row.notes,
                readAt: row.readAt,
                title: cache?.title ?? "",
                authors: cache?.authorsList ?? [],
                abstract: cache?.abstract ?? "",
                arxivUrl: cache?.arxivUrl ?? "",
                publishedAt: cache?.publishedAt ?? "",
                tags: tags
            )
        }
    }

    func getUserPaper(userId: String, paperId: String) async throws -> UserPaper? {
        let row: UserPaperRowWithTags? = try? await client
            .from("user_papers")
            .select("""
                id,
                user_id,
                arxiv_id,
                list,
                added_at,
                notes,
                read_at,
                paper_cache (
                    title,
                    authors,
                    abstract,
                    arxiv_url,
                    published_at
                ),
                paper_tags (
                    tags (
                        id,
                        user_id,
                        name,
                        created_at
                    )
                )
            """)
            .eq("id", value: paperId)
            .eq("user_id", value: userId)
            .single()
            .execute()
            .value

        guard let row else { return nil }

        let tags = (row.paperTags ?? []).compactMap { $0.tags }
        let cache = row.paperCache

        return UserPaper(
            id: row.id,
            userId: row.userId,
            arxivId: row.arxivId,
            list: row.list,
            addedAt: row.addedAt,
            notes: row.notes,
            readAt: row.readAt,
            title: cache?.title ?? "",
            authors: cache?.authorsList ?? [],
            abstract: cache?.abstract ?? "",
            arxivUrl: cache?.arxivUrl ?? "",
            publishedAt: cache?.publishedAt ?? "",
            tags: tags
        )
    }

    // Read-only lookup (direct Supabase - no write, no rate limit needed)
    func getUserPaperByArxivId(
        userId: String,
        arxivId: String
    ) async throws -> (id: String, list: String)? {
        struct Row: Decodable { let id: String; let list: String }
        let row: Row? = try? await client
            .from("user_papers")
            .select("id, list")
            .eq("user_id", value: userId)
            .eq("arxiv_id", value: arxivId)
            .single()
            .execute()
            .value
        guard let row else { return nil }
        return (row.id, row.list)
    }

    // Read-only (direct Supabase)
    func getUserTags(userId: String) async throws -> [Tag] {
        try await client
            .from("tags")
            .select("*")
            .eq("user_id", value: userId)
            .order("name")
            .execute()
            .value
    }

    // MARK: - Write operations (all routed through Next.js API)

    struct AddPaperResponse: Decodable {
        let user_paper_id: String
    }

    func addPaperToList(
        userId: String,
        arxivId: String,
        list: ReadingList,
        readAt: String? = nil,
        accessToken: String
    ) async throws -> String {
        var body: [String: Any] = [
            "arxiv_id": arxivId,
            "list": list.rawValue,
        ]
        if list == .read, let readAt {
            body["read_at"] = readAt
        }

        let (data, response) = try await apiRequest(
            path: "/api/papers",
            method: "POST",
            body: body,
            accessToken: accessToken
        )

        if response.statusCode == 201 || response.statusCode == 200 {
            let result = try JSONDecoder().decode(AddPaperResponse.self, from: data)
            return result.user_paper_id
        }

        throw APIError.serverError(response.statusCode)
    }

    func updateUserPaper(
        paperId: String,
        updates: [String: Any],
        accessToken: String
    ) async throws {
        let (_, response) = try await apiRequest(
            path: "/api/papers/\(paperId)",
            method: "PATCH",
            body: updates,
            accessToken: accessToken
        )

        if response.statusCode != 200 {
            throw APIError.serverError(response.statusCode)
        }
    }

    func deleteUserPaper(paperId: String, accessToken: String) async throws {
        let (_, response) = try await apiRequest(
            path: "/api/papers/\(paperId)",
            method: "DELETE",
            accessToken: accessToken
        )

        if response.statusCode != 200 {
            throw APIError.serverError(response.statusCode)
        }
    }

    // MARK: - Tag writes (through API)

    struct CreateTagResponse: Decodable {
        let tag: Tag
    }

    func createTag(name: String, accessToken: String) async throws -> Tag {
        let (data, response) = try await apiRequest(
            path: "/api/tags",
            method: "POST",
            body: ["name": name],
            accessToken: accessToken
        )

        if response.statusCode == 201 || response.statusCode == 200 {
            let result = try JSONDecoder().decode(CreateTagResponse.self, from: data)
            return result.tag
        }

        throw APIError.serverError(response.statusCode)
    }

    func deleteTag(tagId: String, accessToken: String) async throws {
        let (_, response) = try await apiRequest(
            path: "/api/tags/\(tagId)",
            method: "DELETE",
            accessToken: accessToken
        )

        if response.statusCode != 200 {
            throw APIError.serverError(response.statusCode)
        }
    }

    struct TagOperationResponse: Decodable {
        let ok: Bool
        let tags: [Tag]?
    }

    /// Add a tag to a paper. Returns the server's current list of tags for this paper.
    func addTagToPaper(userPaperId: String, tagId: String, accessToken: String) async throws -> [Tag] {
        let (data, response) = try await apiRequest(
            path: "/api/papers/\(userPaperId)/tags",
            method: "POST",
            body: ["tag_id": tagId],
            accessToken: accessToken
        )

        if response.statusCode != 200 {
            throw APIError.serverError(response.statusCode)
        }

        let result = try JSONDecoder().decode(TagOperationResponse.self, from: data)
        return result.tags ?? []
    }

    /// Remove a tag from a paper. Returns the server's remaining tags for this paper.
    func removeTagFromPaper(userPaperId: String, tagId: String, accessToken: String) async throws -> [Tag] {
        let (data, response) = try await apiRequest(
            path: "/api/papers/\(userPaperId)/tags/\(tagId)",
            method: "DELETE",
            accessToken: accessToken
        )

        if response.statusCode != 200 {
            throw APIError.serverError(response.statusCode)
        }

        let result = try JSONDecoder().decode(TagOperationResponse.self, from: data)
        return result.tags ?? []
    }

    // MARK: - Search (via Next.js API)

    func searchPapers(query: String, accessToken: String) async throws -> SearchResponse {
        let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? query
        let (data, response) = try await apiRequest(
            path: "/api/search?q=\(encoded)",
            accessToken: accessToken
        )

        guard response.statusCode == 200 else {
            // Try to extract error message from response
            if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let msg = json["error"] as? String {
                throw APIError.searchFailed(msg)
            }
            throw APIError.serverError(response.statusCode)
        }

        return try JSONDecoder().decode(SearchResponse.self, from: data)
    }

    func searchByAuthor(name: String, accessToken: String) async throws -> SearchResponse {
        let encoded = name.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? name
        let (data, response) = try await apiRequest(
            path: "/api/author?name=\(encoded)",
            accessToken: accessToken
        )

        guard response.statusCode == 200 else {
            if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let msg = json["error"] as? String {
                throw APIError.searchFailed(msg)
            }
            throw APIError.serverError(response.statusCode)
        }

        return try JSONDecoder().decode(SearchResponse.self, from: data)
    }
}

// MARK: - API Errors

enum APIError: LocalizedError {
    case rateLimited
    case quotaExceeded(String)
    case unauthorized
    case serverError(Int)
    case searchFailed(String)

    var errorDescription: String? {
        switch self {
        case .rateLimited:
            return "Rate limit reached. Please try again later."
        case .quotaExceeded(let msg):
            return msg
        case .unauthorized:
            return "Session expired. Please sign in again."
        case .serverError(let code):
            return "Request failed (HTTP \(code))"
        case .searchFailed(let msg):
            return msg
        }
    }
}

// Keep SearchError as alias for backward compatibility
typealias SearchError = APIError
