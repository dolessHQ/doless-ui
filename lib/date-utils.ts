import { format } from "date-fns"

export function formatDateSafe(
  value: Date | null | undefined,
  pattern: string
): string | null {
  if (!value) return null

  try {
    return format(value, pattern)
  } catch (error) {
    console.warn("Failed to format date with pattern:", pattern, error)
    return value.toLocaleDateString()
  }
}
