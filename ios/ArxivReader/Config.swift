import Foundation

enum Config {
    // These values are loaded from Secrets.plist (not checked into git).
    // Copy Secrets.plist.example to Secrets.plist and fill in your values.

    private static let secrets: [String: Any] = {
        guard let url = Bundle.main.url(forResource: "Secrets", withExtension: "plist"),
              let data = try? Data(contentsOf: url),
              let dict = try? PropertyListSerialization.propertyList(from: data, format: nil) as? [String: Any]
        else {
            fatalError("Secrets.plist not found. Copy Secrets.plist.example and fill in your values.")
        }
        return dict
    }()

    static let supabaseURL = URL(string: secrets["SUPABASE_URL"] as! String)!
    static let supabaseAnonKey = secrets["SUPABASE_ANON_KEY"] as! String
    static let apiBaseURL = URL(string: secrets["API_BASE_URL"] as! String)!
}
