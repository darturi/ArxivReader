import Foundation
import Supabase
import AuthenticationServices

@MainActor
class AuthService: ObservableObject {
    @Published var isAuthenticated = false
    @Published var userId: String?
    @Published var userEmail: String?
    @Published var userAvatarURL: URL?
    @Published var isLoading = true

    private var supabase: SupabaseClient { SupabaseService.shared.client }

    init() {
        Task {
            await checkSession()
        }
    }

    func checkSession() async {
        do {
            let session = try await supabase.auth.session
            setUser(from: session)
        } catch {
            isAuthenticated = false
            userId = nil
        }
        isLoading = false
    }

    func signInWithGoogle() async throws {
        let url = try await supabase.auth.getOAuthSignInURL(
            provider: .google,
            redirectTo: URL(string: "arxivreader://auth/callback")
        )

        // Open in system browser for OAuth
        await MainActor.run {
            UIApplication.shared.open(url)
        }
    }

    func handleDeepLink(_ url: URL) async {
        // Extract the access_token and refresh_token from the URL fragment
        guard let fragment = url.fragment else { return }

        var params: [String: String] = [:]
        for pair in fragment.split(separator: "&") {
            let kv = pair.split(separator: "=", maxSplits: 1)
            if kv.count == 2 {
                params[String(kv[0])] = String(kv[1]).removingPercentEncoding ?? String(kv[1])
            }
        }

        guard let accessToken = params["access_token"],
              let refreshToken = params["refresh_token"] else {
            return
        }

        do {
            let session = try await supabase.auth.setSession(
                accessToken: accessToken,
                refreshToken: refreshToken
            )
            setUser(from: session)
        } catch {
            print("Auth error: \(error)")
        }
    }

    func signOut() async {
        try? await supabase.auth.signOut()
        isAuthenticated = false
        userId = nil
        userEmail = nil
        userAvatarURL = nil
    }

    func getAccessToken() async -> String? {
        try? await supabase.auth.session.accessToken
    }

    // MARK: - Private

    private func setUser(from session: Session) {
        isAuthenticated = true
        userId = session.user.id.uuidString
        userEmail = session.user.email

        // Get avatar from user metadata (Google provides this)
        if let avatarStr = session.user.userMetadata["avatar_url"]?.stringValue,
           let url = URL(string: avatarStr) {
            userAvatarURL = url
        }
    }
}

// Helper to extract string from AnyJSON
extension AnyJSON {
    var stringValue: String? {
        switch self {
        case .string(let s): return s
        default: return nil
        }
    }
}
