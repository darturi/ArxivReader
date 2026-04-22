import SwiftUI

struct TagPill: View {
    let tag: Tag
    var small: Bool = false
    var onRemove: (() -> Void)?
    var onTap: (() -> Void)?

    var body: some View {
        let colors = getTagColor(tag.name)

        HStack(spacing: 4) {
            Text(tag.name)
                .font(small ? .caption2 : .caption)
                .fontWeight(.medium)

            if let onRemove {
                Button {
                    onRemove()
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: small ? 8 : 10, weight: .bold))
                }
            }
        }
        .padding(.horizontal, small ? 6 : 8)
        .padding(.vertical, small ? 2 : 4)
        .background(colors.background)
        .foregroundStyle(colors.foreground)
        .clipShape(Capsule())
        .onTapGesture {
            onTap?()
        }
    }
}
