import SwiftUI

struct SearchView: View {
    @EnvironmentObject var authService: AuthService
    @State private var query = ""
    @State private var results: [SearchResultPaper] = []
    @State private var loading = false
    @State private var error: String?
    @State private var remaining: Int?

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search bar
                HStack {
                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundStyle(.secondary)
                        TextField("Search ArXiv papers...", text: $query)
                            .textFieldStyle(.plain)
                            .autocorrectionDisabled()
                            .onSubmit { performSearch() }
                    }
                    .padding(10)
                    .background(Color(.systemGray6))
                    .clipShape(RoundedRectangle(cornerRadius: 10))

                    if !query.isEmpty {
                        Button("Search") { performSearch() }
                            .buttonStyle(.borderedProminent)
                            .tint(.brown)
                    }
                }
                .padding()

                // Rate limit indicator
                if let remaining {
                    HStack {
                        Image(systemName: "gauge.with.dots.needle.33percent")
                            .font(.caption2)
                        Text("\(remaining) searches remaining this hour")
                            .font(.caption2)
                    }
                    .foregroundStyle(.secondary)
                    .padding(.bottom, 8)
                }

                // Results
                if loading {
                    Spacer()
                    ProgressView("Searching...")
                    Spacer()
                } else if let error {
                    Spacer()
                    ContentUnavailableView {
                        Label("Error", systemImage: "exclamationmark.triangle")
                    } description: {
                        Text(error)
                    }
                    Spacer()
                } else if results.isEmpty && !query.isEmpty {
                    Spacer()
                    ContentUnavailableView {
                        Label("No Results", systemImage: "magnifyingglass")
                    } description: {
                        Text("Try a different search query.")
                    }
                    Spacer()
                } else {
                    List {
                        ForEach(results) { paper in
                            SearchResultCard(paper: paper)
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Search")
        }
    }

    private func performSearch() {
        let q = query.trimmingCharacters(in: .whitespaces)
        guard !q.isEmpty else { return }

        Task {
            loading = true
            error = nil
            do {
                guard let token = await authService.getAccessToken() else {
                    error = "Not authenticated"
                    loading = false
                    return
                }
                let response = try await SupabaseService.shared.searchPapers(query: q, accessToken: token)
                results = response.papers
                remaining = response.remaining
            } catch let err as SearchError {
                error = err.localizedDescription
            } catch {
                self.error = error.localizedDescription
            }
            loading = false
        }
    }
}
