import Foundation
import Supabase

@MainActor
class SupabaseService: ObservableObject {
    static let shared = SupabaseService()

    let client: SupabaseClient

    private init() {
        client = SupabaseClient(
            supabaseURL: Config.supabaseURL,
            supabaseKey: Config.supabaseAnonKey
        )
    }

    // MARK: - User Papers

    func getUserPapers(userId: String, list: ReadingList) async throws -> [UserPaper] {
        let rows: [UserPaperRow] = try await client
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
                )
            """)
            .eq("user_id", value: userId)
            .eq("list", value: list.rawValue)
            .order("added_at", ascending: false)
            .execute()
            .value

        // Fetch tags for all papers
        let paperIds = rows.map { $0.id }
        guard !paperIds.isEmpty else { return [] }

        let paperTags: [PaperTagRow] = try await client
            .from("paper_tags")
            .select("""
                user_paper_id,
                tags (
                    id,
                    user_id,
                    name,
                    created_at
                )
            """)
            .in("user_paper_id", values: paperIds)
            .execute()
            .value

        var tagsByPaperId: [String: [Tag]] = [:]
        for pt in paperTags {
            if let tag = pt.tags {
                tagsByPaperId[pt.userPaperId, default: []].append(tag)
            }
        }

        return rows.map { row in
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
                tags: tagsByPaperId[row.id] ?? []
            )
        }
    }

    func getUserPaper(userId: String, paperId: String) async throws -> UserPaper? {
        let row: UserPaperRow? = try? await client
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
                )
            """)
            .eq("id", value: paperId)
            .eq("user_id", value: userId)
            .single()
            .execute()
            .value

        guard let row else { return nil }

        let paperTags: [PaperTagRow] = (try? await client
            .from("paper_tags")
            .select("""
                user_paper_id,
                tags (
                    id,
                    user_id,
                    name,
                    created_at
                )
            """)
            .eq("user_paper_id", value: paperId)
            .execute()
            .value) ?? []

        let tags = paperTags.compactMap { $0.tags }
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

    struct AddPaperRow: Encodable {
        let user_id: String
        let arxiv_id: String
        let list: String
        let read_at: String?
    }

    struct AddPaperResult: Decodable {
        let id: String
    }

    func addPaperToList(
        userId: String,
        arxivId: String,
        list: ReadingList,
        readAt: String? = nil
    ) async throws -> String {
        let row = AddPaperRow(
            user_id: userId,
            arxiv_id: arxivId,
            list: list.rawValue,
            read_at: list == .read ? readAt : nil
        )

        let result: AddPaperResult = try await client
            .from("user_papers")
            .insert(row)
            .select("id")
            .single()
            .execute()
            .value

        return result.id
    }

    func updateUserPaper(
        userId: String,
        paperId: String,
        updates: [String: AnyJSON]
    ) async throws {
        try await client
            .from("user_papers")
            .update(updates)
            .eq("id", value: paperId)
            .eq("user_id", value: userId)
            .execute()
    }

    func deleteUserPaper(userId: String, paperId: String) async throws {
        try await client
            .from("user_papers")
            .delete()
            .eq("id", value: paperId)
            .eq("user_id", value: userId)
            .execute()
    }

    struct ExistingPaperRow: Decodable {
        let arxiv_id: String
        let list: String
    }

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

    // MARK: - Tags

    func getUserTags(userId: String) async throws -> [Tag] {
        try await client
            .from("tags")
            .select("*")
            .eq("user_id", value: userId)
            .order("name")
            .execute()
            .value
    }

    struct CreateTagRow: Encodable {
        let user_id: String
        let name: String
    }

    func createTag(userId: String, name: String) async throws -> Tag {
        try await client
            .from("tags")
            .insert(CreateTagRow(user_id: userId, name: name))
            .select()
            .single()
            .execute()
            .value
    }

    func deleteTag(userId: String, tagId: String) async throws {
        try await client
            .from("tags")
            .delete()
            .eq("id", value: tagId)
            .eq("user_id", value: userId)
            .execute()
    }

    struct PaperTagInsert: Encodable {
        let user_paper_id: String
        let tag_id: String
    }

    func addTagToPaper(userPaperId: String, tagId: String) async throws {
        try await client
            .from("paper_tags")
            .insert(PaperTagInsert(user_paper_id: userPaperId, tag_id: tagId))
            .execute()
    }

    func removeTagFromPaper(userPaperId: String, tagId: String) async throws {
        try await client
            .from("paper_tags")
            .delete()
            .eq("user_paper_id", value: userPaperId)
            .eq("tag_id", value: tagId)
            .execute()
    }

    // MARK: - Search (via Next.js API for rate limiting)

    func searchPapers(query: String, accessToken: String) async throws -> SearchResponse {
        guard let url = URL(string: "\(Config.apiBaseURL)/api/search?q=\(query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? query)") else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)

        if let httpResponse = response as? HTTPURLResponse {
            if httpResponse.statusCode == 429 {
                throw SearchError.rateLimited
            }
            if httpResponse.statusCode != 200 {
                throw SearchError.serverError(httpResponse.statusCode)
            }
        }

        let decoder = JSONDecoder()
        return try decoder.decode(SearchResponse.self, from: data)
    }

    func searchByAuthor(name: String, accessToken: String) async throws -> SearchResponse {
        guard let url = URL(string: "\(Config.apiBaseURL)/api/author?name=\(name.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? name)") else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)

        if let httpResponse = response as? HTTPURLResponse {
            if httpResponse.statusCode == 429 {
                throw SearchError.rateLimited
            }
            if httpResponse.statusCode != 200 {
                throw SearchError.serverError(httpResponse.statusCode)
            }
        }

        let decoder = JSONDecoder()
        return try decoder.decode(SearchResponse.self, from: data)
    }
}

// MARK: - Search Errors

enum SearchError: LocalizedError {
    case rateLimited
    case serverError(Int)

    var errorDescription: String? {
        switch self {
        case .rateLimited:
            return "Rate limit reached. Please try again later."
        case .serverError(let code):
            return "Search failed (HTTP \(code))"
        }
    }
}
