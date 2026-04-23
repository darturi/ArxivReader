import SwiftUI

struct PaperListView: View {
    let listType: ReadingList
    @EnvironmentObject var authService: AuthService
    @State private var papers: [UserPaper] = []
    @State private var loading = true
    @State private var error: String?
    @State private var searchText = ""
    @State private var selectedTagFilter: Tag?
    @State private var selectedPaper: UserPaper?
    @State private var allTags: [Tag] = []

    private var filteredPapers: [UserPaper] {
        var result = papers

        // Filter by search text (title or author)
        if !searchText.isEmpty {
            let query = searchText.lowercased()
            result = result.filter { paper in
                paper.title.lowercased().contains(query) ||
                paper.authors.contains { $0.lowercased().contains(query) }
            }
        }

        // Filter by tag
        if let tag = selectedTagFilter {
            result = result.filter { paper in
                paper.tags.contains { $0.id == tag.id }
            }
        }

        return result
    }

    // Collect all unique tags from current papers
    private var availableTags: [Tag] {
        var seen = Set<String>()
        var tags: [Tag] = []
        for paper in papers {
            for tag in paper.tags where !seen.contains(tag.id) {
                seen.insert(tag.id)
                tags.append(tag)
            }
        }
        return tags.sorted { $0.name < $1.name }
    }

    var body: some View {
        NavigationStack {
            Group {
                if loading {
                    ProgressView("Loading...")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let error {
                    ContentUnavailableView {
                        Label("Error", systemImage: "exclamationmark.triangle")
                    } description: {
                        Text(error)
                    } actions: {
                        Button("Retry") { Task { await loadPapers() } }
                    }
                } else if filteredPapers.isEmpty {
                    ContentUnavailableView {
                        Label(
                            searchText.isEmpty && selectedTagFilter == nil
                                ? "No Papers"
                                : "No Results",
                            systemImage: "doc.text"
                        )
                    } description: {
                        Text(
                            searchText.isEmpty && selectedTagFilter == nil
                                ? "Papers you add to your \(listType.displayName) list will appear here."
                                : "Try a different search or filter."
                        )
                    }
                } else {
                    List {
                        ForEach(filteredPapers) { paper in
                            PaperCard(paper: paper, highlightQuery: searchText)
                                .contentShape(Rectangle())
                                .onTapGesture {
                                    selectedPaper = paper
                                }
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle(listType.displayName)
            .searchable(text: $searchText, prompt: "Search by title or author")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    if !availableTags.isEmpty {
                        Menu {
                            Button("All Tags") {
                                selectedTagFilter = nil
                            }
                            Divider()
                            ForEach(availableTags) { tag in
                                Button {
                                    selectedTagFilter = tag
                                } label: {
                                    HStack {
                                        Text(tag.name)
                                        if selectedTagFilter?.id == tag.id {
                                            Image(systemName: "checkmark")
                                        }
                                    }
                                }
                            }
                        } label: {
                            Image(systemName: selectedTagFilter != nil ? "line.3.horizontal.decrease.circle.fill" : "line.3.horizontal.decrease.circle")
                        }
                    }
                }
            }
            .refreshable {
                await loadPapers()
            }
            .sheet(item: $selectedPaper) { paper in
                PaperDetailView(
                    paper: paper,
                    onUpdate: { updatedPaper in
                        // Optimistic update
                        if let idx = papers.firstIndex(where: { $0.id == updatedPaper.id }) {
                            if updatedPaper.list != listType {
                                papers.remove(at: idx)
                            } else {
                                papers[idx] = updatedPaper
                            }
                        }
                    },
                    onDelete: {
                        papers.removeAll { $0.id == paper.id }
                        selectedPaper = nil
                    }
                )
                .environmentObject(authService)
            }
            .task {
                await loadPapers()
            }
            .onAppear {
                // Reload when navigating back to this tab
                if !papers.isEmpty {
                    Task { await loadPapers() }
                }
            }
        }
    }

    private func loadPapers() async {
        guard let userId = authService.userId else { return }
        loading = papers.isEmpty
        error = nil
        do {
            papers = try await SupabaseService.shared.getUserPapers(userId: userId, list: listType)
        } catch {
            self.error = error.localizedDescription
        }
        loading = false
    }
}

// MARK: - Convenience wrappers

struct ReadListView: View {
    var body: some View {
        PaperListView(listType: .read)
    }
}

struct ToReadListView: View {
    var body: some View {
        PaperListView(listType: .toRead)
    }
}
