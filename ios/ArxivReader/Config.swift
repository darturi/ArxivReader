import Foundation

enum Config {
    static let supabaseURL = URL(string: "https://YOUR_PROJECT_ID.supabase.co")!
    static let supabaseAnonKey = "YOUR_ANON_KEY_HERE"

    // The base URL for the Next.js API (used for search, which proxies ArXiv)
    // In production, this would be your deployed Vercel URL.
    // The iOS app calls Supabase directly for CRUD, but uses the API for search
    // to benefit from server-side rate limiting and caching.
    static let apiBaseURL = URL(string: "https://your-vercel-deployment.vercel.app")!
}
