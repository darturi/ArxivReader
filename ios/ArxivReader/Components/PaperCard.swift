import SwiftUI

struct PaperCard: View {
    let paper: UserPaper
    var highlightQuery: String = ""
    var onAuthorTap: ((String) -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Title
            if highlightQuery.isEmpty {
                Text(paper.title)
                    .font(.headline)
                    .lineLimit(2)
            } else {
                HighlightedText(paper.title, highlight: highlightQuery)
                    .font(.headline)
                    .lineLimit(2)
            }

            // Authors
            HStack(spacing: 0) {
                let authorText = paper.authors.joined(separator: ", ")
                if highlightQuery.isEmpty {
                    Text(authorText)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                } else {
                    HighlightedText(authorText, highlight: highlightQuery)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }

            // Year + read date
            HStack(spacing: 8) {
                if let year = paper.publishedAt.prefix(4).description.nilIfEmpty {
                    Text(year)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                if let readAt = paper.readAt {
                    Text("Read \(readAt)")
                        .font(.caption)
                        .foregroundStyle(.brown)
                }
            }

            // Tags
            if !paper.tags.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 4) {
                        ForEach(paper.tags) { tag in
                            TagPill(tag: tag, small: true)
                        }
                    }
                }
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Highlight helper

struct HighlightedText: View {
    let text: String
    let highlight: String

    init(_ text: String, highlight: String) {
        self.text = text
        self.highlight = highlight
    }

    var body: some View {
        if highlight.isEmpty {
            Text(text)
        } else {
            let parts = splitWithHighlight(text: text, highlight: highlight)
            parts.reduce(Text("")) { result, part in
                if part.isMatch {
                    result + Text(part.text).bold().foregroundColor(.orange)
                } else {
                    result + Text(part.text)
                }
            }
        }
    }

    private struct TextPart {
        let text: String
        let isMatch: Bool
    }

    private func splitWithHighlight(text: String, highlight: String) -> [TextPart] {
        guard !highlight.isEmpty else { return [TextPart(text: text, isMatch: false)] }

        var parts: [TextPart] = []
        let lowered = text.lowercased()
        let pattern = highlight.lowercased()
        var searchStart = lowered.startIndex

        while let range = lowered.range(of: pattern, range: searchStart..<lowered.endIndex) {
            // Add non-matching prefix
            if searchStart < range.lowerBound {
                let prefix = String(text[searchStart..<range.lowerBound])
                parts.append(TextPart(text: prefix, isMatch: false))
            }
            // Add match
            let match = String(text[range])
            parts.append(TextPart(text: match, isMatch: true))
            searchStart = range.upperBound
        }

        // Add remaining text
        if searchStart < text.endIndex {
            parts.append(TextPart(text: String(text[searchStart...]), isMatch: false))
        }

        return parts
    }
}

// MARK: - String helper

extension String {
    var nilIfEmpty: String? {
        isEmpty ? nil : self
    }
}
