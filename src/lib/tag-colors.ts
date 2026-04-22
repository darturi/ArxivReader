// Deterministic tag colors — warm neutral palette that fits the stone scheme.
// Each tag name hashes to a consistent color pair (bg + text).

const TAG_PALETTE = [
  { bg: "#fef3c7", text: "#92400e" }, // amber
  { bg: "#dbeafe", text: "#1e40af" }, // blue
  { bg: "#dcfce7", text: "#166534" }, // green
  { bg: "#fce7f3", text: "#9d174d" }, // pink
  { bg: "#e0e7ff", text: "#3730a3" }, // indigo
  { bg: "#ffedd5", text: "#9a3412" }, // orange
  { bg: "#f3e8ff", text: "#6b21a8" }, // purple
  { bg: "#ccfbf1", text: "#115e59" }, // teal
  { bg: "#fef9c3", text: "#854d0e" }, // yellow
  { bg: "#ffe4e6", text: "#9f1239" }, // rose
  { bg: "#e0f2fe", text: "#075985" }, // sky
  { bg: "#d1fae5", text: "#065f46" }, // emerald
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

export function getTagColor(tagName: string): { bg: string; text: string } {
  const index = hashString(tagName) % TAG_PALETTE.length;
  return TAG_PALETTE[index];
}
