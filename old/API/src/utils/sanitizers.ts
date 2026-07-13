type SanitizeOptions = {
  /**
   * Maximum accepted length after trimming and control-character stripping.
   * Defaults to 255 which aligns with common VARCHAR columns.
   */
  maxLength?: number;
  /**
   * When true, returns an empty string instead of null if the trimmed value is empty.
   */
  allowEmpty?: boolean;
};

/**
 * Normalizes text inputs before persisting them.
 * - Accepts only string values; all other types resolve to null.
 * - Trims leading/trailing whitespace.
 * - Removes ASCII control characters to avoid hidden payloads.
 * - Enforces a max length guard.
 * - Collapses empty strings to null unless `allowEmpty` is true.
 */
export function sanitizeTextInput(value: unknown, options: SanitizeOptions = {}): string | null {
  const { maxLength = 255, allowEmpty = false } = options;

  if (value == null) {
    return null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  // Strip ASCII control chars except for tab/newline/carriage return.
  const withoutControlChars = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  const trimmed = withoutControlChars.trim();

  if (!allowEmpty && trimmed.length === 0) {
    return null;
  }

  if (trimmed.length > maxLength) {
    return trimmed.slice(0, maxLength);
  }

  return allowEmpty ? trimmed : trimmed || null;
}

/**
 * Helper for nullable fields where `null` is a valid value but empty strings should not be persisted.
 */
export function sanitizeOptionalTextInput(
  value: unknown,
  options: SanitizeOptions = {},
): string | null {
  if (value == null) {
    return null;
  }

  return sanitizeTextInput(value, options);
}
