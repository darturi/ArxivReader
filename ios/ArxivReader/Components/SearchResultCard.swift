import SwiftUI

struct SearchResultCard: View {
    let paper: SearchResultPaper
    @EnvironmentObject var authService: AuthService
    @State private var isExpanded = false
    @State private var userList: String?
    @State private var isAdding = false
    @State private var showDatePicker = false
    @State private var readDate = Date()

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Header (always visible)
            Button {
                withAnimation(.easeInOut(duration: 0.2)) {
                    isExpanded.toggle()
                }
            } label: {
                HStack(alignment: .top, spacing: 8) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(paper.title)
                            .font(.headline)
                            .multilineTextAlignment(.leading)
                            .foregroundStyle(.primary)

                        Text(isExpanded ? paper.authors.joined(separator: ", ") : paper.authors.prefix(3).joined(separator: ", ") + (paper.authors.count > 3 ? " +\(paper.authors.count - 3) more" : ""))
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .lineLimit(isExpanded ? nil : 1)

                        if !isExpanded {
                            Text(paper.abstract)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .lineLimit(2)
                        }
                    }

                    Spacer()

                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .buttonStyle(.plain)

            // Expanded content
            if isExpanded {
                VStack(alignment: .leading, spacing: 8) {
                    if !paper.publishedAt.isEmpty {
                        Text("Published: \(String(paper.publishedAt.prefix(10)))")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    if let url = URL(string: paper.arxivUrl) {
                        Link(destination: url) {
                            Label("View on ArXiv", systemImage: "link")
                                .font(.caption)
                        }
                    }

                    Text(paper.abstract)
                        .font(.body)
                        .foregroundStyle(.secondary)
                }
                .padding(.top, 4)
            }

            // Add buttons
            HStack(spacing: 12) {
                if let list = userList ?? paper.userList {
                    Label(
                        list == "read" ? "In Read" : "In To Read",
                        systemImage: list == "read" ? "book.fill" : "bookmark.fill"
                    )
                    .font(.caption)
                    .foregroundStyle(.brown)
                } else {
                    if showDatePicker {
                        // Date picker for "Add to Read"
                        HStack(spacing: 8) {
                            DatePicker("", selection: $readDate, displayedComponents: .date)
                                .labelsHidden()
                                .scaleEffect(0.85)

                            Button("Add") {
                                Task { await addToList(.read, readDate: readDate) }
                            }
                            .font(.caption)
                            .buttonStyle(.borderedProminent)
                            .tint(.brown)

                            Button("Skip date") {
                                Task { await addToList(.read, readDate: nil) }
                            }
                            .font(.caption)
                            .buttonStyle(.bordered)

                            Button("Cancel") {
                                showDatePicker = false
                            }
                            .font(.caption)
                        }
                    } else {
                        Button {
                            showDatePicker = true
                        } label: {
                            Label("Add to Read", systemImage: "book")
                                .font(.caption)
                        }
                        .buttonStyle(.bordered)
                        .tint(.brown)
                        .disabled(isAdding)

                        Button {
                            Task { await addToList(.toRead, readDate: nil) }
                        } label: {
                            Label("Add to To Read", systemImage: "bookmark")
                                .font(.caption)
                        }
                        .buttonStyle(.bordered)
                        .disabled(isAdding)
                    }
                }
            }
            .padding(.top, 4)
        }
        .padding(.vertical, 8)
    }

    private func addToList(_ list: ReadingList, readDate: Date?) async {
        guard let userId = authService.userId,
              let token = await authService.getAccessToken() else { return }
        isAdding = true

        let dateString: String? = readDate.map { date in
            let f = DateFormatter()
            f.dateFormat = "yyyy-MM-dd"
            return f.string(from: date)
        }

        do {
            _ = try await SupabaseService.shared.addPaperToList(
                userId: userId,
                arxivId: paper.arxivId,
                list: list,
                readAt: dateString,
                accessToken: token
            )
            userList = list.rawValue
            showDatePicker = false
        } catch {
            print("Failed to add paper: \(error)")
        }
        isAdding = false
    }
}
