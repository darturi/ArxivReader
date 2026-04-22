import SwiftUI

struct TagManagerView: View {
    @EnvironmentObject var authService: AuthService
    @State private var tags: [Tag] = []
    @State private var loading = true
    @State private var newTagName = ""
    @State private var tagToDelete: Tag?
    @State private var showDeleteAlert = false

    var body: some View {
        NavigationStack {
            Group {
                if loading {
                    ProgressView("Loading tags...")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List {
                        Section {
                            HStack {
                                TextField("New tag name...", text: $newTagName)
                                    .onSubmit { createTag() }

                                if !newTagName.trimmingCharacters(in: .whitespaces).isEmpty {
                                    Button {
                                        createTag()
                                    } label: {
                                        Image(systemName: "plus.circle.fill")
                                            .foregroundStyle(.brown)
                                    }
                                }
                            }
                        }

                        Section {
                            if tags.isEmpty {
                                Text("No tags yet. Create one above.")
                                    .foregroundStyle(.secondary)
                                    .font(.subheadline)
                            } else {
                                ForEach(tags) { tag in
                                    HStack {
                                        TagPill(tag: tag)
                                        Spacer()
                                        Text(tag.createdAt.prefix(10))
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                    .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                                        Button(role: .destructive) {
                                            tagToDelete = tag
                                            showDeleteAlert = true
                                        } label: {
                                            Label("Delete", systemImage: "trash")
                                        }
                                    }
                                }
                            }
                        } header: {
                            Text("Your Tags (\(tags.count))")
                        }
                    }
                }
            }
            .navigationTitle("Tags")
            .alert("Delete Tag?", isPresented: $showDeleteAlert, presenting: tagToDelete) { tag in
                Button("Delete", role: .destructive) {
                    Task { await deleteTag(tag) }
                }
                Button("Cancel", role: .cancel) {}
            } message: { tag in
                Text("Delete \"\(tag.name)\"? This will remove it from all papers.")
            }
            .refreshable {
                await loadTags()
            }
            .task {
                await loadTags()
            }
        }
    }

    private func loadTags() async {
        guard let userId = authService.userId else { return }
        loading = tags.isEmpty
        tags = (try? await SupabaseService.shared.getUserTags(userId: userId)) ?? []
        loading = false
    }

    private func createTag() {
        let name = newTagName.trimmingCharacters(in: .whitespaces)
        guard !name.isEmpty else { return }

        Task {
            guard let token = await authService.getAccessToken() else { return }
            do {
                let tag = try await SupabaseService.shared.createTag(name: name, accessToken: token)
                tags.append(tag)
                tags.sort { $0.name < $1.name }
                newTagName = ""
            } catch {
                print("Failed to create tag: \(error)")
            }
        }
    }

    private func deleteTag(_ tag: Tag) async {
        guard let token = await authService.getAccessToken() else { return }
        do {
            try await SupabaseService.shared.deleteTag(tagId: tag.id, accessToken: token)
            tags.removeAll { $0.id == tag.id }
        } catch {
            print("Failed to delete tag: \(error)")
        }
    }
}
