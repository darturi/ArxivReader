import SwiftUI

struct PaperDetailView: View {
    @EnvironmentObject var authService: AuthService
    @Environment(\.dismiss) var dismiss

    @State var paper: UserPaper
    var onUpdate: ((UserPaper) -> Void)?
    var onDelete: (() -> Void)?

    init(paper: UserPaper, onUpdate: ((UserPaper) -> Void)? = nil, onDelete: (() -> Void)? = nil) {
        self._paper = State(initialValue: paper)
        self.onUpdate = onUpdate
        self.onDelete = onDelete
    }

    @State private var notes: String = ""
    @State private var saveStatus: SaveStatus = .idle
    @State private var allTags: [Tag] = []
    @State private var newTagName = ""
    @State private var showDeleteConfirm = false
    @State private var showMoveConfirm = false
    @State private var readDateString: String = ""
    @State private var showDatePicker = false

    private var saveTimer: Timer? = nil

    enum SaveStatus {
        case idle, saving, saved
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Title
                    Text(paper.title)
                        .font(.title2.bold())

                    // Authors (tappable)
                    FlowLayout(spacing: 4) {
                        ForEach(Array(paper.authors.enumerated()), id: \.offset) { idx, author in
                            NavigationLink(destination: AuthorView(authorName: author)) {
                                Text(author)
                                    .font(.subheadline)
                                    .foregroundStyle(.blue)
                            }
                            if idx < paper.authors.count - 1 {
                                Text(",")
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }

                    // Metadata row
                    HStack(spacing: 16) {
                        if !paper.publishedAt.isEmpty {
                            Label(String(paper.publishedAt.prefix(10)), systemImage: "calendar")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }

                        if !paper.arxivUrl.isEmpty, let url = URL(string: paper.arxivUrl) {
                            Link(destination: url) {
                                Label("ArXiv", systemImage: "link")
                                    .font(.caption)
                            }
                        }
                    }

                    // Abstract
                    DisclosureGroup("Abstract") {
                        Text(paper.abstract)
                            .font(.body)
                            .foregroundStyle(.secondary)
                            .padding(.top, 4)
                    }
                    .tint(.brown)

                    Divider()

                    // Tags section
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Tags")
                            .font(.headline)

                        // Current tags
                        if !paper.tags.isEmpty {
                            FlowLayout(spacing: 6) {
                                ForEach(paper.tags) { tag in
                                    TagPill(tag: tag) {
                                        Task { await removeTag(tag) }
                                    }
                                }
                            }
                        }

                        // Add existing tag
                        let availableTags = allTags.filter { tag in
                            !paper.tags.contains { $0.id == tag.id }
                        }
                        if !availableTags.isEmpty {
                            Menu {
                                ForEach(availableTags) { tag in
                                    Button(tag.name) {
                                        Task { await addTag(tag) }
                                    }
                                }
                            } label: {
                                Label("Add Tag", systemImage: "plus.circle")
                                    .font(.subheadline)
                            }
                        }

                        // Create new tag inline
                        HStack {
                            TextField("New tag...", text: $newTagName)
                                .textFieldStyle(.roundedBorder)
                                .font(.subheadline)

                            if !newTagName.trimmingCharacters(in: .whitespaces).isEmpty {
                                Button {
                                    Task { await createAndAddTag() }
                                } label: {
                                    Image(systemName: "plus.circle.fill")
                                        .foregroundStyle(.brown)
                                }
                            }
                        }
                    }

                    Divider()

                    // Read date (only for Read list)
                    if paper.list == .read {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Date Read")
                                .font(.headline)

                            HStack {
                                TextField("YYYY-MM-DD", text: $readDateString)
                                    .textFieldStyle(.roundedBorder)
                                    .font(.subheadline)
                                    .onChange(of: readDateString) { _, newValue in
                                        // Only save if it looks like a valid date or is empty
                                        if newValue.isEmpty || isValidDate(newValue) {
                                            Task { await saveReadDate(newValue.isEmpty ? nil : newValue) }
                                        }
                                    }

                                DatePicker("", selection: Binding(
                                    get: {
                                        dateFromString(readDateString) ?? Date()
                                    },
                                    set: { date in
                                        readDateString = formatDate(date)
                                    }
                                ), displayedComponents: .date)
                                .labelsHidden()

                                if !readDateString.isEmpty {
                                    Button {
                                        readDateString = ""
                                    } label: {
                                        Image(systemName: "xmark.circle")
                                            .foregroundStyle(.secondary)
                                    }
                                }
                            }
                        }

                        Divider()
                    }

                    // Notes
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("Notes")
                                .font(.headline)
                            Spacer()
                            switch saveStatus {
                            case .idle: EmptyView()
                            case .saving:
                                ProgressView()
                                    .scaleEffect(0.7)
                            case .saved:
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundStyle(.green)
                                    .font(.caption)
                            }
                        }

                        TextEditor(text: $notes)
                            .frame(minHeight: 120)
                            .font(.body)
                            .scrollContentBackground(.hidden)
                            .padding(8)
                            .background(Color(.systemGray6))
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                            .onChange(of: notes) { _, _ in
                                debounceSaveNotes()
                            }
                    }

                    Divider()

                    // Actions
                    VStack(spacing: 12) {
                        let otherList: ReadingList = paper.list == .read ? .toRead : .read
                        Button {
                            showMoveConfirm = true
                        } label: {
                            Label("Move to \(otherList.displayName)", systemImage: "arrow.right.circle")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.bordered)
                        .tint(.blue)

                        Button(role: .destructive) {
                            showDeleteConfirm = true
                        } label: {
                            Label("Remove from Library", systemImage: "trash")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.bordered)
                    }
                }
                .padding()
            }
            .navigationTitle("Paper Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
            .alert("Move Paper?", isPresented: $showMoveConfirm) {
                Button("Move", role: .none) { Task { await movePaper() } }
                Button("Cancel", role: .cancel) {}
            } message: {
                let otherList: ReadingList = paper.list == .read ? .toRead : .read
                Text("Move this paper to \(otherList.displayName)?")
            }
            .alert("Remove Paper?", isPresented: $showDeleteConfirm) {
                Button("Remove", role: .destructive) { Task { await deletePaper() } }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This will remove the paper from your library.")
            }
            .task {
                notes = paper.notes ?? ""
                readDateString = paper.readAt ?? ""
                await loadTags()
            }
        }
    }

    // MARK: - Tag operations

    private func loadTags() async {
        guard let userId = authService.userId else { return }
        allTags = (try? await SupabaseService.shared.getUserTags(userId: userId)) ?? []
    }

    private func addTag(_ tag: Tag) async {
        guard let token = await authService.getAccessToken() else { return }
        do {
            try await SupabaseService.shared.addTagToPaper(userPaperId: paper.id, tagId: tag.id, accessToken: token)
            paper.tags.append(tag)
            onUpdate?(paper)
        } catch {
            print("Failed to add tag: \(error)")
        }
    }

    private func removeTag(_ tag: Tag) async {
        guard let token = await authService.getAccessToken() else { return }
        do {
            try await SupabaseService.shared.removeTagFromPaper(userPaperId: paper.id, tagId: tag.id, accessToken: token)
            paper.tags.removeAll { $0.id == tag.id }
            onUpdate?(paper)
        } catch {
            print("Failed to remove tag: \(error)")
        }
    }

    private func createAndAddTag() async {
        guard let token = await authService.getAccessToken() else { return }
        let name = newTagName.trimmingCharacters(in: .whitespaces)
        guard !name.isEmpty else { return }

        do {
            let tag = try await SupabaseService.shared.createTag(name: name, accessToken: token)
            try await SupabaseService.shared.addTagToPaper(userPaperId: paper.id, tagId: tag.id, accessToken: token)
            paper.tags.append(tag)
            allTags.append(tag)
            newTagName = ""
            onUpdate?(paper)
        } catch {
            print("Failed to create tag: \(error)")
        }
    }

    // MARK: - Notes (debounced save)

    @State private var saveTask: Task<Void, Never>?

    private func debounceSaveNotes() {
        saveStatus = .saving
        saveTask?.cancel()
        saveTask = Task {
            try? await Task.sleep(for: .milliseconds(500))
            guard !Task.isCancelled else { return }
            await saveNotesToServer()
        }
    }

    private func saveNotesToServer() async {
        guard let token = await authService.getAccessToken() else { return }
        do {
            try await SupabaseService.shared.updateUserPaper(
                paperId: paper.id,
                updates: ["notes": notes],
                accessToken: token
            )
            paper.notes = notes
            saveStatus = .saved
            try? await Task.sleep(for: .seconds(2))
            if saveStatus == .saved { saveStatus = .idle }
        } catch {
            saveStatus = .idle
        }
    }

    // MARK: - Read date

    private func saveReadDate(_ date: String?) async {
        guard let token = await authService.getAccessToken() else { return }
        do {
            let updates: [String: Any] = date != nil
                ? ["read_at": date!]
                : ["read_at": NSNull()]
            try await SupabaseService.shared.updateUserPaper(
                paperId: paper.id,
                updates: updates,
                accessToken: token
            )
            paper.readAt = date
            onUpdate?(paper)
        } catch {
            print("Failed to save read date: \(error)")
        }
    }

    // MARK: - Move / Delete

    private func movePaper() async {
        guard let token = await authService.getAccessToken() else { return }
        let newList: ReadingList = paper.list == .read ? .toRead : .read
        do {
            try await SupabaseService.shared.updateUserPaper(
                paperId: paper.id,
                updates: ["list": newList.rawValue],
                accessToken: token
            )
            paper.list = newList
            onUpdate?(paper)
            dismiss()
        } catch {
            print("Failed to move paper: \(error)")
        }
    }

    private func deletePaper() async {
        guard let token = await authService.getAccessToken() else { return }
        do {
            try await SupabaseService.shared.deleteUserPaper(paperId: paper.id, accessToken: token)
            onDelete?()
            dismiss()
        } catch {
            print("Failed to delete paper: \(error)")
        }
    }

    // MARK: - Date helpers

    private func isValidDate(_ str: String) -> Bool {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.date(from: str) != nil
    }

    private func dateFromString(_ str: String) -> Date? {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.date(from: str)
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }
}

// MARK: - Flow Layout (for tags)

struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = arrange(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = arrange(proposal: proposal, subviews: subviews)
        for (index, position) in result.positions.enumerated() {
            subviews[index].place(
                at: CGPoint(x: bounds.minX + position.x, y: bounds.minY + position.y),
                proposal: .unspecified
            )
        }
    }

    private struct ArrangeResult {
        var size: CGSize
        var positions: [CGPoint]
    }

    private func arrange(proposal: ProposedViewSize, subviews: Subviews) -> ArrangeResult {
        let maxWidth = proposal.width ?? .infinity
        var positions: [CGPoint] = []
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > maxWidth && x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            positions.append(CGPoint(x: x, y: y))
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
        }

        return ArrangeResult(
            size: CGSize(width: maxWidth, height: y + rowHeight),
            positions: positions
        )
    }
}
