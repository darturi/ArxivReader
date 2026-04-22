import SwiftUI

struct AuthorView: View {
    let authorName: String
    @EnvironmentObject var authService: AuthService
    @State private var papers: [SearchResultPaper] = []
    @State private var loading = true
    @State private var error: String?

    var body: some View {
        Group {
            if loading {
                ProgressView("Loading papers by \(authorName)...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error {
                ContentUnavailableView {
                    Label("Error", systemImage: "exclamationmark.triangle")
                } description: {
                    Text(error)
                } actions: {
                    Button("Retry") { Task { await loadPapers() } }
                }
            } else if papers.isEmpty {
                ContentUnavailableView {
                    Label("No Papers", systemImage: "doc.text")
                } description: {
                    Text("No papers found by \(authorName).")
                }
            } else {
                List {
                    ForEach(papers) { paper in
                        SearchResultCard(paper: paper)
                    }
                }
                .listStyle(.plain)
            }
        }
        .navigationTitle(authorName)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await loadPapers()
        }
    }

    private func loadPapers() async {
        loading = true
        error = nil
        do {
            guard let token = await authService.getAccessToken() else {
                error = "Not authenticated"
                loading = false
                return
            }
            let response = try await SupabaseService.shared.searchByAuthor(
                name: authorName,
                accessToken: token
            )
            papers = response.papers
        } catch let err as SearchError {
            error = err.localizedDescription
        } catch {
            self.error = error.localizedDescription
        }
        loading = false
    }
}
