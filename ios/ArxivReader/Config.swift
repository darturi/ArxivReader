import Foundation

enum Config {
    static let supabaseURL = URL(string: "https://xkocvbdqgahpsbqpbjej.supabase.co")!
    static let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhrb2N2YmRxZ2FocHNicXBiamVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MTkxNzYsImV4cCI6MjA5MjM5NTE3Nn0.3KXMWj2CrLLto4Yn4SRU575x80cykARkcq7OItg0NIs"

    // The base URL for the Next.js API (used for search, which proxies ArXiv)
    // In production, this would be your deployed Vercel URL.
    // The iOS app calls Supabase directly for CRUD, but uses the API for search
    // to benefit from server-side rate limiting and caching.
    static let apiBaseURL = URL(string: "https://arxiv-reader-zeta.vercel.app")!
}
