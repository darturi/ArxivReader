import Foundation
import Supabase
import SwiftUI
import Combine
import AuthenticationServices

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

    @MainActor
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

    @MainActor
    func signInWithGoogle() async throws {
        // Use PKCE flow for mobile — Supabase returns a code we can exchange
        let url = try await supabase.auth.getOAuthSignInURL(
            provider: .google,
            redirectTo: URL(string: "arxivreader://auth/callback")
        )

        // Use ASWebAuthenticationSession for in-app OAuth browser
        let callbackURL: URL = try await withCheckedThrowingContinuation { continuation in
            let session = ASWebAuthenticationSession(
                url: url,
                callbackURLScheme: "arxivreader"
            ) { callbackURL, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                guard let callbackURL else {
                    continuation.resume(throwing: URLError(.badURL))
                    return
                }
                continuation.resume(returning: callbackURL)
            }

            session.presentationContextProvider = ASWebAuthContextProvider.shared
            session.prefersEphemeralWebBrowserSession = false
            session.start()
        }

        // Let the Supabase SDK handle the callback URL (extracts tokens/code automatically)
        let session = try await supabase.auth.session(from: callbackURL)
        setUser(from: session)
    }

    @MainActor
    func handleDeepLink(_ url: URL) async {
        // Fallback for external browser redirects
        do {
            let session = try await supabase.auth.session(from: url)
            setUser(from: session)
        } catch {
            print("Deep link auth error: \(error)")
        }
    }

    @MainActor
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

    @MainActor
    private func setUser(from session: Session) {
        isAuthenticated = true
        userId = session.user.id.uuidString
        userEmail = session.user.email

        if let avatarStr = session.user.userMetadata["avatar_url"]?.stringValue,
           let url = URL(string: avatarStr) {
            userAvatarURL = url
        }
    }
}

// Provides the window for ASWebAuthenticationSession to present from
class ASWebAuthContextProvider: NSObject, ASWebAuthenticationPresentationContextProviding {
    static let shared = ASWebAuthContextProvider()

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = windowScene.windows.first else {
            return ASPresentationAnchor()
        }
        return window
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
