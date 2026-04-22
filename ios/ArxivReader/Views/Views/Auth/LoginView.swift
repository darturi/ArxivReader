import SwiftUI

struct LoginView: View {
    @EnvironmentObject var authService: AuthService
    @State private var isSigningIn = false
    @State private var errorMessage: String?

    var body: some View {
        VStack(spacing: 32) {
            Spacer()

            // App icon / title
            VStack(spacing: 12) {
                Image(systemName: "book.pages")
                    .font(.system(size: 64))
                    .foregroundStyle(.brown)

                Text("ArXiv Reader")
                    .font(.largeTitle.bold())
                    .foregroundStyle(.primary)

                Text("Your research reading companion")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            // Sign in button
            VStack(spacing: 16) {
                Button {
                    Task {
                        isSigningIn = true
                        errorMessage = nil
                        do {
                            try await authService.signInWithGoogle()
                        } catch {
                            errorMessage = error.localizedDescription
                        }
                        isSigningIn = false
                    }
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: "globe")
                            .font(.title3)
                        Text("Sign in with Google")
                            .font(.headline)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(.blue)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .disabled(isSigningIn)

                if let error = errorMessage {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.red)
                }
            }
            .padding(.horizontal, 32)

            Spacer()
                .frame(height: 48)
        }
        .padding()
    }
}
