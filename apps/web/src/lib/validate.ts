/**
 * Input validation utilities — no external deps.
 * Returns structured 422 details via validateBody() helper.
 */

export function validateEmail(email: string): boolean {
  // RFC 5322-ish — rejects obvious junk, allows + and subdomains
  return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email.trim())
}

export function validateUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
}

export function validateHexColor(color: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color)
}

/** Strip HTML tags, trim whitespace, truncate to maxLen. */
export function sanitizeText(text: string, maxLen: number): string {
  return text
    .replace(/<[^>]*>/g, '')   // strip HTML
    .replace(/&[a-z]+;/gi, '') // strip HTML entities
    .trim()
    .slice(0, maxLen)
}

/** URL must be https:// and parseable. */
export function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function validateRange(n: number, min: number, max: number): boolean {
  return Number.isFinite(n) && n >= min && n <= max
}

// ---------------------------------------------------------------------------
// Structured validation helper — collect field errors, return 422 payload
// ---------------------------------------------------------------------------

type FieldErrors = Record<string, string>

export function validationError(details: FieldErrors) {
  return { error: 'Validation failed', details } as const
}
