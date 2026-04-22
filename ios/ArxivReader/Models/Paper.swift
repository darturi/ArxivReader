import Foundation

// MARK: - Reading List Enum

enum ReadingList: String, Codable, CaseIterable {
    case read
    case toRead = "to_read"

    var displayName: String {
        switch self {
        case .read: return "Read"
        case .toRead: return "To Read"
        }
    }
}

// MARK: - Tag

struct Tag: Codable, Identifiable, Hashable {
    let id: String
    let userId: String
    let name: String
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case name
        case createdAt = "created_at"
    }
}

// MARK: - Paper Cache (from Supabase paper_cache table)

struct PaperCache: Codable {
    let title: String
    let authors: AuthorsField
    let abstract: String
    let arxivUrl: String
    let publishedAt: String

    enum CodingKeys: String, CodingKey {
        case title, authors, abstract
        case arxivUrl = "arxiv_url"
        case publishedAt = "published_at"
    }

    // authors can be stored as JSON array string or native array
    var authorsList: [String] {
        switch authors {
        case .array(let arr): return arr
        case .string(let str):
            if let data = str.data(using: .utf8),
               let arr = try? JSONDecoder().decode([String].self, from: data) {
                return arr
            }
            return [str]
        }
    }
}

// Flexible decoder for authors field (can be JSON string or array)
enum AuthorsField: Codable, Hashable {
    case string(String)
    case array([String])

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let arr = try? container.decode([String].self) {
            self = .array(arr)
        } else if let str = try? container.decode(String.self) {
            self = .string(str)
        } else {
            self = .array([])
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let str): try container.encode(str)
        case .array(let arr): try container.encode(arr)
        }
    }
}

// MARK: - User Paper (raw row from user_papers)

struct UserPaperRow: Codable, Identifiable {
    let id: String
    let userId: String
    let arxivId: String
    let list: ReadingList
    let addedAt: String
    let notes: String?
    let readAt: String?
    let paperCache: PaperCache?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case arxivId = "arxiv_id"
        case list
        case addedAt = "added_at"
        case notes
        case readAt = "read_at"
        case paperCache = "paper_cache"
    }
}

// MARK: - Paper Tag join row

struct PaperTagRow: Codable {
    let userPaperId: String
    let tags: Tag?

    enum CodingKeys: String, CodingKey {
        case userPaperId = "user_paper_id"
        case tags
    }
}

// MARK: - User Paper with Details (enriched, used by views)

struct UserPaper: Identifiable, Hashable {
    let id: String
    let userId: String
    let arxivId: String
    var list: ReadingList
    let addedAt: String
    var notes: String?
    var readAt: String?
    var title: String
    var authors: [String]
    var abstract: String
    var arxivUrl: String
    var publishedAt: String
    var tags: [Tag]

    static func == (lhs: UserPaper, rhs: UserPaper) -> Bool {
        lhs.id == rhs.id
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}

// MARK: - Search Result (from API)

struct SearchResultPaper: Codable, Identifiable {
    var id: String { arxivId }
    let arxivId: String
    let title: String
    let authors: [String]
    let abstract: String
    let arxivUrl: String
    let publishedAt: String
    let source: String
    var userList: String?

    enum CodingKeys: String, CodingKey {
        case arxivId = "arxiv_id"
        case title, authors, abstract
        case arxivUrl = "arxiv_url"
        case publishedAt = "published_at"
        case source
        case userList = "user_list"
    }
}

struct SearchResponse: Codable {
    let papers: [SearchResultPaper]
    let remaining: Int
}
