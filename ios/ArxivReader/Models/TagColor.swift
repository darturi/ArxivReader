import SwiftUI

// Deterministic tag colors — matches the web app's warm neutral palette.
// Each tag name hashes to a consistent color pair (bg + text).

struct TagColorPair {
    let background: Color
    let foreground: Color
}

private let tagPalette: [(bg: String, text: String)] = [
    ("#fef3c7", "#92400e"), // amber
    ("#dbeafe", "#1e40af"), // blue
    ("#dcfce7", "#166534"), // green
    ("#fce7f3", "#9d174d"), // pink
    ("#e0e7ff", "#3730a3"), // indigo
    ("#ffedd5", "#9a3412"), // orange
    ("#f3e8ff", "#6b21a8"), // purple
    ("#ccfbf1", "#115e59"), // teal
    ("#fef9c3", "#854d0e"), // yellow
    ("#ffe4e6", "#9f1239"), // rose
    ("#e0f2fe", "#075985"), // sky
    ("#d1fae5", "#065f46"), // emerald
]

// Same hash function as the web app to ensure identical colors
private func hashString(_ str: String) -> Int {
    var hash: Int32 = 0
    for char in str.unicodeScalars {
        hash = (hash &<< 5) &- hash &+ Int32(char.value)
    }
    return Int(abs(hash))
}

func getTagColor(_ tagName: String) -> TagColorPair {
    let index = hashString(tagName) % tagPalette.count
    let pair = tagPalette[index]
    return TagColorPair(
        background: Color(hex: pair.bg),
        foreground: Color(hex: pair.text)
    )
}

// MARK: - Color hex extension

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r = Double((int >> 16) & 0xFF) / 255.0
        let g = Double((int >> 8) & 0xFF) / 255.0
        let b = Double(int & 0xFF) / 255.0
        self.init(red: r, green: g, blue: b)
    }
}
